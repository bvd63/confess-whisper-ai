// Query batching to reduce database round-trips

interface BatchRequest<T> {
  resolve: (value: T) => void;
  reject: (error: any) => void;
}

class QueryBatcher {
  private batches: Map<string, BatchRequest<any>[]> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private readonly BATCH_DELAY = 10; // 10ms window to collect requests

  batch<T>(
    key: string,
    fetcher: (ids: string[]) => Promise<Map<string, T>>
  ): (id: string) => Promise<T> {
    return (id: string) => {
      return new Promise<T>((resolve, reject) => {
        // Add to batch
        const batch = this.batches.get(key) || [];
        batch.push({ resolve, reject });
        this.batches.set(key, batch);

        // Clear existing timer
        const existingTimer = this.timers.get(key);
        if (existingTimer) clearTimeout(existingTimer);

        // Set new timer to execute batch
        const timer = setTimeout(async () => {
          const requests = this.batches.get(key) || [];
          this.batches.delete(key);
          this.timers.delete(key);

          if (requests.length === 0) return;

          try {
            // Extract all IDs (in this simple version, assume id is embedded)
            // You may need to adjust based on actual usage
            const ids = Array.from(new Set(requests.map((_, idx) => `id_${idx}`)));
            const results = await fetcher(ids);

            // Resolve all requests
            requests.forEach((req, idx) => {
              const result = results.get(`id_${idx}`);
              if (result !== undefined) {
                req.resolve(result);
              } else {
                req.reject(new Error('Not found in batch'));
              }
            });
          } catch (error) {
            requests.forEach(req => req.reject(error));
          }
        }, this.BATCH_DELAY);

        this.timers.set(key, timer);
      });
    };
  }
}

export const queryBatcher = new QueryBatcher();
