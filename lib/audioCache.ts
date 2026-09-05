export interface CachedChunk {
  blob: Blob;
  filename: string;
  durationSeconds: number;
}

export interface CachedRecord {
  fileKey: string;
  filename: string;
  fileSize: number;
  durationSeconds: number;
  extractedAt: number;
  chunks: CachedChunk[];
  transcripts: Record<number, string>;
}

const DB_NAME = 'SonicScriptCacheDB';
const DB_VERSION = 1;
const STORE_NAME = 'extractions';

// Check OPFS support
export function isOpfsSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    !!navigator.storage &&
    typeof navigator.storage.getDirectory === 'function'
  );
}

// -------------------------------------------------------------------------
// OPFS Implementation
// -------------------------------------------------------------------------

async function getOpfsRoot(): Promise<FileSystemDirectoryHandle | null> {
  try {
    if (!isOpfsSupported()) return null;
    const root = await navigator.storage.getDirectory();
    return await root.getDirectoryHandle('sonicscript_cache', { create: true });
  } catch (err) {
    console.warn('OPFS getDirectoryHandle failed, falling back to IDB:', err);
    return null;
  }
}

function sanitizeKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9_-]/g, '_');
}

async function saveToOpfs(record: CachedRecord): Promise<boolean> {
  const opfsDir = await getOpfsRoot();
  if (!opfsDir) return false;

  try {
    const safeKey = sanitizeKey(record.fileKey);
    const itemDir = await opfsDir.getDirectoryHandle(safeKey, { create: true });

    // Save metadata + transcripts
    const metaFile = await itemDir.getFileHandle('meta.json', { create: true });
    const metaWritable = await metaFile.createWritable();
    const metaData = {
      fileKey: record.fileKey,
      filename: record.filename,
      fileSize: record.fileSize,
      durationSeconds: record.durationSeconds,
      extractedAt: record.extractedAt,
      transcripts: record.transcripts,
      chunkCount: record.chunks.length,
      chunkMetas: record.chunks.map((c) => ({
        filename: c.filename,
        durationSeconds: c.durationSeconds,
        mimeType: c.blob.type,
      })),
    };
    await metaWritable.write(JSON.stringify(metaData));
    await metaWritable.close();

    // Save chunk binary blobs
    for (let i = 0; i < record.chunks.length; i++) {
      const chunk = record.chunks[i];
      const chunkFile = await itemDir.getFileHandle(`chunk_${i}.bin`, { create: true });
      const chunkWritable = await chunkFile.createWritable();
      await chunkWritable.write(chunk.blob);
      await chunkWritable.close();
    }

    return true;
  } catch (err) {
    console.warn('Failed saving to OPFS:', err);
    return false;
  }
}

async function getFromOpfs(fileKey: string): Promise<CachedRecord | null> {
  const opfsDir = await getOpfsRoot();
  if (!opfsDir) return null;

  try {
    const safeKey = sanitizeKey(fileKey);
    const itemDir = await opfsDir.getDirectoryHandle(safeKey, { create: false });

    const metaFile = await itemDir.getFileHandle('meta.json');
    const file = await metaFile.getFile();
    const text = await file.text();
    const meta = JSON.parse(text);

    const chunks: CachedChunk[] = [];
    for (let i = 0; i < meta.chunkCount; i++) {
      const chunkMeta = meta.chunkMetas[i];
      const chunkFile = await itemDir.getFileHandle(`chunk_${i}.bin`);
      const blob = await chunkFile.getFile();
      const chunkBlob = new Blob([blob], { type: chunkMeta.mimeType || 'audio/wav' });
      chunks.push({
        blob: chunkBlob,
        filename: chunkMeta.filename,
        durationSeconds: chunkMeta.durationSeconds,
      });
    }

    return {
      fileKey: meta.fileKey,
      filename: meta.filename,
      fileSize: meta.fileSize,
      durationSeconds: meta.durationSeconds,
      extractedAt: meta.extractedAt,
      chunks,
      transcripts: meta.transcripts || {},
    };
  } catch (err) {
    // File or directory not found in OPFS
    return null;
  }
}

// -------------------------------------------------------------------------
// IndexedDB Implementation (Fallback)
// -------------------------------------------------------------------------

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'fileKey' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveToIDB(record: CachedRecord): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function getFromIDB(fileKey: string): Promise<CachedRecord | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(fileKey);
    req.onsuccess = () => resolve((req.result as CachedRecord) || null);
    req.onerror = () => reject(req.error);
  });
}

// -------------------------------------------------------------------------
// Unified Cache API (OPFS with IDB Fallback)
// -------------------------------------------------------------------------

export async function saveCachedChunks(
  fileKey: string,
  filename: string,
  fileSize: number,
  durationSeconds: number,
  chunks: CachedChunk[]
): Promise<void> {
  try {
    const existing = await getCachedRecord(fileKey);
    const record: CachedRecord = {
      fileKey,
      filename,
      fileSize,
      durationSeconds,
      extractedAt: Date.now(),
      chunks,
      transcripts: existing?.transcripts || {},
    };

    const startTime = performance.now();
    const opfsSaved = await saveToOpfs(record);

    if (opfsSaved) {
      const elapsed = performance.now() - startTime;
      console.log(`[AudioCache] Saved record to OPFS in ${elapsed.toFixed(1)}ms`);
    } else {
      const startTimeIdb = performance.now();
      await saveToIDB(record);
      const elapsed = performance.now() - startTimeIdb;
      console.log(`[AudioCache] Saved record to IndexedDB fallback in ${elapsed.toFixed(1)}ms`);
    }
  } catch (err) {
    console.warn('Failed to save audio cache record:', err);
  }
}

export async function getCachedRecord(fileKey: string): Promise<CachedRecord | null> {
  try {
    const opfsRecord = await getFromOpfs(fileKey);
    if (opfsRecord) return opfsRecord;

    return await getFromIDB(fileKey);
  } catch (err) {
    console.warn('Failed reading from audio cache:', err);
    return null;
  }
}

export async function saveChunkTranscript(
  fileKey: string,
  chunkIndex: number,
  transcriptText: string
): Promise<void> {
  try {
    const record = await getCachedRecord(fileKey);
    if (!record) return;

    record.transcripts[chunkIndex] = transcriptText;

    const opfsSaved = await saveToOpfs(record);
    if (!opfsSaved) {
      await saveToIDB(record);
    }
  } catch (err) {
    console.warn('Failed to update chunk transcript in cache:', err);
  }
}

export async function removeCachedRecord(fileKey: string): Promise<void> {
  try {
    const opfsDir = await getOpfsRoot();
    if (opfsDir) {
      const safeKey = sanitizeKey(fileKey);
      await opfsDir.removeEntry(safeKey, { recursive: true }).catch(() => {});
    }
    const db = await openDB().catch(() => null);
    if (db) {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(fileKey);
    }
  } catch (err) {
    console.warn('Failed removing record from audio cache:', err);
  }
}
