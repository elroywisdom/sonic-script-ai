import { NextResponse } from 'next/server';
import { refineTranscript } from '@/lib/refine';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { rawTranscript } = body;

    if (!rawTranscript || typeof rawTranscript !== 'string') {
      return NextResponse.json(
        { error: 'Bad Request', detail: 'Missing or invalid rawTranscript field' },
        { status: 400 }
      );
    }

    const polishedTranscript = await refineTranscript(rawTranscript);
    return NextResponse.json({ polishedTranscript });
  } catch (error) {
    console.error('Refine API error:', error);
    const detail =
      error instanceof Error
        ? error.message
        : 'An unexpected error occurred during refinement';

    return NextResponse.json(
      { error: 'Refinement Failed', detail },
      { status: 500 }
    );
  }
}
