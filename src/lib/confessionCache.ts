import { supabase } from '@/integrations/supabase/client';

// Cache for confession data with TTL
interface ConfessionCacheEntry {
  value: any;
  expires: number;
  inflight?: Promise<any>;
}

const CONFESSION_TTL_MS = 2 * 60 * 1000; // 2 minutes (shorter TTL for dynamic content)
const cache = new Map<string, ConfessionCacheEntry>();

export async function getConfessionCached(confessionId: string): Promise<any> {
  if (!confessionId) return null;

  const now = Date.now();
  const entry = cache.get(confessionId);

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
        .from('confessions')
        .select('*')
        .eq('id', confessionId)
        .maybeSingle();

      if (error) throw error;

      const val = data || null;
      cache.set(confessionId, { value: val, expires: now + CONFESSION_TTL_MS });
      return val;
    } catch (e) {
      // Cache short-lived null on error
      cache.set(confessionId, { value: null, expires: now + 30_000 });
      return null;
    } finally {
      const current = cache.get(confessionId);
      if (current) delete current.inflight;
    }
  })();

  cache.set(confessionId, { value: entry?.value ?? null, expires: now + CONFESSION_TTL_MS, inflight });
  return inflight;
}

export function primeConfessionCache(confessionId: string, confession: any) {
  cache.set(confessionId, { value: confession, expires: Date.now() + CONFESSION_TTL_MS });
}

export function invalidateConfessionCache(confessionId: string) {
  cache.delete(confessionId);
}

// Batch prime for feed loading
export function primeConfessionBatch(confessions: any[]) {
  const now = Date.now();
  confessions.forEach(confession => {
    cache.set(confession.id, { value: confession, expires: now + CONFESSION_TTL_MS });
  });
}
