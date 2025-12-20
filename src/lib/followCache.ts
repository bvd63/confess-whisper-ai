import { supabase } from '@/integrations/supabase/client';

// Cache for follow stats with TTL
interface FollowCacheEntry {
  followers_count: number;
  following_count: number;
  expires: number;
}

const FOLLOW_TTL_MS = 3 * 60 * 1000; // 3 minutes
const cache = new Map<string, FollowCacheEntry>();

export async function getFollowStatsCached(userId: string): Promise<{ followers_count: number; following_count: number } | null> {
  if (!userId) return null;

  const now = Date.now();
  const entry = cache.get(userId);

  // Serve from cache if fresh
  if (entry && entry.expires > now) {
    return {
      followers_count: entry.followers_count,
      following_count: entry.following_count,
    };
  }

  // Fetch from database
  try {
    const { data, error } = await supabase
      .from('public_profiles')
      .select('followers_count, following_count')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      cache.set(userId, {
        followers_count: data.followers_count || 0,
        following_count: data.following_count || 0,
        expires: now + FOLLOW_TTL_MS,
      });
      return data;
    }

    return null;
  } catch (e) {
    return null;
  }
}

export function invalidateFollowCache(userId: string) {
  cache.delete(userId);
}

export function primeFollowCache(userId: string, followers: number, following: number) {
  cache.set(userId, {
    followers_count: followers,
    following_count: following,
    expires: Date.now() + FOLLOW_TTL_MS,
  });
}
