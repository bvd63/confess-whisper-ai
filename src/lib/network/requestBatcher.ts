/**
 * Request batcher with deduplication and retry logic
 */
interface BatchedRequest<T> {
  id: string;
  request: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
  retries: number;
  maxRetries: number;
}

class RequestBatcher {
  private queue: Map<string, BatchedRequest<any>> = new Map();
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly BATCH_DELAY = 50; // 50ms window
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff

  /**
   * Add request to batch queue with deduplication
   */
  async batch<T>(
    id: string,
    request: () => Promise<T>,
    maxRetries: number = this.MAX_RETRIES
  ): Promise<T> {
    // If request with same ID already exists, return existing promise
    const existing = this.queue.get(id);
    if (existing) {
      return new Promise((resolve, reject) => {
        const originalResolve = existing.resolve;
        const originalReject = existing.reject;
        existing.resolve = (value) => {
          originalResolve(value);
          resolve(value);
        };
        existing.reject = (error) => {
          originalReject(error);
          reject(error);
        };
      });
    }

    // Create new batched request
    return new Promise<T>((resolve, reject) => {
      this.queue.set(id, {
        id,
        request,
        resolve,
        reject,
        retries: 0,
        maxRetries,
      });

      // Schedule batch execution
      if (!this.batchTimeout) {
        this.batchTimeout = setTimeout(() => {
          this.executeBatch();
        }, this.BATCH_DELAY);
      }
    });
  }

  /**
   * Execute all queued requests in parallel
   */
  private async executeBatch() {
    const requests = Array.from(this.queue.values());
    this.queue.clear();
    this.batchTimeout = null;

    // Execute all requests in parallel
    await Promise.allSettled(
      requests.map(async (req) => {
        try {
          const result = await req.request();
          req.resolve(result);
        } catch (error) {
          await this.handleError(req, error);
        }
      })
    );
  }

  /**
   * Handle request error with retry logic
   */
  private async handleError(req: BatchedRequest<any>, error: any) {
    if (req.retries < req.maxRetries) {
      // Retry with exponential backoff
      const delay = this.RETRY_DELAYS[req.retries] || this.RETRY_DELAYS[this.RETRY_DELAYS.length - 1];
      
      await new Promise((resolve) => setTimeout(resolve, delay));
      
      req.retries++;
      
      try {
        const result = await req.request();
        req.resolve(result);
      } catch (retryError) {
        await this.handleError(req, retryError);
      }
    } else {
      // Max retries exceeded
      req.reject(error);
    }
  }

  /**
   * Cancel pending request
   */
  cancel(id: string) {
    const req = this.queue.get(id);
    if (req) {
      req.reject(new Error('Request cancelled'));
      this.queue.delete(id);
    }
  }

  /**
   * Cancel all pending requests
   */
  cancelAll() {
    this.queue.forEach((req) => {
      req.reject(new Error('All requests cancelled'));
    });
    this.queue.clear();
    
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
  }

  /**
   * Get pending requests count
   */
  getPendingCount(): number {
    return this.queue.size;
  }
}

export const requestBatcher = new RequestBatcher();

/**
 * Hook for automatic request cancellation on unmount
 */
export const useBatchedRequest = () => {
  const activeRequests = new Set<string>();

  const batch = async <T,>(
    id: string,
    request: () => Promise<T>,
    maxRetries?: number
  ): Promise<T> => {
    activeRequests.add(id);
    try {
      return await requestBatcher.batch(id, request, maxRetries);
    } finally {
      activeRequests.delete(id);
    }
  };

  const cleanup = () => {
    activeRequests.forEach((id) => {
      requestBatcher.cancel(id);
    });
    activeRequests.clear();
  };

  return { batch, cleanup };
};
