import { NextRequest, NextResponse } from 'next/server';
import { transcribeWithGroq } from '@/lib/transcribe';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audio = formData.get('audio');
    const filename = (formData.get('filename') as string) || 'audio.webm';

    if (!audio || !(audio instanceof Blob)) {
      return NextResponse.json(
        { error: 'Transcription failed', detail: 'No audio file provided' },
        { status: 400 }
      );
    }

    const rawTranscript = await transcribeWithGroq(audio, filename);
    return NextResponse.json({ rawTranscript });
  } catch (error) {
    console.error('Transcription route error:', error);
    const detail =
      error instanceof Error
        ? error.message
        : 'An unexpected error occurred during transcription';

    const status = detail.toLowerCase().includes('too large') ? 413 : 500;

    return NextResponse.json(
      { error: 'Transcription failed', detail },
      { status }
    );
  }
}
