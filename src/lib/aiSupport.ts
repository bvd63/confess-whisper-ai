import type { Language } from '@/contexts/LanguageContext';
import { env } from '@/lib/env';
import { logError } from '@/lib/logger';
import { SUPPORT_EMAIL } from '@/lib/support';

const MODEL = 'gpt-4o-mini';
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

const LANGUAGE_HINT: Record<Language, string> = {
  en: 'Respond only in English.',
  es: 'Responde únicamente en español.',
  de: 'Antworte ausschließlich auf Deutsch.',
};

const LANGUAGE_NAME: Record<Language, string> = {
  en: 'English',
  es: 'Spanish',
  de: 'German',
};

const SYSTEM_PROMPT = (locale: Language) =>
  [
    'You are ConfessAI\'s technical support agent.',
    'Assist ONLY with account & login issues, VIP & payments (free vs VIP tiers), coins & rewards, technical problems with posting or viewing confessions, notifications, languages, and general app bugs.',
    'Do NOT provide mental health advice, emotional counseling, or crisis support.',
    `Keep answers short, clear, and friendly. Mention ${SUPPORT_EMAIL} for serious billing or login problems.`,
    'If a user asks about topics outside the allowed scope, politely explain that you can only help with technical ConfessAI issues.',
    LANGUAGE_HINT[locale],
    `Stay within 120 words and avoid markdown formatting. Language: ${LANGUAGE_NAME[locale]}.`,
  ].join(' ');

export interface AiSupportMetadata {
  userId?: string | null;
  totalMessages?: number;
  clientTimestamp?: string;
}

function createAbortController(timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return { controller, timeout };
}

export async function getAiSupportAnswer(
  message: string,
  locale: Language,
  metadata: AiSupportMetadata = {}
): Promise<string> {
  const apiKey = env.client.openAiApiKey;
  if (!apiKey) {
    throw new Error('ai_support_unavailable');
  }

  const { controller, timeout } = createAbortController(15000);

  const metadataSummary = [
    `User ID: ${metadata.userId || 'anonymous'}`,
    `Locale: ${locale}`,
    `Messages this session: ${metadata.totalMessages ?? 0}`,
    `Client timestamp: ${metadata.clientTimestamp || new Date().toISOString()}`,
  ].join('\n');

  try {
    const response = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.2,
        max_tokens: 350,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT(locale) },
            { role: 'system', content: `Context:\n${metadataSummary}` },
          { role: 'user', content: message },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`openai_error_${response.status}_${errorText}`);
    }

    const data = await response.json();
    const answer: string | undefined = data?.choices?.[0]?.message?.content?.trim();

    if (!answer) {
      throw new Error('empty_ai_response');
    }

    return answer;
  } catch (error) {
    logError('[AI Support] Failed to fetch answer', error as Error);
    throw new Error('ai_support_unavailable');
  } finally {
    clearTimeout(timeout);
  }
}
