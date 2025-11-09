import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/lib/logger';

export type ModerationLevel = 'safe' | 'borderline' | 'unsafe';

interface ModerationResult {
  level: ModerationLevel;
  reason?: string;
  flagged: boolean;
}

/**
 * Hook for AI-powered content moderation with tiered responses
 */
export const useModerationStatus = () => {
  const [isChecking, setIsChecking] = useState(false);

  const moderateContent = useCallback(async (
    content: string,
    language: 'en' | 'es' | 'de' = 'en'
  ): Promise<ModerationResult> => {
    setIsChecking(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('ai-moderation', {
        body: { content, language }
      });

      if (error) throw error;

      // Parse moderation response
      const isSafe = data?.is_safe ?? true;
      const reason = data?.reason ?? '';

      // Determine level based on keywords and patterns
      let level: ModerationLevel = 'safe';
      
      if (!isSafe) {
        // Check for severe violations
        const severeKeywords = ['kill', 'suicide', 'self-harm', 'abuse', 'violence'];
        const hasSevere = severeKeywords.some(kw => 
          content.toLowerCase().includes(kw) || reason.toLowerCase().includes(kw)
        );
        
        level = hasSevere ? 'unsafe' : 'borderline';
      }

      return {
        level,
        reason,
        flagged: !isSafe,
      };
    } catch (error) {
      logError('Moderation error', error as Error);
      // Fail open but log for review
      return {
        level: 'safe',
        reason: 'Moderation service unavailable',
        flagged: false,
      };
    } finally {
      setIsChecking(false);
    }
  }, []);

  const checkForCrisis = useCallback((content: string): boolean => {
    const crisisKeywords = [
      'suicide', 'kill myself', 'end it all', 'not worth living',
      'self-harm', 'hurt myself', 'want to die', 'no point in living'
    ];
    
    const normalized = content.toLowerCase();
    return crisisKeywords.some(keyword => normalized.includes(keyword));
  }, []);

  return {
    moderateContent,
    checkForCrisis,
    isChecking,
  };
};
