import { extractAudioWebCodecs, isWebCodecsSupported } from './webcodecsExtractor';
import { encodeAudioOpus, encodeWav } from './compressAudio';

const TARGET_SAMPLE_RATE = 16000;
const GROQ_MAX_BYTES = 4 * 1024 * 1024; // 4MB limit to stay under Vercel's 4.5MB serverless payload limit
export const CHUNK_DURATION_SECONDS = 300; // 5-minute segments (approx 1.2MB in Opus / 9.6MB in WAV)

export interface ExtractedAudio {
  blob: Blob;
  filename: string;
  durationSeconds: number;
}

function mixToMono(buffer: AudioBuffer): Float32Array {
  const length = buffer.length;
  const mono = new Float32Array(length);

  if (buffer.numberOfChannels === 1) {
    return new Float32Array(buffer.getChannelData(0));
  }

  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      mono[i] += channelData[i] / buffer.numberOfChannels;
    }
  }

  return mono;
}

function resampleToMono16kHz(
  audioContext: AudioContext,
  buffer: AudioBuffer,
  onLog?: (msg: string) => void
): Promise<AudioBuffer> {
  onLog?.('Mixing channels to mono...');
  const monoData = mixToMono(buffer);
  onLog?.(`Creating OfflineAudioContext (duration = ${buffer.duration.toFixed(1)}s, sampleRate = ${TARGET_SAMPLE_RATE}Hz)...`);
  const monoBuffer = audioContext.createBuffer(
    1,
    monoData.length,
    buffer.sampleRate
  );
  monoBuffer.getChannelData(0).set(monoData);

  const offlineContext = new OfflineAudioContext(
    1,
    Math.ceil(buffer.duration * TARGET_SAMPLE_RATE),
    TARGET_SAMPLE_RATE
  );

  const source = offlineContext.createBufferSource();
  source.buffer = monoBuffer;
  source.connect(offlineContext.destination);
  source.start(0);

  return offlineContext.startRendering();
}

function sliceAudioBuffer(
  audioContext: AudioContext,
  buffer: AudioBuffer,
  startSecond: number,
  durationSeconds: number
): AudioBuffer {
  const startFrame = Math.floor(startSecond * buffer.sampleRate);
  const frameCount = Math.min(
    Math.ceil(durationSeconds * buffer.sampleRate),
    buffer.length - startFrame
  );

  const slice = audioContext.createBuffer(1, frameCount, buffer.sampleRate);
  slice
    .getChannelData(0)
    .set(buffer.getChannelData(0).subarray(startFrame, startFrame + frameCount));
  return slice;
}

async function extractAudioFromVideoElement(
  videoFile: File,
  onLog?: (msg: string) => void
): Promise<AudioBuffer> {
  onLog?.('Creating media stream from video element fallback...');
  const videoUrl = URL.createObjectURL(videoFile);
  const video = document.createElement('video');
  video.src = videoUrl;
  video.preload = 'auto';
  video.crossOrigin = 'anonymous';
  video.muted = false;
  video.playsInline = true;

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error('Failed to load video element metadata'));
  });

  const duration = video.duration || 0;
  onLog?.(`Video element loaded. Duration: ${duration.toFixed(1)}s (${(duration / 60).toFixed(1)} minutes)`);

  const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  const source = audioContext.createMediaElementSource(video);

  const bufferSize = 4096;
  const scriptProcessor = audioContext.createScriptProcessor(bufferSize, 2, 1);
  const capturedChunks: Float32Array[] = [];

  scriptProcessor.onaudioprocess = (e) => {
    const inputBuffer = e.inputBuffer;
    const channel0 = inputBuffer.getChannelData(0);
    const chunk = new Float32Array(channel0.length);
    chunk.set(channel0);
    capturedChunks.push(chunk);
  };

  const silentGain = audioContext.createGain();
  silentGain.gain.value = 0;

  source.connect(scriptProcessor);
  scriptProcessor.connect(silentGain);
  silentGain.connect(audioContext.destination);

  const PLAYBACK_RATE = 8.0;
  video.playbackRate = PLAYBACK_RATE;
  (video as HTMLVideoElement & { preservesPitch?: boolean }).preservesPitch = false;

  onLog?.(`Streaming audio from video element at ${PLAYBACK_RATE}x speed...`);

  await new Promise<void>((resolve, reject) => {
    let lastLoggedPct = -1;
    const interval = setInterval(() => {
      if (video.duration > 0) {
        const pct = Math.floor((video.currentTime / video.duration) * 100);
        if (pct >= lastLoggedPct + 2) {
          lastLoggedPct = pct;
          onLog?.(`Extracting audio stream (${PLAYBACK_RATE}x speed): ${pct}% complete (${video.currentTime.toFixed(1)}s / ${video.duration.toFixed(1)}s)...`);
        }
      }
      if (video.ended || video.currentTime >= video.duration) {
        clearInterval(interval);
        resolve();
      }
    }, 250);

    video.onended = () => {
      clearInterval(interval);
      resolve();
    };

    video.onerror = (err) => {
      clearInterval(interval);
      reject(new Error(`Video playback error during extraction: ${err}`));
    };

    video.play().catch(reject);
  });

  onLog?.('Audio stream capture complete. Assembling AudioBuffer...');
  video.pause();
  source.disconnect();
  scriptProcessor.disconnect();
  silentGain.disconnect();
  URL.revokeObjectURL(videoUrl);

  const totalLength = capturedChunks.reduce((sum, c) => sum + c.length, 0);
  const effectiveSampleRate = audioContext.sampleRate / PLAYBACK_RATE;
  const resultBuffer = audioContext.createBuffer(1, Math.max(1, totalLength), effectiveSampleRate);
  const channelData = resultBuffer.getChannelData(0);

  let offset = 0;
  for (const chunk of capturedChunks) {
    channelData.set(chunk, offset);
    offset += chunk.length;
  }

  await audioContext.close();
  return resultBuffer;
}

async function getDecodedAudioBuffer(
  videoFile: File,
  audioContext: AudioContext,
  onLog?: (msg: string) => void
): Promise<AudioBuffer> {
  try {
    onLog?.('Loading video file buffer for decodeAudioData...');
    const arrayBuffer = await videoFile.arrayBuffer();
    onLog?.('Decoding audio data with Web Audio API...');
    const decoded = await audioContext.decodeAudioData(arrayBuffer);
    onLog?.(`Audio decoded successfully. Duration: ${decoded.duration.toFixed(1)}s, channels: ${decoded.numberOfChannels}, sample rate: ${decoded.sampleRate}Hz`);
    return decoded;
  } catch (err) {
    onLog?.(`Web Audio decodeAudioData failed (${err instanceof Error ? err.message : String(err)}).`);

    // Check if WebCodecs hardware accelerated demuxer is available
    if (isWebCodecsSupported()) {
      try {
        onLog?.('Switching to WebCodecs API (hardware-accelerated demuxer + AudioDecoder)...');
        const pcmFloat32 = await extractAudioWebCodecs(videoFile, onLog);
        const durationSecs = pcmFloat32.length / TARGET_SAMPLE_RATE;

        const buffer = audioContext.createBuffer(1, pcmFloat32.length, TARGET_SAMPLE_RATE);
        buffer.getChannelData(0).set(pcmFloat32);
        onLog?.(`[WebCodecs] Created AudioBuffer directly (${durationSecs.toFixed(1)}s, 16kHz mono).`);
        return buffer;
      } catch (wcErr) {
        onLog?.(`[WebCodecs] Extraction failed (${wcErr instanceof Error ? wcErr.message : String(wcErr)}). Falling back to HTML5 Video stream playback...`);
      }
    } else {
      onLog?.('WebCodecs not available in browser. Falling back to HTML5 Video stream playback...');
    }

    return await extractAudioFromVideoElement(videoFile, onLog);
  }
}

export async function extractAudioChunks(
  videoFile: File,
  onLog?: (msg: string) => void
): Promise<ExtractedAudio[]> {
  console.time('extractAudio');
  onLog?.(`Loading video file: ${videoFile.name} (${(videoFile.size / (1024 * 1024)).toFixed(2)} MB)`);
  onLog?.('Initializing AudioContext...');
  const audioContext = new AudioContext();

  try {
    const decodedBuffer = await getDecodedAudioBuffer(videoFile, audioContext, onLog);
    
    onLog?.('Resampling audio to 16kHz mono...');
    const resampledBuffer = await resampleToMono16kHz(audioContext, decodedBuffer, onLog);
    onLog?.('Resampling complete.');
    
    onLog?.('Checking encoded audio size...');
    const encoded = encodeWav(resampledBuffer);

    if (encoded.blob.size <= GROQ_MAX_BYTES) {
      onLog?.(`Audio size (${(encoded.blob.size / (1024 * 1024)).toFixed(2)} MB) is below 4MB limit. No chunking needed.`);
      console.timeEnd('extractAudio');
      return [{ ...encoded, durationSeconds: resampledBuffer.duration }];
    }

    const chunkCount = Math.ceil(resampledBuffer.duration / CHUNK_DURATION_SECONDS);
    onLog?.(`Audio size (${(encoded.blob.size / (1024 * 1024)).toFixed(2)} MB) exceeds 4MB limit. Chunking into ${chunkCount} parts (~${CHUNK_DURATION_SECONDS / 60}m each)...`);
    
    const chunks: ExtractedAudio[] = [];
    const totalDuration = resampledBuffer.duration;
    let start = 0;

    while (start < totalDuration) {
      const idx = chunks.length + 1;
      onLog?.(`Slicing chunk ${idx}/${chunkCount} starting at ${start.toFixed(1)}s...`);
      const slice = sliceAudioBuffer(
        audioContext,
        resampledBuffer,
        start,
        CHUNK_DURATION_SECONDS
      );
      
      onLog?.(`Encoding chunk ${idx}/${chunkCount} with Opus compression...`);
      const sliceEncoded = await encodeAudioOpus(slice, onLog);
      onLog?.(`Encoded chunk ${idx}/${chunkCount}: size = ${(sliceEncoded.blob.size / (1024 * 1024)).toFixed(2)} MB`);
      chunks.push({
        ...sliceEncoded,
        durationSeconds: slice.duration,
      });
      start += CHUNK_DURATION_SECONDS;
    }

    onLog?.(`All chunks extracted and encoded. Total chunks: ${chunks.length}`);
    console.timeEnd('extractAudio');
    return chunks;
  } finally {
    await audioContext.close();
  }
}
