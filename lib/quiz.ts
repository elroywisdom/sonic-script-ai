import { callLLM } from './llmClient';

export interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export async function generateQuizFromTranscript(transcript: string): Promise<Question[]> {
  const systemPrompt = `You are an educational assistant. Generate 5 multiple-choice quiz questions based on the provided transcript.
Return ONLY valid JSON matching this exact format:
{
  "questions": [
    {
      "id": 1,
      "question": "Question text...",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Explanation..."
    }
  ]
}`;

  const text = await callLLM({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: transcript.slice(0, 15000) },
    ],
    temperature: 0.4,
    responseFormatJson: true,
  });

  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : parsed.questions || [];
  } catch {
    const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return Array.isArray(parsed) ? parsed : parsed.questions || [];
    }
    throw new Error('Failed to parse quiz response as JSON');
  }
}
