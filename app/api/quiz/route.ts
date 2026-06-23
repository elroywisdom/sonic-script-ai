import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const SYSTEM_PROMPT = `You are an expert educator. Your task is to analyze the provided transcript and generate a high-quality 5-question multiple-choice quiz to test the user's comprehension of the material.

Rules:
- Generate exactly 5 questions.
- Each question must have exactly 4 choices/options.
- Select a single correct answer and provide a clear, educational explanation.

JSON Format:
Return ONLY a valid JSON object matching the following structure. Do not enclose it in markdown blocks or backticks:
{
  "questions": [
    {
      "id": 1,
      "question": "Question text here?",
      "options": ["Choice A", "Choice B", "Choice C", "Choice D"],
      "answerIndex": 0, // 0-based index indicating the correct choice (0, 1, 2, or 3)
      "explanation": "Educational reason why this choice is correct."
    }
  ]
}`;

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'Quiz generation failed',
          detail: 'DEEPSEEK_API_KEY is not configured',
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const transcript = body.transcript?.trim();

    if (!transcript) {
      return NextResponse.json(
        { error: 'Quiz generation failed', detail: 'No transcript provided' },
        { status: 400 }
      );
    }

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Here is the transcript:\n\n${transcript}` },
        ],
        temperature: 0.5,
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('DeepSeek quiz generation error:', errorBody);
      let detail = 'Unknown error from DeepSeek API';
      try {
        const parsed = JSON.parse(errorBody);
        detail = parsed.error?.message || parsed.message || detail;
      } catch {
        detail = errorBody || detail;
      }
      throw new Error(detail);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content?.trim() || '';

    // Handle potential LLM code block wrappers defensively
    if (content.startsWith('```')) {
      content = content.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }
    content = content.trim();

    // Parse to ensure valid JSON structure
    const quizData = JSON.parse(content);
    if (!quizData.questions || !Array.isArray(quizData.questions) || quizData.questions.length === 0) {
      throw new Error('Invalid JSON format returned: questions array is missing or empty.');
    }

    return NextResponse.json(quizData);
  } catch (error) {
    console.error('Quiz API route error:', error);
    const detail =
      error instanceof Error
        ? error.message
        : 'An unexpected error occurred during quiz generation';

    return NextResponse.json(
      { error: 'Quiz generation failed', detail },
      { status: 500 }
    );
  }
}
