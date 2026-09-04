import { NextResponse } from 'next/server';
import { generateQuizFromTranscript } from '@/lib/quiz';

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

    const questions = await generateQuizFromTranscript(transcript);
    return NextResponse.json({ questions });
  } catch (error) {
    console.error('Quiz API error:', error);
    const detail =
      error instanceof Error
        ? error.message
        : 'An unexpected error occurred during quiz generation';

    return NextResponse.json(
      { error: 'Quiz Generation Failed', detail },
      { status: 500 }
    );
  }
}
