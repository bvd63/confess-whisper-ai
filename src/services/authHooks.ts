/**
 * Authentication-related hooks and utilities
 * Handles streak bonuses and other daily login rewards
 */

export async function onDailyLogin({
  userId,
  currentStreak,
}: {
  userId: string;
  currentStreak: number;
}): Promise<void> {
  try {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/award-streak-bonus`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, currentStreak }),
    });
  } catch (error) {
    console.error('Failed to check streak bonus:', error);
  }
}
