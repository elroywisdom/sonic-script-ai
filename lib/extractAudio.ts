const TARGET_SAMPLE_RATE = 16000;
const GROQ_MAX_BYTES = 4 * 1024 * 1024; // 4MB limit to stay under Vercel's 4.5MB serverless payload limit
const CHUNK_DURATION_SECONDS = 120; // 2-minute segments (approx 3.66MB at 16kHz mono 16-bit PCM)

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

function encodeWav(audioBuffer: AudioBuffer): Blob {
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const numSamples = channelData.length;
  const bytesPerSample = 2;
  const blockAlign = bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const sample = Math.max(-1, Math.min(1, channelData[i]));
    const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    view.setInt16(offset, intSample, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

async function encodeAudio(
  audioBuffer: AudioBuffer,
  onLog?: (msg: string) => void
): Promise<{ blob: Blob; filename: string }> {
  onLog?.('Encoding audio directly to WAV (16kHz, 16-bit mono PCM)...');
  const blob = encodeWav(audioBuffer);
  return {
    blob,
    filename: 'audio.wav',
  };
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

export async function extractAudio(
  videoFile: File,
  onLog?: (msg: string) => void
): Promise<ExtractedAudio> {
  onLog?.(`Loading video file: ${videoFile.name} (${(videoFile.size / (1024 * 1024)).toFixed(2)} MB)`);
  const arrayBuffer = await videoFile.arrayBuffer();
  onLog?.('Initializing AudioContext...');
  const audioContext = new AudioContext();

  try {
    onLog?.('Decoding audio data with Web Audio API...');
    const decodedBuffer = await audioContext.decodeAudioData(arrayBuffer);
    onLog?.(`Audio decoded successfully. Duration: ${decodedBuffer.duration.toFixed(1)}s, channels: ${decodedBuffer.numberOfChannels}, sample rate: ${decodedBuffer.sampleRate}Hz`);
    
    onLog?.('Resampling audio to 16kHz mono...');
    const resampledBuffer = await resampleToMono16kHz(audioContext, decodedBuffer, onLog);
    onLog?.('Resampling complete.');
    
    const encoded = await encodeAudio(resampledBuffer, onLog);
    onLog?.(`Audio extraction finished. Format: ${encoded.filename}, Size: ${(encoded.blob.size / (1024 * 1024)).toFixed(2)} MB`);

    return {
      ...encoded,
      durationSeconds: resampledBuffer.duration,
    };
  } finally {
    await audioContext.close();
  }
}

export async function extractAudioChunks(
  videoFile: File,
  onLog?: (msg: string) => void
): Promise<ExtractedAudio[]> {
  onLog?.(`Loading video file: ${videoFile.name} (${(videoFile.size / (1024 * 1024)).toFixed(2)} MB)`);
  const arrayBuffer = await videoFile.arrayBuffer();
  onLog?.('Initializing AudioContext...');
  const audioContext = new AudioContext();

  try {
    onLog?.('Decoding audio data with Web Audio API...');
    const decodedBuffer = await audioContext.decodeAudioData(arrayBuffer);
    onLog?.(`Audio decoded successfully. Duration: ${decodedBuffer.duration.toFixed(1)}s, channels: ${decodedBuffer.numberOfChannels}, original sample rate: ${decodedBuffer.sampleRate}Hz`);
    
    onLog?.('Resampling audio to 16kHz mono...');
    const resampledBuffer = await resampleToMono16kHz(audioContext, decodedBuffer, onLog);
    onLog?.('Resampling complete.');
    
    onLog?.('Checking encoded size...');
    const encoded = await encodeAudio(resampledBuffer, onLog);

    if (encoded.blob.size <= GROQ_MAX_BYTES) {
      onLog?.(`Audio size (${(encoded.blob.size / (1024 * 1024)).toFixed(2)} MB) is below 4MB limit. No chunking needed.`);
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
      
      onLog?.(`Encoding chunk ${idx}/${chunkCount}...`);
      const sliceEncoded = await encodeAudio(slice, onLog);
      onLog?.(`Encoded chunk ${idx}/${chunkCount}: size = ${(sliceEncoded.blob.size / (1024 * 1024)).toFixed(2)} MB`);
      chunks.push({
        ...sliceEncoded,
        durationSeconds: slice.duration,
      });
      start += CHUNK_DURATION_SECONDS;
    }

    onLog?.(`All chunks extracted and encoded. Total chunks: ${chunks.length}`);
    return chunks;
  } finally {
    await audioContext.close();
  }
}
