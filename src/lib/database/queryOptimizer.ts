/**
 * Database Query Optimization Utilities
 * Provides batching, cursor pagination, and query optimization helpers
 */
import { logError, logWarn } from '@/lib/logger';

/**
 * Query Batcher - Deduplicates and batches similar queries
 */
class QueryBatcher {
  private queue: Map<string, Promise<unknown>> = new Map();
  private timeout: number = 50; // ms

  /**
   * Batch similar queries together
   */
  async batchQuery<T>(
    key: string,
    queryFn: () => Promise<T>
  ): Promise<T> {
    // If identical query is already running, return the same promise
    if (this.queue.has(key)) {
      return this.queue.get(key) as Promise<T>;
    }

    const promise = queryFn();
    this.queue.set(key, promise);

    // Clear from queue after resolution
    promise.finally(() => {
      setTimeout(() => this.queue.delete(key), this.timeout);
    });

    return promise;
  }

  /**
   * Clear all pending queries
   */
  clear(): void {
    this.queue.clear();
  }

  /**
   * Get queue size
   */
  size(): number {
    return this.queue.size;
  }
}

// Export singleton instance
export const queryBatcher = new QueryBatcher();

/**
 * Cursor Pagination Helper
 * More efficient than offset pagination for large datasets
 */
export interface CursorPaginationOptions {
  pageSize?: number;
  cursor?: string;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface CursorPaginationResult<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * Build cursor-based pagination query
 */
export function buildCursorPagination<T extends Record<string, unknown>>(
  items: T[],
  options: CursorPaginationOptions
): CursorPaginationResult<T> {
  const pageSize = options.pageSize || 20;
  const orderBy = options.orderBy || 'created_at';

  // Take one extra to check if there are more results
  const hasMore = items.length > pageSize;
  const data = hasMore ? items.slice(0, pageSize) : items;

  // Generate next cursor from last item
  let nextCursor: string | null = null;
  if (hasMore && data.length > 0) {
    const lastItem = data[data.length - 1];
    nextCursor = btoa(JSON.stringify({
      [orderBy]: lastItem[orderBy],
      id: lastItem.id,
    }));
  }

  return {
    data,
    nextCursor,
    hasMore,
  };
}

/**
 * Parse cursor to get pagination values
 */
export function parseCursor(cursor: string | null): Record<string, unknown> | null {
  if (!cursor) return null;

  try {
    return JSON.parse(atob(cursor));
  } catch (error) {
    logError('[QueryOptimizer] Failed to parse cursor', error as Error);
    return null;
  }
}

/**
 * Query performance monitoring
 */
class QueryPerformanceMonitor {
  private queries: Map<string, number[]> = new Map();
  private maxSamples = 100;

  /**
   * Record query execution time
   */
  recordQuery(queryName: string, duration: number): void {
    if (!this.queries.has(queryName)) {
      this.queries.set(queryName, []);
    }

    const samples = this.queries.get(queryName)!;
    samples.push(duration);

    // Keep only recent samples
    if (samples.length > this.maxSamples) {
      samples.shift();
    }
  }

  /**
   * Get query statistics
   */
  getStats(queryName: string): {
    count: number;
    avg: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
  } | null {
    const samples = this.queries.get(queryName);
    if (!samples || samples.length === 0) return null;

    const sorted = [...samples].sort((a, b) => a - b);
    const count = sorted.length;
    const sum = sorted.reduce((acc, val) => acc + val, 0);

    return {
      count,
      avg: sum / count,
      min: sorted[0],
      max: sorted[count - 1],
      p50: sorted[Math.floor(count * 0.5)],
      p95: sorted[Math.floor(count * 0.95)],
      p99: sorted[Math.floor(count * 0.99)],
    };
  }

  /**
   * Get all slow queries (p95 > threshold)
   */
  getSlowQueries(thresholdMs: number = 100): Array<{
    name: string;
    p95: number;
  }> {
    const slow: Array<{ name: string; p95: number }> = [];

    for (const [name] of this.queries) {
      const stats = this.getStats(name);
      if (stats && stats.p95 > thresholdMs) {
        slow.push({ name, p95: stats.p95 });
      }
    }

    return slow.sort((a, b) => b.p95 - a.p95);
  }

  /**
   * Clear all statistics
   */
  clear(): void {
    this.queries.clear();
  }
}

export const queryMonitor = new QueryPerformanceMonitor();

/**
 * Measure query execution time
 */
export async function measureQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const start = performance.now();

  try {
    const result = await queryFn();
    const duration = performance.now() - start;
    queryMonitor.recordQuery(queryName, duration);

    if (duration > 1000) {
      logWarn(`[QueryOptimizer] Slow query detected: ${queryName} (${duration.toFixed(2)}ms)`);
    }

    return result;
  } catch (error) {
    const duration = performance.now() - start;
    queryMonitor.recordQuery(queryName, duration);
    throw error;
  }
}
