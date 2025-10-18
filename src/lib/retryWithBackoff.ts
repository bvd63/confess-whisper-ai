import { observability } from './observability';

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableErrors?: string[];
  onRetry?: (error: Error, attempt: number) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryableErrors: ['NETWORK_ERROR', 'TIMEOUT', 'SERVICE_UNAVAILABLE', '429'],
  onRetry: () => {},
};

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error;
  
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      observability.debug(`Executing attempt ${attempt + 1}/${opts.maxRetries + 1}`);
      
      const result = await fn();
      
      if (attempt > 0) {
        observability.info(`Retry succeeded on attempt ${attempt + 1}`, {
          metadata: { attempt },
        });
      }
      
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check if error is retryable
      const isRetryable = opts.retryableErrors.some(
        (errType) => lastError.message.includes(errType)
      );
      
      if (!isRetryable || attempt === opts.maxRetries) {
        observability.error(
          `Operation failed after ${attempt + 1} attempts`,
          lastError,
          { metadata: { attempts: attempt + 1 } }
        );
        throw lastError;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        opts.initialDelay * Math.pow(opts.backoffMultiplier, attempt),
        opts.maxDelay
      );
      
      observability.warn(
        `Retry attempt ${attempt + 1} failed, retrying in ${delay}ms`,
        {
          metadata: {
            error: lastError.message,
            attempt: attempt + 1,
            delay,
          },
        }
      );
      
      opts.onRetry(lastError, attempt + 1);
      
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

// Specialized retry for network requests
export async function retryNetworkRequest<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  return retryWithBackoff(fn, {
    maxRetries: 3,
    initialDelay: 500,
    maxDelay: 5000,
    retryableErrors: ['NETWORK_ERROR', 'TIMEOUT', 'Failed to fetch', '429', '503', '504'],
    ...options,
  });
}

// Idempotency key generator for POST requests
export function generateIdempotencyKey(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

// Idempotency cache
const idempotencyCache = new Map<string, { result: any; timestamp: number }>();
const IDEMPOTENCY_TTL = 24 * 60 * 60 * 1000; // 24 hours

export async function withIdempotency<T>(
  key: string,
  fn: () => Promise<T>
): Promise<T> {
  // Check cache
  const cached = idempotencyCache.get(key);
  if (cached && Date.now() - cached.timestamp < IDEMPOTENCY_TTL) {
    observability.info('Idempotency cache hit', { metadata: { key } });
    return cached.result;
  }
  
  // Execute function
  const result = await fn();
  
  // Store in cache
  idempotencyCache.set(key, {
    result,
    timestamp: Date.now(),
  });
  
  // Cleanup old entries periodically
  if (idempotencyCache.size > 1000) {
    const now = Date.now();
    for (const [k, v] of idempotencyCache.entries()) {
      if (now - v.timestamp > IDEMPOTENCY_TTL) {
        idempotencyCache.delete(k);
      }
    }
  }
  
  return result;
}
