/**
 * Edge Cache Manager - Performance Optimization Layer
 * Manages cache strategies for different resource types
 */

interface CacheConfig {
  staticAssets: number;    // 24 hours for images, fonts
  apiResponses: number;    // 5 minutes for API calls
  userContent: number;     // 2 minutes for confessions
  publicPages: number;     // 1 hour for landing pages
}

export class EdgeCacheManager {
  private config: CacheConfig = {
    staticAssets: 86400,    // 24 hours
    apiResponses: 300,      // 5 minutes
    userContent: 120,       // 2 minutes
    publicPages: 3600       // 1 hour
  };

  private cacheVersion = 'v1';

  /**
   * Set appropriate cache headers for response
   */
  setCacheHeaders(response: Response, type: keyof CacheConfig): Response {
    const clonedResponse = response.clone();
    const headers = new Headers(clonedResponse.headers);
    
    const maxAge = this.config[type];
    
    headers.set('Cache-Control', `public, max-age=${maxAge}`);
    headers.set('CDN-Cache-Control', `max-age=${maxAge}`);
    headers.set('Vary', 'Accept-Encoding, Accept-Language');
    
    return new Response(clonedResponse.body, {
      status: clonedResponse.status,
      statusText: clonedResponse.statusText,
      headers
    });
  }

  /**
   * Invalidate cache entries matching a pattern
   */
  async invalidateCache(pattern: string): Promise<number> {
    try {
      const cache = await caches.open(this.cacheVersion);
      const keys = await cache.keys();
      
      let deletedCount = 0;
      const deletePromises: Promise<boolean>[] = [];
      
      for (const request of keys) {
        const url = new URL(request.url);
        if (url.pathname.includes(pattern) || pattern === '*') {
          deletePromises.push(cache.delete(request));
          deletedCount++;
        }
      }
      
      await Promise.all(deletePromises);
      console.log(`[EdgeCache] Invalidated ${deletedCount} entries matching: ${pattern}`);
      
      return deletedCount;
    } catch (error) {
      console.error('[EdgeCache] Invalidation failed:', error);
      return 0;
    }
  }

  /**
   * Preload critical resources in background
   */
  async warmCache(): Promise<void> {
    const criticalAssets = [
      '/logo.svg',
      '/manifest.json',
      '/locales/en/common.json',
      '/locales/es/common.json',
      '/locales/de/common.json'
    ];

    try {
      const cache = await caches.open(this.cacheVersion);
      const fetchPromises = criticalAssets.map(async (asset) => {
        try {
          const response = await fetch(asset);
          if (response.ok) {
            await cache.put(asset, response);
          }
        } catch (err) {
          console.warn(`[EdgeCache] Failed to warm cache for ${asset}:`, err);
        }
      });

      await Promise.allSettled(fetchPromises);
      console.log('[EdgeCache] Cache warming completed');
    } catch (error) {
      console.error('[EdgeCache] Cache warming failed:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    size: number;
    entryCount: number;
    hitRate?: number;
  }> {
    try {
      if (!('storage' in navigator && 'estimate' in navigator.storage)) {
        return { size: 0, entryCount: 0 };
      }

      const estimate = await navigator.storage.estimate();
      const cache = await caches.open(this.cacheVersion);
      const keys = await cache.keys();

      return {
        size: estimate.usage || 0,
        entryCount: keys.length,
      };
    } catch (error) {
      console.error('[EdgeCache] Failed to get cache stats:', error);
      return { size: 0, entryCount: 0 };
    }
  }

  /**
   * Clear all cache
   */
  async clearCache(): Promise<boolean> {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      console.log('[EdgeCache] All caches cleared');
      return true;
    } catch (error) {
      console.error('[EdgeCache] Failed to clear cache:', error);
      return false;
    }
  }

  /**
   * Determine cache type from URL
   */
  getCacheType(url: string): keyof CacheConfig {
    const urlObj = new URL(url, window.location.origin);
    const pathname = urlObj.pathname;

    // Static assets
    if (pathname.match(/\.(jpg|jpeg|png|gif|svg|webp|woff2?|ttf|eot)$/i)) {
      return 'staticAssets';
    }

    // API responses
    if (pathname.startsWith('/api/') || urlObj.hostname.includes('supabase')) {
      return 'apiResponses';
    }

    // User content
    if (pathname.includes('/confessions') || pathname.includes('/comments')) {
      return 'userContent';
    }

    // Default to public pages
    return 'publicPages';
  }
}

// Export singleton instance
export const edgeCacheManager = new EdgeCacheManager();
