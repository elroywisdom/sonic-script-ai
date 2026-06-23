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

async function generateWithGroq(transcript: string, apiKey: string) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
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
    throw new Error(`Groq API returned error: ${errorBody}`);
  }

  const data = await response.json();
  let content = data.choices?.[0]?.message?.content?.trim() || '';
  if (content.startsWith('```')) {
    content = content.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  return JSON.parse(content.trim());
}

export async function POST(request: NextRequest) {
  try {
    const deepseekKey = process.env.DEEPSEEK_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;

    if (!deepseekKey && !groqKey) {
      return NextResponse.json(
        {
          error: 'Quiz generation failed',
          detail: 'No API keys configured. Configure DEEPSEEK_API_KEY or GROQ_API_KEY.',
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

    let quizData = null;

    if (deepseekKey) {
      console.log('Attempting quiz generation with DeepSeek...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10-second timeout for DeepSeek

      try {
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${deepseekKey}`,
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
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          let content = data.choices?.[0]?.message?.content?.trim() || '';
          if (content.startsWith('```')) {
            content = content.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
          }
          quizData = JSON.parse(content.trim());
          console.log('Successfully generated quiz with DeepSeek.');
        } else {
          const errorBody = await response.text();
          console.warn(`DeepSeek API failed with status ${response.status}: ${errorBody}`);
        }
      } catch (deepseekError) {
        clearTimeout(timeoutId);
        console.warn('DeepSeek quiz generation failed or timed out:', deepseekError);
      }
    }

    // Fallback to Groq if DeepSeek failed or wasn't configured
    if (!quizData) {
      if (groqKey) {
        console.log('Falling back to Groq Llama-3.3-70b-versatile for quiz generation...');
        try {
          quizData = await generateWithGroq(transcript, groqKey);
          console.log('Successfully generated quiz with Groq.');
        } catch (groqError) {
          console.error('Groq fallback quiz generation failed:', groqError);
          throw groqError;
        }
      } else {
        throw new Error('DeepSeek failed to respond and no GROQ_API_KEY is configured for fallback.');
      }
    }

    // Final structure validation
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

