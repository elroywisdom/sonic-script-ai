const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';

const REFINE_SYSTEM_PROMPT = `You are an elite post-production transcript editor. Your task is to take raw, unpunctuated Speech-to-Text output and transform it into a professional, highly readable script.

Rules:
- Add correct punctuation and natural paragraph breaks.
- Correct clear phonetic transcription errors (tech terms, brand names, proper nouns).
- Preserve 100% of the speaker's original intent and voice. Do not rephrase, summarize, or rewrite unless a grammatical fix is required.
- Do not add commentary, headings, or meta-text.
- Return ONLY the cleaned transcript. Nothing else before or after it.`;

async function refineSingleChunk(
  text: string,
  deepseekKey?: string,
  groqKey?: string
): Promise<string> {
  if (deepseekKey) {
    try {
      const res = await fetch(DEEPSEEK_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${deepseekKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: REFINE_SYSTEM_PROMPT },
            { role: 'user', content: text },
          ],
          temperature: 0.3,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content?.trim();
        if (content) return content;
      } else {
        const errText = await res.text();
        console.warn(`DeepSeek API failed with status ${res.status}: ${errText}`);
      }
    } catch (err) {
      console.warn('DeepSeek refine API call failed, attempting Groq fallback...', err);
    }
  }

  if (groqKey) {
    const res = await fetch(GROQ_CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: REFINE_SYSTEM_PROMPT },
          { role: 'user', content: text },
        ],
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Refine API error (${res.status}): ${errorText}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (content) return content;
  }

  throw new Error('No valid LLM API key configured for refinement');
}

export async function refineTranscript(rawTranscript: string): Promise<string> {
  if (!rawTranscript || !rawTranscript.trim()) {
    return '';
  }

  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  const maxChunkLength = 8000;
  if (rawTranscript.length > maxChunkLength) {
    const lines = rawTranscript.split('\n');
    const chunks: string[] = [];
    let currentChunk = '';

    for (const line of lines) {
      if ((currentChunk + '\n' + line).length > maxChunkLength) {
        if (currentChunk.trim()) chunks.push(currentChunk.trim());
        currentChunk = line;
      } else {
        currentChunk = currentChunk ? currentChunk + '\n' + line : line;
      }
    }
    if (currentChunk.trim()) chunks.push(currentChunk.trim());

    const polishedChunks: string[] = [];
    for (const chunk of chunks) {
      const polished = await refineSingleChunk(chunk, deepseekKey, groqKey);
      polishedChunks.push(polished);
    }
    return polishedChunks.join('\n\n').trim();
  }

  return await refineSingleChunk(rawTranscript, deepseekKey, groqKey);
}
