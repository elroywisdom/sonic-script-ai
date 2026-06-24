import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const SYSTEM_PROMPT = `You are a professional social media manager and copywriting expert. Your task is to analyze the provided transcript of a video/audio and generate optimized, highly engaging, platform-specific captions/posts for YouTube, Instagram, LinkedIn, WhatsApp, and TikTok.

Guidelines for each platform:
1. **YouTube**:
   - Provide 3 catchy, high-click-through-rate (CTR) video title ideas.
   - Write an engaging description: start with a hooky 2-sentence summary of the content, add structured bullet points highlighting key moments or takeaways, and suggest 5-8 relevant tags.
2. **Instagram**:
   - Write a high-engagement caption starting with a strong hook.
   - Use clean spacing, appropriate emojis, and a clear Call to Action (CTA).
   - Suggest 10-15 relevant hashtags.
3. **LinkedIn**:
   - Write a professional, thought-provoking post.
   - Start with a compelling industry/business hook or key takeaway.
   - Present 3-5 main key insights in structured bullet points.
   - End with an engaging question to spark discussion in the comments.
   - Include 3-5 professional hashtags.
4. **WhatsApp**:
   - Write a friendly, concise broadcast message.
   - Use asterisks for bolding important headers/terms (*example*).
   - Use emojis for readability.
   - Include a placeholder Call to Action: "[Insert Link Here]".
5. **TikTok**:
   - Write a snappy, energetic description/caption.
   - Suggest 3 verbal hook ideas for the beginning of a short-form video.
   - Include 5-8 viral/topic-specific hashtags.

JSON Structure:
Return ONLY a valid JSON object matching the following structure. Do not enclose it in markdown blocks or backticks:
{
  "youtube": {
    "titles": ["Title 1", "Title 2", "Title 3"],
    "description": "YouTube description here...",
    "tags": ["tag1", "tag2", "tag3"]
  },
  "instagram": {
    "caption": "Instagram caption body here...",
    "hashtags": ["#tag1", "#tag2"]
  },
  "linkedin": {
    "post": "LinkedIn post body here...",
    "hashtags": ["#tag1", "#tag2"]
  },
  "whatsapp": {
    "message": "WhatsApp message body here..."
  },
  "tiktok": {
    "caption": "TikTok caption here...",
    "hooks": ["Hook 1", "Hook 2", "Hook 3"],
    "hashtags": ["#tag1", "#tag2"]
  }
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
      temperature: 0.7,
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
          error: 'Captions generation failed',
          detail: 'No API keys configured. Configure DEEPSEEK_API_KEY or GROQ_API_KEY.',
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const transcript = body.transcript?.trim();

    if (!transcript) {
      return NextResponse.json(
        { error: 'Captions generation failed', detail: 'No transcript provided' },
        { status: 400 }
      );
    }

    let captionData = null;

    if (deepseekKey) {
      console.log('Attempting captions generation with DeepSeek...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12-second timeout

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
            temperature: 0.7,
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
          captionData = JSON.parse(content.trim());
          console.log('Successfully generated captions with DeepSeek.');
        } else {
          const errorBody = await response.text();
          console.warn(`DeepSeek API failed with status ${response.status}: ${errorBody}`);
        }
      } catch (deepseekError) {
        clearTimeout(timeoutId);
        console.warn('DeepSeek captions generation failed or timed out:', deepseekError);
      }
    }

    // Fallback to Groq if DeepSeek failed or wasn't configured
    if (!captionData) {
      if (groqKey) {
        console.log('Falling back to Groq Llama-3.3-70b-versatile for captions generation...');
        try {
          captionData = await generateWithGroq(transcript, groqKey);
          console.log('Successfully generated captions with Groq.');
        } catch (groqError) {
          console.error('Groq fallback captions generation failed:', groqError);
          throw groqError;
        }
      } else {
        throw new Error('DeepSeek failed to respond and no GROQ_API_KEY is configured for fallback.');
      }
    }

    // Validate structure of captions response
    const requiredPlatforms = ['youtube', 'instagram', 'linkedin', 'whatsapp', 'tiktok'];
    for (const platform of requiredPlatforms) {
      if (!captionData[platform]) {
        console.warn(`Generated captions are missing platform: ${platform}. Attempting fallback structure...`);
        captionData[platform] = { error: 'Failed to generate captions for this platform.' };
      }
    }

    return NextResponse.json(captionData);
  } catch (error) {
    console.error('Captions API route error:', error);
    const detail =
      error instanceof Error
        ? error.message
        : 'An unexpected error occurred during captions generation';

    return NextResponse.json(
      { error: 'Captions generation failed', detail },
      { status: 500 }
    );
  }
}
