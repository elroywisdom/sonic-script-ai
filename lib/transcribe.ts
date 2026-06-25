const GROQ_TRANSCRIPTION_URL =
  'https://api.groq.com/openai/v1/audio/transcriptions';

export async function transcribeWithGroq(
  audio: Blob,
  filename: string,
  offset: number = 0
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured');
  }

  const groqFormData = new FormData();
  groqFormData.append('file', audio, filename);
  groqFormData.append('model', 'whisper-large-v3');
  groqFormData.append('response_format', 'verbose_json');

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
  
  interface Segment {
    start: number;
    end: number;
    text: string;
  }

  const segments = (data.segments || []) as Segment[];
  if (segments.length === 0) {
    const rawTranscript = data.text?.trim() || '';
    if (!rawTranscript) {
      throw new Error('Empty transcript returned');
    }
    const startSecs = offset;
    const h = Math.floor(startSecs / 3600);
    const m = Math.floor((startSecs % 3600) / 60);
    const s = Math.floor(startSecs % 60);
    const pad = (n: number) => String(n).padStart(2, '0');
    const timestampStr = h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
    return `[${timestampStr}] ${rawTranscript}`;
  }

  let output = '';
  let lastTimestampSecs = -999;
  const TIMESTAMP_INTERVAL_SECS = 15;

  for (const segment of segments) {
    const absoluteStart = offset + segment.start;
    const text = segment.text.trim();
    if (!text) continue;

    if (absoluteStart - lastTimestampSecs >= TIMESTAMP_INTERVAL_SECS || lastTimestampSecs === -999) {
      const h = Math.floor(absoluteStart / 3600);
      const m = Math.floor((absoluteStart % 3600) / 60);
      const s = Math.floor(absoluteStart % 60);
      
      const pad = (num: number) => String(num).padStart(2, '0');
      const timestampStr = h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
      
      if (output) {
        output += `\n[${timestampStr}] ${text}`;
      } else {
        output += `[${timestampStr}] ${text}`;
      }
      lastTimestampSecs = absoluteStart;
    } else {
      output += ` ${text}`;
    }
  }

  return output.trim();
}

export async function transcribeMultipleWithGroq(
  chunks: Array<{ blob: Blob; filename: string }>
): Promise<string> {
  const transcripts: string[] = [];
  const chunkDuration = 120; // 2 minutes per chunk

  for (let i = 0; i < chunks.length; i++) {
    const offset = i * chunkDuration;
    const transcript = await transcribeWithGroq(chunks[i].blob, chunks[i].filename, offset);
    transcripts.push(transcript);
  }

  return transcripts.join('\n\n').trim();
}
