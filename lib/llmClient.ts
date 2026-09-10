const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

const GROQ_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-70b-versatile',
  'llama3-70b-8192',
  'llama3-8b-8192',
  'mixtral-8x7b-32768',
];

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionOptions {
  messages: ChatMessage[];
  temperature?: number;
  responseFormatJson?: boolean;
}

/**
 * Calls Groq / DeepSeek LLM APIs with automatic fallback across models and providers.
 * Guarantees resilience against `model_not_found` (404) or API availability errors.
 */
export async function callLLM(options: ChatCompletionOptions): Promise<string> {
  const groqKey = process.env.GROQ_API_KEY;
  const deepseekKey = process.env.DEEPSEEK_API_KEY;

  if (!groqKey && !deepseekKey) {
    throw new Error('No API key (GROQ_API_KEY or DEEPSEEK_API_KEY) configured');
  }

  let lastError = '';

  // Try Groq models first
  if (groqKey) {
    for (const model of GROQ_MODELS) {
      try {
        const bodyPayload: Record<string, unknown> = {
          model,
          messages: options.messages,
          temperature: options.temperature ?? 0.3,
        };

        if (options.responseFormatJson) {
          bodyPayload.response_format = { type: 'json_object' };
        }

        const res = await fetch(GROQ_CHAT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${groqKey}`,
          },
          body: JSON.stringify(bodyPayload),
        });

        if (res.ok) {
          const data = await res.json();
          const content = data.choices?.[0]?.message?.content?.trim();
          if (content) return content;
        }

        const errText = await res.text();
        console.warn(`[LLM] Groq model '${model}' failed with status ${res.status}: ${errText}`);
        lastError = `Groq ${model} (${res.status}): ${errText}`;

        // If error is 404 model_not_found, loop to next Groq model
        if (res.status === 404 || errText.includes('model_not_found')) {
          continue;
        }
      } catch (err) {
        console.warn(`[LLM] Groq call failed for model '${model}':`, err);
        lastError = String(err);
      }
    }
  }

  // Fallback to DeepSeek if Groq models failed or Groq key is missing
  if (deepseekKey) {
    try {
      const bodyPayload: Record<string, unknown> = {
        model: 'deepseek-chat',
        messages: options.messages,
        temperature: options.temperature ?? 0.3,
      };

      if (options.responseFormatJson) {
        bodyPayload.response_format = { type: 'json_object' };
      }

      const res = await fetch(DEEPSEEK_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${deepseekKey}`,
        },
        body: JSON.stringify(bodyPayload),
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content?.trim();
        if (content) return content;
      }

      const errText = await res.text();
      lastError = `DeepSeek (${res.status}): ${errText}`;
    } catch (err) {
      lastError = String(err);
    }
  }

  throw new Error(`LLM completion failed across all models. Details: ${lastError}`);
}
