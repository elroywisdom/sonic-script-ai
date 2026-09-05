import { createFile } from 'mp4box';

const TARGET_SAMPLE_RATE = 16000;

export function isWebCodecsSupported(): boolean {
  return typeof window !== 'undefined' && typeof (window as unknown as { AudioDecoder?: unknown }).AudioDecoder !== 'undefined';
}

/**
 * Extracts raw 16kHz mono PCM Float32Array audio from video/audio files (MP4/MOV/M4A)
 * using MP4Box demuxing and native browser AudioDecoder (WebCodecs API).
 * Runs at compute hardware speed (decodes 2 hours of audio in <30-60s).
 */
export async function extractAudioWebCodecs(
  file: File,
  onLog?: (msg: string) => void
): Promise<Float32Array> {
  onLog?.('[WebCodecs] Initializing hardware-accelerated audio extraction...');

  return new Promise((resolve, reject) => {
    const mp4boxfile = createFile();
    let audioTrack: {
      id: number;
      codec: string;
      timescale: number;
      audio: { sample_rate: number; channel_count: number };
    } | null = null;

    let audioDecoder: InstanceType<typeof AudioDecoder> | null = null;
    const pcmChunks: Float32Array[] = [];
    let totalPcmLength = 0;
    let decodedSamplesCount = 0;
    let totalExpectedSamples = 0;

    // Standard WebCodecs audio decoder setup
    const initDecoder = (codecString: string, sampleRate: number, numberOfChannels: number) => {
      onLog?.(`[WebCodecs] Initializing AudioDecoder (codec: ${codecString}, sampleRate: ${sampleRate}Hz, channels: ${numberOfChannels})...`);

      audioDecoder = new (window as unknown as { AudioDecoder: typeof AudioDecoder }).AudioDecoder({
        output: (audioData: AudioData) => {
          const numChannels = audioData.numberOfChannels;
          const numFrames = audioData.numberOfFrames;

          // Extract mono float32 channel data
          const channelBuffer = new Float32Array(numFrames);
          if (numChannels === 1) {
            audioData.copyTo(channelBuffer, { planeIndex: 0 });
          } else {
            // Mix down multi-channel to mono
            const tempBuffer = new Float32Array(numFrames);
            for (let c = 0; c < numChannels; c++) {
              audioData.copyTo(tempBuffer, { planeIndex: c });
              for (let i = 0; i < numFrames; i++) {
                channelBuffer[i] += tempBuffer[i] / numChannels;
              }
            }
          }

          // Resample to 16kHz mono if needed
          const srcRate = audioData.sampleRate;
          if (srcRate === TARGET_SAMPLE_RATE) {
            pcmChunks.push(channelBuffer);
            totalPcmLength += channelBuffer.length;
          } else {
            const resampleRatio = TARGET_SAMPLE_RATE / srcRate;
            const targetLength = Math.round(numFrames * resampleRatio);
            const resampled = new Float32Array(targetLength);
            for (let i = 0; i < targetLength; i++) {
              const srcIdx = i / resampleRatio;
              const idx0 = Math.floor(srcIdx);
              const idx1 = Math.min(idx0 + 1, numFrames - 1);
              const frac = srcIdx - idx0;
              resampled[i] = channelBuffer[idx0] * (1 - frac) + channelBuffer[idx1] * frac;
            }
            pcmChunks.push(resampled);
            totalPcmLength += resampled.length;
          }

          decodedSamplesCount++;
          audioData.close();
        },
        error: (err: unknown) => {
          onLog?.(`[WebCodecs] AudioDecoder error: ${err instanceof Error ? err.message : String(err)}`);
          reject(new Error(`WebCodecs AudioDecoder error: ${err}`));
        },
      });

      // Handle mp4a.40.2 (AAC-LC) or other codec strings for AudioDecoder
      let normalizedCodec = codecString;
      if (codecString.startsWith('mp4a')) {
        normalizedCodec = 'mp4a.40.2';
      }

      audioDecoder.configure({
        codec: normalizedCodec,
        sampleRate,
        numberOfChannels,
      });
    };

    mp4boxfile.onReady = (info) => {
      if (!info.audioTracks || info.audioTracks.length === 0) {
        reject(new Error('No audio tracks found in file container.'));
        return;
      }

      const track = info.audioTracks[0];
      audioTrack = {
        id: track.id,
        codec: track.codec,
        timescale: track.timescale,
        audio: track.audio,
      };

      onLog?.(`[WebCodecs] Found audio track #${track.id} (${track.codec}, ${(info.duration / info.timescale).toFixed(1)}s)...`);

      initDecoder(track.codec, track.audio.sample_rate, track.audio.channel_count);

      mp4boxfile.setExtractionOptions(track.id, null, { nbSamples: 1000 });
      mp4boxfile.start();
    };

    mp4boxfile.onSamples = (id, user, samples) => {
      if (!audioDecoder || !audioTrack) return;

      totalExpectedSamples += samples.length;

      for (const sample of samples) {
        const type: EncodedAudioChunkType = sample.is_sync ? 'key' : 'delta';
        const timestamp = (sample.cts * 1_000_000) / sample.timescale;
        const duration = (sample.duration * 1_000_000) / sample.timescale;

        const chunk = new (window as unknown as { EncodedAudioChunk: typeof EncodedAudioChunk }).EncodedAudioChunk({
          type,
          timestamp,
          duration,
          data: sample.data.buffer as ArrayBuffer,
        });

        audioDecoder.decode(chunk);
      }
    };

    mp4boxfile.onError = (e) => {
      reject(new Error(`MP4Box demuxer error: ${e}`));
    };

    // Read file in 10MB chunks streaming into MP4Box
    const CHUNK_SIZE = 10 * 1024 * 1024;
    let offset = 0;

    const readNextChunk = () => {
      if (offset >= file.size) {
        mp4boxfile.flush();
        if (audioDecoder) {
          audioDecoder.flush().then(() => {
            onLog?.(`[WebCodecs] Extraction complete. Assembled ${(totalPcmLength / TARGET_SAMPLE_RATE).toFixed(1)}s of 16kHz mono audio.`);

            // Merge PCM chunks into a single Float32Array
            const merged = new Float32Array(totalPcmLength);
            let pcmOffset = 0;
            for (const chunk of pcmChunks) {
              merged.set(chunk, pcmOffset);
              pcmOffset += chunk.length;
            }
            resolve(merged);
          }).catch(reject);
        } else {
          reject(new Error('Demuxer finished but AudioDecoder was not initialized.'));
        }
        return;
      }

      const slice = file.slice(offset, offset + CHUNK_SIZE);
      const reader = new FileReader();

      reader.onload = (e) => {
        if (!e.target?.result) return;
        const buffer = e.target.result as ArrayBuffer;
        (buffer as ArrayBuffer & { fileStart?: number }).fileStart = offset;
        mp4boxfile.appendBuffer(buffer as ArrayBuffer & { fileStart?: number });
        offset += CHUNK_SIZE;

        const pct = Math.min(100, Math.floor((offset / file.size) * 100));
        onLog?.(`[WebCodecs] Demuxing audio stream: ${pct}% complete...`);

        setTimeout(readNextChunk, 0);
      };

      reader.onerror = () => reject(new Error('Failed reading file slice.'));
      reader.readAsArrayBuffer(slice);
    };

    readNextChunk();
  });
}
