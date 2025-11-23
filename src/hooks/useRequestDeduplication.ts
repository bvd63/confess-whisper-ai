import { useRef, useCallback } from 'react';

interface PendingRequest {
  promise: Promise<unknown>;
  timestamp: number;
}

export const useRequestDeduplication = () => {
  const pendingRequests = useRef<Map<string, PendingRequest>>(new Map());
  const CACHE_DURATION = 5000; // 5 seconds

  const deduplicate = useCallback(
    async <T>(key: string, requestFn: () => Promise<T>): Promise<T> => {
      const now = Date.now();
      const pending = pendingRequests.current.get(key);

      // Return existing request if still valid
      if (pending && now - pending.timestamp < CACHE_DURATION) {
        return pending.promise;
      }

      // Create new request
      const promise = requestFn();
      pendingRequests.current.set(key, { promise, timestamp: now });

      // Clean up after completion
      promise
        .finally(() => {
          const current = pendingRequests.current.get(key);
          if (current && current.promise === promise) {
            pendingRequests.current.delete(key);
          }
        });

      return promise;
    },
    []
  );

  const clear = useCallback((key?: string) => {
    if (key) {
      pendingRequests.current.delete(key);
    } else {
      pendingRequests.current.clear();
    }
  }, []);

  return { deduplicate, clear };
};
