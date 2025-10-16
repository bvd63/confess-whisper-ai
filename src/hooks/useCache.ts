import { useState, useCallback, useEffect } from "react";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface UseCacheOptions {
  ttl?: number; // Time to live in milliseconds (default: 5 minutes)
}

export const useCache = <T,>(key: string, { ttl = 5 * 60 * 1000 }: UseCacheOptions = {}) => {
  const [cache, setCache] = useState<Map<string, CacheEntry<T>>>(new Map());

  const get = useCallback((cacheKey: string): T | null => {
    const entry = cache.get(cacheKey);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > ttl) {
      // Cache expired
      const newCache = new Map(cache);
      newCache.delete(cacheKey);
      setCache(newCache);
      return null;
    }

    return entry.data;
  }, [cache, ttl]);

  const set = useCallback((cacheKey: string, data: T) => {
    const newCache = new Map(cache);
    newCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });
    setCache(newCache);
  }, [cache]);

  const clear = useCallback((cacheKey?: string) => {
    if (cacheKey) {
      const newCache = new Map(cache);
      newCache.delete(cacheKey);
      setCache(newCache);
    } else {
      setCache(new Map());
    }
  }, [cache]);

  // Cleanup expired entries periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const newCache = new Map(cache);
      let hasExpired = false;

      for (const [key, entry] of newCache.entries()) {
        if (now - entry.timestamp > ttl) {
          newCache.delete(key);
          hasExpired = true;
        }
      }

      if (hasExpired) {
        setCache(newCache);
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [cache, ttl]);

  return { get, set, clear };
};
