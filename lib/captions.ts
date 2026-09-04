export interface CaptionData {
  twitter: string;
  linkedIn: string;
  summary: string;
  keyTakeaways: string[];
}

export async function generateCaptionsFromTranscript(transcript: string): Promise<CaptionData> {
  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('No API key configured for captions generation');
  }

  const isDeepSeek = Boolean(process.env.DEEPSEEK_API_KEY);
  const url = isDeepSeek
    ? 'https://api.deepseek.com/chat/completions'
    : 'https://api.groq.com/openai/v1/chat/completions';
  const model = isDeepSeek ? 'deepseek-chat' : 'llama-3.3-70b-versatile';

  const systemPrompt = `You are a social media manager. Generate engaging social media content based on the transcript.
Return ONLY valid JSON matching this exact format:
{
  "twitter": "Short engaging thread/tweet...",
  "linkedIn": "Professional summary post with bullet points and hashtags...",
  "summary": "Executive 2-sentence summary...",
  "keyTakeaways": ["Takeaway 1", "Takeaway 2", "Takeaway 3"]
}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: transcript.slice(0, 15000) },
      ],
      temperature: 0.5,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Captions generation API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content?.trim() || '';

  try {
    return JSON.parse(text);
  } catch {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Failed to parse captions response as JSON');
  }
}
