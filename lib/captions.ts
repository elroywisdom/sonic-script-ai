import { callLLM } from './llmClient';

export interface YouTubeCaptions {
  titles: string[];
  description: string;
  tags: string[];
}

export interface InstagramCaptions {
  caption: string;
  hashtags: string[];
}

export interface LinkedInCaptions {
  post: string;
  hashtags: string[];
}

export interface WhatsAppCaptions {
  message: string;
}

export interface TikTokCaptions {
  caption: string;
  hooks: string[];
  hashtags: string[];
}

export interface CaptionData {
  youtube: YouTubeCaptions;
  instagram: InstagramCaptions;
  linkedin: LinkedInCaptions;
  whatsapp: WhatsAppCaptions;
  tiktok: TikTokCaptions;
}

function normalizeCaptionData(parsed: Record<string, unknown>): CaptionData {
  const yt = (parsed.youtube as Partial<YouTubeCaptions>) || {};
  const ig = (parsed.instagram as Partial<InstagramCaptions>) || {};
  const li = (parsed.linkedin as Partial<LinkedInCaptions>) || {};
  const wa = (parsed.whatsapp as Partial<WhatsAppCaptions>) || {};
  const tt = (parsed.tiktok as Partial<TikTokCaptions>) || {};

  return {
    youtube: {
      titles: Array.isArray(yt.titles) && yt.titles.length > 0 ? yt.titles : ['Video Summary & Overview'],
      description: typeof yt.description === 'string' ? yt.description : '',
      tags: Array.isArray(yt.tags) ? yt.tags : [],
    },
    instagram: {
      caption: typeof ig.caption === 'string' ? ig.caption : '',
      hashtags: Array.isArray(ig.hashtags) ? ig.hashtags : [],
    },
    linkedin: {
      post: typeof li.post === 'string' ? li.post : (typeof parsed.linkedIn === 'string' ? parsed.linkedIn : ''),
      hashtags: Array.isArray(li.hashtags) ? li.hashtags : [],
    },
    whatsapp: {
      message: typeof wa.message === 'string' ? wa.message : (typeof parsed.summary === 'string' ? parsed.summary : ''),
    },
    tiktok: {
      caption: typeof tt.caption === 'string' ? tt.caption : '',
      hooks: Array.isArray(tt.hooks) ? tt.hooks : [],
      hashtags: Array.isArray(tt.hashtags) ? tt.hashtags : [],
    },
  };
}

export async function generateCaptionsFromTranscript(transcript: string): Promise<CaptionData> {
  const systemPrompt = `You are an elite social media strategist. Generate a multi-platform social media content pack based on the transcript.
Return ONLY valid JSON matching this exact format:
{
  "youtube": {
    "titles": ["High CTR Title 1", "SEO Title 2", "Engaging Title 3"],
    "description": "Detailed video description with key topics and summary...",
    "tags": ["tag1", "tag2", "tag3"]
  },
  "instagram": {
    "caption": "Engaging Instagram post caption...",
    "hashtags": ["#hashtag1", "#hashtag2"]
  },
  "linkedin": {
    "post": "Professional LinkedIn thought-leadership post...",
    "hashtags": ["#professional1", "#industry2"]
  },
  "whatsapp": {
    "message": "Concise WhatsApp broadcast message..."
  },
  "tiktok": {
    "caption": "Snappy TikTok caption...",
    "hooks": ["Verbal hook 1", "Attention hook 2"],
    "hashtags": ["#fyp", "#viral"]
  }
}`;

  const text = await callLLM({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: transcript.slice(0, 15000) },
    ],
    temperature: 0.5,
    responseFormatJson: true,
  });

  try {
    const parsed = JSON.parse(text);
    return normalizeCaptionData(parsed);
  } catch {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return normalizeCaptionData(parsed);
    }
    throw new Error('Failed to parse captions response as JSON');
  }
}
