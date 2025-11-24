/**
 * Type-safe Supabase query wrapper
 * Ensures all Supabase queries have proper error handling and typing
 */

import { SupabaseClient, PostgrestError } from '@supabase/supabase-js';
import { logError, logWarn } from '@/lib/logger';

export interface QueryResult<T> {
  data: T | null;
  error: PostgrestError | null;
  isLoading: boolean;
}

export interface MutationResult<T> {
  data: T | null;
  error: PostgrestError | string | null;
}

/**
 * Wrapper for safe Supabase queries with automatic error logging
 */
export async function safeQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: PostgrestError | null }>,
  context: string,
): Promise<QueryResult<T>> {
  try {
    const { data, error } = await queryFn();

    if (error) {
      logError(`[Query] ${context}: ${error.message}`, { 
        code: error.code, 
        context,
        details: error.details,
      });
      return { data: null, error, isLoading: false };
    }

    return { data, error: null, isLoading: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logError(`[Query] ${context}: Unexpected error - ${message}`, { context });
    return { 
      data: null, 
      error: { message, code: 'UNKNOWN' } as PostgrestError, 
      isLoading: false 
    };
  }
}

/**
 * Wrapper for safe Supabase mutations with automatic error logging
 */
export async function safeMutation<T>(
  mutationFn: () => Promise<{ data: T | null; error: PostgrestError | null }>,
  context: string,
): Promise<MutationResult<T>> {
  try {
    const { data, error } = await mutationFn();

    if (error) {
      logError(`[Mutation] ${context}: ${error.message}`, {
        code: error.code,
        context,
        details: error.details,
      });
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logError(`[Mutation] ${context}: Unexpected error - ${message}`, { context });
    return { data: null, error: message };
  }
}

/**
 * Type-safe batch query wrapper
 */
export async function safeBatchQuery<T>(
  queryFn: () => Promise<{ data: T[] | null; error: PostgrestError | null }>,
  context: string,
  fallback: T[] = [],
): Promise<QueryResult<T[]>> {
  const result = await safeQuery(queryFn, context);
  return {
    ...result,
    data: result.data ?? fallback,
  };
}

/**
 * Retry logic for transient failures
 */
export async function queryWithRetry<T>(
  queryFn: () => Promise<{ data: T | null; error: PostgrestError | null }>,
  context: string,
  maxRetries: number = 3,
  delayMs: number = 1000,
): Promise<QueryResult<T>> {
  let lastError: PostgrestError | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const { data, error } = await queryFn();

    if (!error) {
      return { data, error: null, isLoading: false };
    }

    lastError = error;

    // Only retry on transient errors (timeout, connection, rate limit)
    if (!['PGRST116', 'PGRST301', '429'].includes(error.code || '')) {
      logError(`[Query] ${context}: Non-retryable error - ${error.message}`, {
        code: error.code,
        attempt,
      });
      return { data: null, error, isLoading: false };
    }

    if (attempt < maxRetries) {
      logWarn(`[Query] ${context}: Attempt ${attempt} failed, retrying...`, {
        code: error.code,
        delayMs,
      });
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }
  }

  logError(`[Query] ${context}: Failed after ${maxRetries} retries`, {
    code: lastError?.code,
  });

  return {
    data: null,
    error: lastError ?? { message: 'Max retries exceeded', code: 'RETRY_EXCEEDED' } as PostgrestError,
    isLoading: false,
  };
}
