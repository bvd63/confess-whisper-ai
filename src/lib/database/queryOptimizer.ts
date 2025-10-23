import { supabase } from '@/integrations/supabase/client';

interface QueryBatch {
  queries: Array<() => Promise<any>>;
  resolve: (results: any[]) => void;
}

/**
 * Query optimizer with batching, cursor pagination, and caching
 */
class QueryOptimizer {
  private batchQueue: QueryBatch[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly BATCH_WINDOW_MS = 50;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Add query to batch queue
   */
  async batchQuery<T>(
    key: string,
    queryFn: () => Promise<T>,
    cacheable: boolean = true
  ): Promise<T> {
    // Check cache first
    if (cacheable) {
      const cached = this.getFromCache(key);
      if (cached) return cached;
    }

    return new Promise((resolve, reject) => {
      const batch: QueryBatch = {
        queries: [queryFn],
        resolve: (results) => {
          const result = results[0];
          if (cacheable && result) {
            this.setCache(key, result);
          }
          resolve(result);
        },
      };

      this.batchQueue.push(batch);

      // Start batch timer if not already running
      if (!this.batchTimeout) {
        this.batchTimeout = setTimeout(() => {
          this.executeBatch();
        }, this.BATCH_WINDOW_MS);
      }
    });
  }

  /**
   * Execute all queued queries in parallel
   */
  private async executeBatch() {
    const batches = [...this.batchQueue];
    this.batchQueue = [];
    this.batchTimeout = null;

    // Execute all queries in parallel
    const allQueries = batches.flatMap((b) => b.queries);
    try {
      const results = await Promise.all(allQueries.map((q) => q()));
      
      // Resolve each batch
      let resultIndex = 0;
      batches.forEach((batch) => {
        const batchResults = results.slice(
          resultIndex,
          resultIndex + batch.queries.length
        );
        batch.resolve(batchResults);
        resultIndex += batch.queries.length;
      });
    } catch (error) {
      console.error('Batch query execution failed:', error);
      throw error;
    }
  }

  /**
   * Cursor-based pagination for better performance
   */
  async cursorPaginate<T>(
    table: string,
    options: {
      limit?: number;
      cursor?: string;
      orderBy?: string;
      orderDirection?: 'asc' | 'desc';
      filters?: Record<string, any>;
    } = {}
  ): Promise<{ data: T[]; nextCursor: string | null }> {
    const {
      limit = 20,
      cursor,
      orderBy = 'created_at',
      orderDirection = 'desc',
      filters = {},
    } = options;

    let query = supabase
      .from(table)
      .select('*')
      .order(orderBy, { ascending: orderDirection === 'asc' })
      .limit(limit + 1); // Fetch one extra to determine if there's more

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    // Apply cursor
    if (cursor) {
      query = query.gt(orderBy, cursor);
    }

    const { data, error } = await query;

    if (error) throw error;

    const hasMore = data.length > limit;
    const items = hasMore ? data.slice(0, limit) : data;
    const nextCursor = hasMore ? items[items.length - 1][orderBy] : null;

    return { data: items as T[], nextCursor };
  }

  /**
   * Partial field selection for reduced payload
   */
  selectFields<T>(table: string, fields: string[]): any {
    return supabase.from(table).select(fields.join(','));
  }

  /**
   * Cache management
   */
  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > this.CACHE_TTL_MS;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });

    // LRU: Remove oldest if cache exceeds 100 items
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  /**
   * Clear cache
   */
  clearCache(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Request deduplication
   */
  private pendingRequests: Map<string, Promise<any>> = new Map();

  async dedupe<T>(key: string, queryFn: () => Promise<T>): Promise<T> {
    // Return existing promise if already pending
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!;
    }

    // Create new promise
    const promise = queryFn().finally(() => {
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, promise);
    return promise;
  }
}

export const queryOptimizer = new QueryOptimizer();
