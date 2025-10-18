import { supabase } from '@/integrations/supabase/client';

// Simple in-memory cache with TTL and in-flight de-duplication
interface CacheEntry {
  value: string | null;
  expires: number;
  inflight?: Promise<string | null>;
}

const NICK_TTL_MS = 10 * 60 * 1000; // 10 minutes
const cache = new Map<string, CacheEntry>();

export async function getNicknameCached(userId: string): Promise<string | null> {
  if (!userId) return null;

  const now = Date.now();
  const entry = cache.get(userId);

  // Serve from fresh cache
  if (entry && entry.expires > now && entry.value !== undefined) {
    return entry.value;
  }

  // Return in-flight promise if any
  if (entry?.inflight) return entry.inflight;

  // Create a new in-flight request and store it to de-dupe
  const inflight = (async () => {
    try {
      // 1) Try direct select first (fast path; allowed by RLS when nickname is not null)
      const { data: prof } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('user_id', userId)
        .maybeSingle();

      if (prof?.nickname) {
        const val = prof.nickname as string;
        cache.set(userId, { value: val, expires: now + NICK_TTL_MS });
        return val;
      }

      // 2) Fallback to RPC (handles any edge cases)
      const { data: rpcNick } = await supabase.rpc('get_user_nickname', {
        _target_user_id: userId,
      });

      const val = (rpcNick as string) || null;
      cache.set(userId, { value: val, expires: now + NICK_TTL_MS });
      return val;
    } catch (e) {
      // On error, store short-lived null to avoid hammering
      cache.set(userId, { value: null, expires: now + 30_000 });
      return null;
    } finally {
      const current = cache.get(userId);
      if (current) delete current.inflight;
    }
  })();

  cache.set(userId, { value: entry?.value ?? null, expires: now + NICK_TTL_MS, inflight });
  return inflight;
}

export function primeNicknameCache(userId: string, nickname: string | null) {
  cache.set(userId, { value: nickname, expires: Date.now() + NICK_TTL_MS });
}
