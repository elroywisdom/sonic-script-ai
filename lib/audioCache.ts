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

export async function saveCachedChunks(
  fileKey: string,
  filename: string,
  fileSize: number,
  durationSeconds: number,
  chunks: CachedChunk[]
): Promise<void> {
  try {
    const db = await openDB();
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

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to save to IndexedDB cache:', err);
  }
}

export async function getCachedRecord(fileKey: string): Promise<CachedRecord | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(fileKey);
      req.onsuccess = () => resolve((req.result as CachedRecord) || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to read from IndexedDB cache:', err);
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

    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to update chunk transcript in IndexedDB:', err);
  }
}

export async function removeCachedRecord(fileKey: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(fileKey);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to remove record from IndexedDB:', err);
  }
}
