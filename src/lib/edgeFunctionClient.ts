import { supabase } from '@/integrations/supabase/client';
import { observability } from './observability';
import { circuitBreakers } from './circuitBreaker';

interface FunctionCallOptions {
  functionName: string;
  body?: any;
  useCircuitBreaker?: boolean;
  timeout?: number;
  retries?: number;
}

/**
 * Secure wrapper for Supabase function invocations
 * Adds: timeout, circuit breaker, retry logic, structured logging, performance tracking
 */
export async function invokeEdgeFunction<T = any>({
  functionName,
  body,
  useCircuitBreaker = true,
  timeout = 30000,
  retries = 2,
}: FunctionCallOptions): Promise<{ data: T | null; error: any }> {
  const requestId = observability.generateRequestId();
  
  observability.info(`Edge function call: ${functionName}`, {
    requestId,
    metadata: { functionName, bodySize: JSON.stringify(body || {}).length },
  });

  const callFunction = async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const { data, error } = await supabase.functions.invoke(functionName, {
        body,
      });

      clearTimeout(timeoutId);

      if (error) {
        observability.error(`Edge function error: ${functionName}`, error, {
          requestId,
          metadata: { functionName, errorCode: error.status },
        });
        
        // Handle specific error codes
        if (error.status === 429) {
          throw new Error('RATE_LIMIT_EXCEEDED');
        }
        if (error.status === 402) {
          throw new Error('PAYMENT_REQUIRED');
        }
        
        throw error;
      }

      observability.info(`Edge function success: ${functionName}`, {
        requestId,
        metadata: { functionName },
      });

      return { data, error: null };
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        observability.error(`Edge function timeout: ${functionName}`, error, {
          requestId,
          metadata: { functionName, timeout },
        });
        throw new Error('REQUEST_TIMEOUT');
      }
      
      throw error;
    }
  };

  // Retry logic
  let lastError: any;
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      if (useCircuitBreaker) {
        return await observability.measureAsync(
          `edge_function_${functionName}`,
          () => circuitBreakers.supabase.execute(callFunction),
          { functionName, attempt: attempt.toString() }
        );
      } else {
        return await observability.measureAsync(
          `edge_function_${functionName}`,
          callFunction,
          { functionName, attempt: attempt.toString() }
        );
      }
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on rate limit or payment errors
      if (error.message === 'RATE_LIMIT_EXCEEDED' || error.message === 'PAYMENT_REQUIRED') {
        return { data: null, error };
      }
      
      if (attempt <= retries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        observability.warn(`Retrying edge function: ${functionName}`, {
          requestId,
          metadata: { attempt, delay, error: error.message },
        });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  return { data: null, error: lastError };
}

/**
 * Rate-limited function call with client-side check
 */
export async function invokeWithRateLimit<T = any>(
  options: FunctionCallOptions
): Promise<{ data: T | null; error: any; rateLimited?: boolean }> {
  const { data, error } = await invokeEdgeFunction<T>(options);
  
  if (error?.message === 'RATE_LIMIT_EXCEEDED') {
    return { data: null, error, rateLimited: true };
  }
  
  return { data, error, rateLimited: false };
}
