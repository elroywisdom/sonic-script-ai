import { NextResponse } from 'next/server';
import { transcribeWithGroq } from '@/lib/transcribe';
import { getObjectFromR2, deleteObjectFromR2 } from '@/lib/r2';

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let audioBlob: Blob | null = null;
    let filename = 'audio.wav';
    let offset = 0;
    let r2KeyToDelete: string | null = null;

    if (contentType.includes('application/json')) {
      const body = await request.json();
      const { r2Key } = body;
      filename = body.filename || 'audio.wav';
      offset = Number(body.offset || '0');

      if (!r2Key || typeof r2Key !== 'string') {
        return NextResponse.json(
          { error: 'Bad Request', detail: 'Missing or invalid r2Key' },
          { status: 400 }
        );
      }

      audioBlob = await getObjectFromR2(r2Key);
      if (!audioBlob) {
        return NextResponse.json(
          { error: 'Not Found', detail: `Failed to retrieve audio object from R2 key '${r2Key}'` },
          { status: 404 }
        );
      }
      r2KeyToDelete = r2Key;
    } else {
      const formData = await request.formData();
      const audio = formData.get('audio');
      filename = (formData.get('filename') as string) || 'audio.wav';
      offset = Number(formData.get('offset') || '0');

      if (!audio || !(audio instanceof Blob)) {
        return NextResponse.json(
          { error: 'Bad Request', detail: 'No audio file provided' },
          { status: 400 }
        );
      }
      audioBlob = audio;
    }

    try {
      const rawTranscript = await transcribeWithGroq(audioBlob, filename, offset);
      return NextResponse.json({ rawTranscript });
    } finally {
      if (r2KeyToDelete) {
        // Asynchronously delete transient object from R2
        deleteObjectFromR2(r2KeyToDelete).catch((err) => {
          console.warn(`Failed background deletion of R2 object '${r2KeyToDelete}':`, err);
        });
      }
    }
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
