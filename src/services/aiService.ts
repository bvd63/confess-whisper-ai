import { supabase } from "@/integrations/supabase/client";

export type AiLocale = 'en' | 'es' | 'de';

export interface AiReplyRequest {
  text: string;
  isVip: boolean;
  locale: AiLocale;
  userId?: string;
  confessionId?: string;
}

export interface AiReplyResponse {
  ok: boolean;
  answer?: string;
  error?: string;
}

/**
 * Get AI-generated reply for a confession
 * VIP users get priority processing with better models
 */
export async function getAiReply({
  text,
  isVip,
  locale,
  userId,
  confessionId
}: AiReplyRequest): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke<AiReplyResponse>(
      'ai-confession-response',
      {
        body: {
          text,
          isVip,
          locale,
          userId: userId || 'anonymous',
          confessionId: confessionId || 'temp'
        }
      }
    );

    if (error) {
      console.error('[AI-SERVICE] Edge function error:', error);
      
      // Handle specific error cases
      if (error.message?.includes('429')) {
        throw new Error('AI rate limit exceeded. Please try again in a few moments.');
      }
      if (error.message?.includes('402')) {
        throw new Error('AI service temporarily unavailable. Please contact support.');
      }
      
      throw new Error('Failed to generate AI response');
    }

    if (!data?.ok || !data.answer) {
      console.error('[AI-SERVICE] Invalid response:', data);
      throw new Error(data?.error || 'Invalid AI response');
    }

    return data.answer;

  } catch (error) {
    console.error('[AI-SERVICE] Error:', error);
    
    // Re-throw with user-friendly message
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error('Failed to connect to AI service');
  }
}

/**
 * Check if AI service is available (for feature gating)
 */
export function isAiServiceAvailable(): boolean {
  return !!import.meta.env.VITE_SUPABASE_URL;
}
