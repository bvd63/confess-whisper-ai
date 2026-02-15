/**
 * Authentication-related hooks and utilities
 * Handles streak bonuses and other daily login rewards
 */
import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/lib/logger';

export async function onDailyLogin({
  userId,
  currentStreak,
}: {
  userId: string;
  currentStreak: number;
}): Promise<void> {
  try {
    await supabase.functions.invoke('award-streak-bonus', {
      body: { userId, currentStreak },
    });
  } catch (error) {
    logError('Failed to check streak bonus', error as Error);
  }
}
