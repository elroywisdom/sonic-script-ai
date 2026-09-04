import { NextResponse } from 'next/server';
import { transcribeWithGroq } from '@/lib/transcribe';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audio = formData.get('audio');
    const filename = (formData.get('filename') as string) || 'audio.wav';
    const offset = Number(formData.get('offset') || '0');

    if (!audio || !(audio instanceof Blob)) {
      return NextResponse.json(
        { error: 'Bad Request', detail: 'No audio file provided' },
        { status: 400 }
      );
    }

    const rawTranscript = await transcribeWithGroq(audio, filename, offset);
    return NextResponse.json({ rawTranscript });
  } catch (error) {
    console.error('Transcription API error:', error);
    const detail =
      error instanceof Error
        ? error.message
        : 'An unexpected error occurred during transcription';

    return NextResponse.json(
      { error: 'Transcription Failed', detail },
      { status: 500 }
    );
  }
}
