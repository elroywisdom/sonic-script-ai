import { callLLM } from './llmClient';

const REFINE_SYSTEM_PROMPT = `You are an elite post-production transcript editor. Your task is to take raw, unpunctuated Speech-to-Text output and transform it into a professional, highly readable script.

Rules:
- Add correct punctuation and natural paragraph breaks.
- Correct clear phonetic transcription errors (tech terms, brand names, proper nouns).
- Preserve 100% of the speaker's original intent and voice. Do not rephrase, summarize, or rewrite unless a grammatical fix is required.
- Do not add commentary, headings, or meta-text.
- Return ONLY the cleaned transcript. Nothing else before or after it.`;

export async function refineTranscript(rawTranscript: string): Promise<string> {
  if (!rawTranscript || !rawTranscript.trim()) {
    return '';
  }

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
      const polished = await callLLM({
        messages: [
          { role: 'system', content: REFINE_SYSTEM_PROMPT },
          { role: 'user', content: chunk },
        ],
        temperature: 0.3,
      });
      polishedChunks.push(polished);
    }
    return polishedChunks.join('\n\n').trim();
  }

  return await callLLM({
    messages: [
      { role: 'system', content: REFINE_SYSTEM_PROMPT },
      { role: 'user', content: rawTranscript },
    ],
    temperature: 0.3,
  });
}
