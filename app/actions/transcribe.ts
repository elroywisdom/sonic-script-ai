'use server';

import {
  transcribeMultipleWithGroq,
  transcribeWithGroq,
} from '@/lib/transcribe';

export async function transcribeAudio(
  formData: FormData
): Promise<{ rawTranscript: string } | { error: string; detail: string }> {
  try {
    const audio = formData.get('audio');
    const filename = (formData.get('filename') as string) || 'audio.webm';
    const chunkCount = Number(formData.get('chunkCount') || '1');

    if (!audio || !(audio instanceof Blob)) {
      return {
        error: 'Transcription failed',
        detail: 'No audio file provided',
      };
    }

    if (chunkCount > 1) {
      const chunks: Array<{ blob: Blob; filename: string }> = [];

      for (let i = 0; i < chunkCount; i++) {
        const chunk = formData.get(`audio_${i}`);
        const chunkFilename =
          (formData.get(`filename_${i}`) as string) || `audio-${i}.webm`;

        if (chunk instanceof Blob) {
          chunks.push({ blob: chunk, filename: chunkFilename });
        }
      }

      if (chunks.length === 0) {
        return {
          error: 'Transcription failed',
          detail: 'No audio chunks provided',
        };
      }

      const rawTranscript = await transcribeMultipleWithGroq(chunks);
      return { rawTranscript };
    }

    const rawTranscript = await transcribeWithGroq(audio, filename);
    return { rawTranscript };
  } catch (error) {
    console.error('Transcription action error:', error);
    const detail =
      error instanceof Error
        ? error.message
        : 'An unexpected error occurred during transcription';

    return { error: 'Transcription failed', detail };
  }
}
