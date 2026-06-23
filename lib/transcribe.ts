const GROQ_TRANSCRIPTION_URL =
  'https://api.groq.com/openai/v1/audio/transcriptions';

export async function transcribeWithGroq(
  audio: Blob,
  filename: string
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured');
  }

  const groqFormData = new FormData();
  groqFormData.append('file', audio, filename);
  groqFormData.append('model', 'whisper-large-v3');
  groqFormData.append('response_format', 'json');

  let response: Response | null = null;
  const maxRetries = 3;
  let delay = 2000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      response = await fetch(GROQ_TRANSCRIPTION_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: groqFormData,
      });

      // If rate limited or temporary server error, retry with backoff
      if (response.status === 429 || (response.status >= 500 && response.status < 600)) {
        const text = await response.clone().text();
        console.warn(`Attempt ${attempt} to transcribe chunk failed with status ${response.status}: ${text}`);

        if (attempt < maxRetries) {
          console.warn(`Waiting ${delay}ms before retry attempt ${attempt + 1}...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2; // exponential backoff
          continue;
        }
      }
      break; // Success or last attempt reached
    } catch (err) {
      console.error(`Attempt ${attempt} fetch failed:`, err);
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
        continue;
      }
      throw err;
    }
  }

  if (!response) {
    throw new Error('No response received from Groq API');
  }

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Groq transcription error:', errorBody);

    let detail = response.statusText || 'Unknown error from Groq API';
    try {
      const parsed = JSON.parse(errorBody);
      detail = parsed.error?.message || parsed.message || detail;
    } catch {
      if (errorBody) detail = errorBody;
    }

    if (response.status === 413) {
      detail =
        'Audio file is too large for transcription. Try a shorter clip or a smaller file.';
    }

    throw new Error(detail);
  }

  const data = await response.json();
  const rawTranscript = data.text?.trim() || '';

  if (!rawTranscript) {
    throw new Error('Empty transcript returned');
  }

  return rawTranscript;
}

export async function transcribeMultipleWithGroq(
  chunks: Array<{ blob: Blob; filename: string }>
): Promise<string> {
  const transcripts: string[] = [];

  for (const chunk of chunks) {
    const transcript = await transcribeWithGroq(chunk.blob, chunk.filename);
    transcripts.push(transcript);
  }

  return transcripts.join(' ').trim();
}
