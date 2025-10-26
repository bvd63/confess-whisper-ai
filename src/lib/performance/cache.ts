/**
 * Client-side caching utility for performance optimization
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class CacheManager {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Set cache entry with TTL
   */
  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + ttl,
    });
  }

  /**
   * Get cache entry if not expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Check if cache has valid entry
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Invalidate specific cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalidate all cache entries matching pattern
   */
  invalidatePattern(pattern: RegExp): void {
    Array.from(this.cache.keys())
      .filter(key => pattern.test(key))
      .forEach(key => this.cache.delete(key));
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    Array.from(this.cache.entries())
      .filter(([_, entry]) => now > entry.expiresAt)
      .forEach(([key]) => this.cache.delete(key));
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

export const cache = new CacheManager();

// Auto cleanup every 10 minutes
if (typeof window !== 'undefined') {
  setInterval(() => cache.cleanup(), 10 * 60 * 1000);
}

/**
 * Cache keys for common queries
 */
export const CACHE_KEYS = {
  USER_PROFILE: (userId: string) => `profile:${userId}`,
  USER_SUBSCRIPTION: (userId: string) => `subscription:${userId}`,
  CONFESSION_FEED: (page: number) => `feed:page:${page}`,
  HOT_CONFESSIONS: 'confessions:hot',
  CATEGORIES: 'categories:all',
  TRANSLATIONS: (lang: string) => `i18n:${lang}`,
  USER_COINS: (userId: string) => `coins:${userId}`,
  USER_BADGES: (userId: string) => `badges:${userId}`,
} as const;

/**
 * Cache TTLs for different data types
 */
export const CACHE_TTL = {
  SHORT: 2 * 60 * 1000,      // 2 minutes
  MEDIUM: 5 * 60 * 1000,     // 5 minutes
  LONG: 15 * 60 * 1000,      // 15 minutes
  VERY_LONG: 60 * 60 * 1000, // 1 hour
} as const;
