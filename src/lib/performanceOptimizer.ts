/**
 * Performance optimization utilities for coin features
 */

// Debounce function for expensive operations
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Throttle function for rate-limited operations
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// Cache manager for API responses
class CacheManager {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private ttl: number = 60000; // 1 minute default TTL

  set(key: string, data: any, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now() + (ttl || this.ttl),
    });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.timestamp) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  clear(): void {
    this.cache.clear();
  }

  remove(key: string): void {
    this.cache.delete(key);
  }
}

export const cache = new CacheManager();

// Request deduplication for preventing duplicate API calls
class RequestDeduplicator {
  private pending: Map<string, Promise<any>> = new Map();

  async deduplicate<T>(key: string, fn: () => Promise<T>): Promise<T> {
    if (this.pending.has(key)) {
      return this.pending.get(key)!;
    }

    const promise = fn().finally(() => {
      this.pending.delete(key);
    });

    this.pending.set(key, promise);
    return promise;
  }
}

export const requestDeduplicator = new RequestDeduplicator();

// Optimized image loader
export const preloadImage = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
};

// Batch operations helper
export class BatchProcessor<T> {
  private queue: T[] = [];
  private timeout: NodeJS.Timeout | null = null;
  private batchSize: number;
  private delayMs: number;
  private processor: (items: T[]) => void;

  constructor(
    processor: (items: T[]) => void,
    batchSize: number = 10,
    delayMs: number = 100
  ) {
    this.processor = processor;
    this.batchSize = batchSize;
    this.delayMs = delayMs;
  }

  add(item: T): void {
    this.queue.push(item);

    if (this.queue.length >= this.batchSize) {
      this.flush();
    } else {
      this.scheduleFlush();
    }
  }

  private scheduleFlush(): void {
    if (this.timeout) clearTimeout(this.timeout);
    this.timeout = setTimeout(() => this.flush(), this.delayMs);
  }

  private flush(): void {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }

    if (this.queue.length > 0) {
      const items = this.queue.splice(0, this.queue.length);
      this.processor(items);
    }
  }
}

// Memory-efficient lazy loader
export const createLazyLoader = <T>(
  loader: () => Promise<T>
): (() => Promise<T>) => {
  let promise: Promise<T> | null = null;

  return () => {
    if (!promise) {
      promise = loader();
    }
    return promise;
  };
};
