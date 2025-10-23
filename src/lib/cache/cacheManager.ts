/**
 * Advanced cache manager with LRU eviction, TTL, and offline queue
 */
interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
}

interface QueueItem {
  id: string;
  operation: () => Promise<any>;
  retryCount: number;
  maxRetries: number;
  timestamp: number;
}

class CacheManager {
  private cache: Map<string, CacheItem<any>> = new Map();
  private readonly MAX_CACHE_SIZE = 100;
  private offlineQueue: QueueItem[] = [];
  private isProcessingQueue = false;

  // TTL presets
  private readonly TTL_PRESETS = {
    USER_DATA: 5 * 60 * 1000, // 5 minutes
    CONFESSIONS: 2 * 60 * 1000, // 2 minutes
    STATIC: 60 * 60 * 1000, // 1 hour
    SHORT: 30 * 1000, // 30 seconds
  };

  /**
   * Get item from cache
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) return null;

    // Check if expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Update access count for LRU
    item.accessCount++;
    
    return item.data;
  }

  /**
   * Set item in cache
   */
  set<T>(key: string, data: T, ttlType: keyof typeof this.TTL_PRESETS = 'USER_DATA'): void {
    const ttl = this.TTL_PRESETS[ttlType];
    
    // Evict if cache is full
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.evictLRU();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      accessCount: 0,
    });
  }

  /**
   * Invalidate cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalidate by pattern
   */
  invalidatePattern(pattern: RegExp): void {
    Array.from(this.cache.keys()).forEach((key) => {
      if (pattern.test(key)) {
        this.cache.delete(key);
      }
    });
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * LRU eviction - remove least recently used item
   */
  private evictLRU(): void {
    let minAccessCount = Infinity;
    let lruKey: string | null = null;

    this.cache.forEach((item, key) => {
      if (item.accessCount < minAccessCount) {
        minAccessCount = item.accessCount;
        lruKey = key;
      }
    });

    if (lruKey) {
      this.cache.delete(lruKey);
    }
  }

  /**
   * Add operation to offline queue
   */
  async queueOfflineOperation(
    id: string,
    operation: () => Promise<any>,
    maxRetries: number = 3
  ): Promise<void> {
    this.offlineQueue.push({
      id,
      operation,
      retryCount: 0,
      maxRetries,
      timestamp: Date.now(),
    });

    // Try to process immediately if online
    if (navigator.onLine && !this.isProcessingQueue) {
      await this.processQueue();
    }
  }

  /**
   * Process offline queue with retry logic
   */
  async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.offlineQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.offlineQueue.length > 0) {
      const item = this.offlineQueue[0];

      try {
        await item.operation();
        // Success - remove from queue
        this.offlineQueue.shift();
      } catch (error) {
        item.retryCount++;
        
        if (item.retryCount >= item.maxRetries) {
          // Max retries reached - remove from queue
          console.error(`Failed operation after ${item.maxRetries} retries:`, error);
          this.offlineQueue.shift();
        } else {
          // Exponential backoff
          const delay = Math.min(1000 * Math.pow(2, item.retryCount), 30000);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Get queue status
   */
  getQueueStatus(): { pending: number; items: QueueItem[] } {
    return {
      pending: this.offlineQueue.length,
      items: [...this.offlineQueue],
    };
  }

  /**
   * Background sync when idle
   */
  startBackgroundSync(): void {
    // Check if online
    window.addEventListener('online', () => {
      this.processQueue();
    });

    // Periodic sync when idle
    if ('requestIdleCallback' in window) {
      const scheduleSync = () => {
        requestIdleCallback(
          () => {
            if (navigator.onLine) {
              this.processQueue();
            }
            scheduleSync();
          },
          { timeout: 60000 }
        );
      };
      scheduleSync();
    }
  }

  /**
   * Cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE,
      queueLength: this.offlineQueue.length,
      keys: Array.from(this.cache.keys()),
    };
  }
}

export const cacheManager = new CacheManager();

// Start background sync
if (typeof window !== 'undefined') {
  cacheManager.startBackgroundSync();
}
