import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useCache } from './useCache';
import { useRequestDeduplication } from './useRequestDeduplication';
import { observability } from '@/lib/observability';
import { circuitBreakers } from '@/lib/circuitBreaker';
import { retryWithBackoff } from '@/lib/retryWithBackoff';
import { useCallback } from 'react';

interface OptimizedQueryOptions<T> extends Omit<UseQueryOptions<T>, 'queryFn'> {
  queryFn: () => Promise<T>;
  cacheKey?: string;
  cacheTTL?: number;
  useCircuitBreaker?: boolean;
  useRetry?: boolean;
  useDedupe?: boolean;
}

export function useOptimizedQuery<T>({
  queryKey,
  queryFn,
  cacheKey,
  cacheTTL = 5 * 60 * 1000,
  useCircuitBreaker = true,
  useRetry = true,
  useDedupe = true,
  ...options
}: OptimizedQueryOptions<T>) {
  const cache = useCache<T>(cacheKey || String(queryKey), { ttl: cacheTTL });
  const { deduplicate } = useRequestDeduplication();
  
  const optimizedQueryFn = useCallback(async () => {
    const requestId = observability.generateRequestId();
    const key = cacheKey || String(queryKey);
    
    observability.info('Query started', {
      requestId,
      metadata: { queryKey, cacheKey: key },
    });
    
    // Check cache first
    const cached = cache.get(key);
    if (cached) {
      observability.info('Cache hit', {
        requestId,
        metadata: { queryKey, cacheKey: key },
      });
      return cached;
    }
    
    // Wrap query function with optimizations
    let wrappedFn = queryFn;
    
    // Add deduplication
    if (useDedupe) {
      wrappedFn = () => deduplicate(key, queryFn);
    }
    
    // Add retry logic
    if (useRetry) {
      const retryFn = wrappedFn;
      wrappedFn = () => retryWithBackoff(retryFn, {
        maxRetries: 3,
        initialDelay: 1000,
        onRetry: (error, attempt) => {
          observability.warn(`Query retry attempt ${attempt}`, {
            requestId,
            metadata: { queryKey, error: error.message },
          });
        },
      });
    }
    
    // Add circuit breaker
    if (useCircuitBreaker) {
      const cbFn = wrappedFn;
      wrappedFn = () => circuitBreakers.supabase.execute(cbFn);
    }
    
    // Measure performance
    const result = await observability.measureAsync(
      `query_${String(queryKey)}`,
      wrappedFn,
      { queryKey: String(queryKey) }
    );
    
    // Cache result
    cache.set(key, result);
    
    observability.info('Query completed', {
      requestId,
      metadata: { queryKey, cached: false },
    });
    
    return result;
  }, [queryKey, queryFn, cacheKey, cache, useDedupe, useRetry, useCircuitBreaker, deduplicate]);
  
  return useQuery({
    queryKey,
    queryFn: optimizedQueryFn,
    staleTime: cacheTTL,
    gcTime: cacheTTL * 2,
    retry: false, // We handle retries ourselves
    ...options,
  });
}
