import { NextResponse } from 'next/server';
import { generateCaptionsFromTranscript } from '@/lib/captions';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { transcript } = body;

    if (!transcript || typeof transcript !== 'string') {
      return NextResponse.json(
        { error: 'Bad Request', detail: 'Missing or invalid transcript field' },
        { status: 400 }
      );
    }

    const data = await generateCaptionsFromTranscript(transcript);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Captions API error:', error);
    const detail =
      error instanceof Error
        ? error.message
        : 'An unexpected error occurred during captions generation';

    return NextResponse.json(
      { error: 'Captions Generation Failed', detail },
      { status: 500 }
    );
  }
}
