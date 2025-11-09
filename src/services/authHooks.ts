/**
 * Authentication-related hooks and utilities
 * Handles streak bonuses and other daily login rewards
 */
import { env } from '@/lib/env';

export async function onDailyLogin({
  userId,
  currentStreak,
}: {
  userId: string;
  currentStreak: number;
}): Promise<void> {
  try {
    const url = `${env.client.supabaseUrl}/functions/v1/award-streak-bonus`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, currentStreak }),
    });
  } catch (error) {
    console.error('Failed to check streak bonus:', error);
  }
}
