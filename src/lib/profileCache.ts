import { supabase } from '@/integrations/supabase/client';

// Cache for full profile data with TTL and deduplication
interface ProfileCacheEntry {
  value: any;
  expires: number;
  inflight?: Promise<any>;
}

const PROFILE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, ProfileCacheEntry>();

export async function getProfileCached(userId: string): Promise<any> {
  if (!userId) return null;

  const now = Date.now();
  const entry = cache.get(userId);

  // Serve from cache if fresh
  if (entry && entry.expires > now && entry.value !== undefined) {
    return entry.value;
  }

  // Return in-flight if exists
  if (entry?.inflight) return entry.inflight;

  // Create new request
  const inflight = (async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      const val = data || null;
      cache.set(userId, { value: val, expires: now + PROFILE_TTL_MS });
      return val;
    } catch (e) {
      // Cache short-lived null on error
      cache.set(userId, { value: null, expires: now + 30_000 });
      return null;
    } finally {
      const current = cache.get(userId);
      if (current) delete current.inflight;
    }
  })();

  cache.set(userId, { value: entry?.value ?? null, expires: now + PROFILE_TTL_MS, inflight });
  return inflight;
}

export function primeProfileCache(userId: string, profile: any) {
  cache.set(userId, { value: profile, expires: Date.now() + PROFILE_TTL_MS });
}

export function invalidateProfileCache(userId: string) {
  cache.delete(userId);
}
