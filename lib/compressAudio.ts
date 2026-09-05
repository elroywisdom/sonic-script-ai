export interface EncodedAudioResult {
  blob: Blob;
  filename: string;
}

/**
 * Checks supported audio MIME types for compression
 */
export function getSupportedOpusMimeType(): string | null {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') return null;

  const candidateTypes = [
    'audio/webm;codecs=opus',
    'audio/ogg;codecs=opus',
    'audio/webm',
    'audio/mp4',
  ];

  for (const type of candidateTypes) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  return null;
}

/**
 * Encodes AudioBuffer into Opus WebM/Ogg compressed format at 32kbps.
 * Shrinks 10 minutes of audio to ~2.4MB (10x smaller than raw PCM WAV).
 */
export async function encodeAudioOpus(
  audioBuffer: AudioBuffer,
  onLog?: (msg: string) => void
): Promise<EncodedAudioResult> {
  const mimeType = getSupportedOpusMimeType();
  if (!mimeType) {
    onLog?.('[Compress] MediaRecorder Opus not supported, using WAV encoding...');
    return encodeWav(audioBuffer);
  }

  const ext = mimeType.includes('ogg') ? 'ogg' : 'webm';
  onLog?.(`[Compress] Encoding audio with Opus (${mimeType}, target 32kbps)...`);

  return new Promise((resolve, reject) => {
    const ctx = new AudioContext({ sampleRate: audioBuffer.sampleRate });
    const dest = ctx.createMediaStreamDestination();
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(dest);

    const recorder = new MediaRecorder(dest.stream, {
      mimeType,
      audioBitsPerSecond: 32000, // 32 kbps speech quality
    });

    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      ctx.close().catch(() => {});
      const blob = new Blob(chunks, { type: mimeType });
      onLog?.(`[Compress] Compressed audio blob created: ${(blob.size / (1024 * 1024)).toFixed(2)} MB (${ext.toUpperCase()})`);
      resolve({
        blob,
        filename: `audio.${ext}`,
      });
    };

    recorder.onerror = (err) => {
      ctx.close().catch(() => {});
      onLog?.(`[Compress] Opus recording error: ${err}. Falling back to WAV.`);
      resolve(encodeWav(audioBuffer));
    };

    // Accelerated rendering: play 8x faster to record quickly
    const FAST_RATE = 8.0;
    source.playbackRate.value = FAST_RATE;

    recorder.start(100);
    source.start(0);

    const durationMs = (audioBuffer.duration / FAST_RATE) * 1000;
    setTimeout(() => {
      if (recorder.state !== 'inactive') {
        recorder.stop();
      }
    }, durationMs + 200);
  });
}

/**
 * Fallback raw WAV encoder (16kHz 16-bit Mono)
 */
export function encodeWav(audioBuffer: AudioBuffer): EncodedAudioResult {
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

  return {
    blob: new Blob([buffer], { type: 'audio/wav' }),
    filename: 'audio.wav',
  };
}
