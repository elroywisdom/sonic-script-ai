import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const SYSTEM_PROMPT = `You are an elite post-production transcript editor. Your task is to take raw, unpunctuated Speech-to-Text output and transform it into a professional, highly readable script.

Rules:
- Add correct punctuation and natural paragraph breaks.
- Correct clear phonetic transcription errors (tech terms, brand names, proper nouns).
- Preserve 100% of the speaker's original intent and voice. Do not rephrase, summarize, or rewrite unless a grammatical fix is required.
- Do not add commentary, headings, or meta-text.
- Return ONLY the cleaned transcript. Nothing else before or after it.`;

const CHUNK_CHAR_LIMIT = 12000;

function chunkTranscript(text: string): string[] {
  if (text.length <= CHUNK_CHAR_LIMIT) {
    return [text];
  }

  const chunks: string[] = [];
  const paragraphs = text.split(/\n\n+/);
  let current = '';

  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (candidate.length > CHUNK_CHAR_LIMIT && current) {
      chunks.push(current);
      current = paragraph;
    } else if (candidate.length > CHUNK_CHAR_LIMIT) {
      const sentences = paragraph.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [paragraph];
      for (const sentence of sentences) {
        const sentenceCandidate = current ? `${current} ${sentence}` : sentence;
        if (sentenceCandidate.length > CHUNK_CHAR_LIMIT && current) {
          chunks.push(current);
          current = sentence;
        } else {
          current = sentenceCandidate;
        }
      }
    } else {
      current = candidate;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

async function refineChunk(
  apiKey: string,
  rawTranscript: string
): Promise<string> {
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
        { role: 'user', content: rawTranscript },
      ],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('DeepSeek refinement error:', errorBody);
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
  const polished = data.choices?.[0]?.message?.content?.trim() || '';

  if (!polished) {
    throw new Error('Empty polished transcript returned');
  }

  return polished;
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'Refinement failed',
          detail: 'DEEPSEEK_API_KEY is not configured',
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const rawTranscript = body.rawTranscript?.trim();

    if (!rawTranscript) {
      return NextResponse.json(
        { error: 'Refinement failed', detail: 'No transcript provided' },
        { status: 400 }
      );
    }

    const chunks = chunkTranscript(rawTranscript);
    const polishedParts: string[] = [];

    for (const chunk of chunks) {
      const polished = await refineChunk(apiKey, chunk);
      polishedParts.push(polished);
    }

    const polishedTranscript = polishedParts.join('\n\n');

    return NextResponse.json({ polishedTranscript });
  } catch (error) {
    console.error('Refinement route error:', error);
    const detail =
      error instanceof Error
        ? error.message
        : 'An unexpected error occurred during refinement';

    return NextResponse.json(
      { error: 'Refinement failed', detail },
      { status: 500 }
    );
  }
}
