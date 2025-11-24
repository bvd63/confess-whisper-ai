/**
 * Unified Error Handling & Logging
 * Centralized error management across the application
 */

import type { APIError, APIErrorCode } from '@/types/api';
import { API_ERROR_CODES, ERROR_STATUS_CODES } from '@/types/api';

/**
 * Application error class with structured logging
 */
export class AppError extends Error {
  public readonly code: APIErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;
  public readonly timestamp: number;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    code: APIErrorCode = API_ERROR_CODES.INTERNAL_ERROR,
    options?: {
      details?: Record<string, unknown>;
      context?: Record<string, unknown>;
    }
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = ERROR_STATUS_CODES[code];
    this.details = options?.details;
    this.timestamp = Date.now();
    this.context = options?.context;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  toJSON(): APIError {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      ...(this.details && { details: this.details }),
    };
  }
}

/**
 * Validation error
 */
export class ValidationError extends AppError {
  constructor(
    message: string,
    details?: Record<string, unknown>,
    context?: Record<string, unknown>
  ) {
    super(message, API_ERROR_CODES.VALIDATION_ERROR, { details, context });
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed', details?: Record<string, unknown>) {
    super(message, API_ERROR_CODES.AUTHENTICATION_REQUIRED, { details });
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * Authorization error
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied', details?: Record<string, unknown>) {
    super(message, API_ERROR_CODES.FORBIDDEN, { details });
    this.name = 'AuthorizationError';
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

/**
 * Not found error
 */
export class NotFoundError extends AppError {
  constructor(resource: string, details?: Record<string, unknown>) {
    super(`${resource} not found`, API_ERROR_CODES.NOT_FOUND, {
      details: { resource, ...details },
    });
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends AppError {
  public readonly retryAfter?: number;

  constructor(message: string = 'Rate limit exceeded', retryAfter?: number) {
    super(message, API_ERROR_CODES.RATE_LIMITED, {
      details: retryAfter ? { retryAfter } : undefined,
    });
    this.retryAfter = retryAfter;
    this.name = 'RateLimitError';
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/**
 * Payment error
 */
export class PaymentError extends AppError {
  constructor(message: string = 'Payment failed', details?: Record<string, unknown>) {
    super(message, API_ERROR_CODES.PAYMENT_FAILED, { details });
    this.name = 'PaymentError';
    Object.setPrototypeOf(this, PaymentError.prototype);
  }
}

/**
 * Database error
 */
export class DatabaseError extends AppError {
  constructor(
    message: string = 'Database operation failed',
    details?: Record<string, unknown>,
    context?: Record<string, unknown>
  ) {
    super(message, API_ERROR_CODES.DATABASE_ERROR, { details, context });
    this.name = 'DatabaseError';
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

/**
 * External service error
 */
export class ExternalServiceError extends AppError {
  public readonly service: string;

  constructor(service: string, message: string = `${service} service error`, details?: Record<string, unknown>) {
    super(message, API_ERROR_CODES.EXTERNAL_SERVICE_ERROR, {
      details: { service, ...details },
    });
    this.service = service;
    this.name = 'ExternalServiceError';
    Object.setPrototypeOf(this, ExternalServiceError.prototype);
  }
}

/**
 * Error logger with structured logging
 */
export interface LogContext {
  userId?: string;
  endpoint?: string;
  method?: string;
  requestId?: string;
  [key: string]: unknown;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Structured logger
 */
export class Logger {
  private context: LogContext;

  constructor(context: LogContext = {}) {
    this.context = context;
  }

  private formatLog(level: LogLevel, message: string, data?: unknown): Record<string, unknown> {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.context,
      ...(data && typeof data === 'object' ? data : { data }),
    };
  }

  debug(message: string, data?: unknown): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(this.formatLog('debug', message, data));
    }
  }

  info(message: string, data?: unknown): void {
    console.log(this.formatLog('info', message, data));
  }

  warn(message: string, data?: unknown): void {
    console.warn(this.formatLog('warn', message, data));
  }

  error(message: string, error?: Error | unknown, data?: unknown): void {
    const errorData =
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
          }
        : error;

    const mergedData =
      typeof errorData === 'object' && typeof data === 'object'
        ? { ...errorData, ...data }
        : { errorData, data };

    console.error(this.formatLog('error', message, mergedData));
  }

  /**
   * Log app error with full context
   */
  logAppError(error: AppError): void {
    this.error(error.message, error, {
      code: error.code,
      statusCode: error.statusCode,
      details: error.details,
      appContext: error.context,
    });
  }

  /**
   * Create child logger with additional context
   */
  createChild(additionalContext: LogContext): Logger {
    return new Logger({ ...this.context, ...additionalContext });
  }
}

/**
 * Global logger instance
 */
export const logger = new Logger();

/**
 * Error handler for API routes
 */
export function handleAPIError(error: unknown): { statusCode: number; body: Record<string, unknown> } {
  if (error instanceof AppError) {
    logger.logAppError(error);
    return {
      statusCode: error.statusCode,
      body: {
        success: false,
        error: error.toJSON(),
        timestamp: error.timestamp,
      },
    };
  }

  if (error instanceof Error) {
    logger.error('Unhandled error', error);
    const appError = new AppError('An unexpected error occurred', API_ERROR_CODES.INTERNAL_ERROR, {
      context: {
        originalError: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
    });
    return {
      statusCode: appError.statusCode,
      body: {
        success: false,
        error: appError.toJSON(),
        timestamp: appError.timestamp,
      },
    };
  }

  logger.error('Unknown error type', undefined, { error });
  const appError = new AppError('An unexpected error occurred', API_ERROR_CODES.INTERNAL_ERROR);
  return {
    statusCode: appError.statusCode,
    body: {
      success: false,
      error: appError.toJSON(),
      timestamp: appError.timestamp,
    },
  };
}

/**
 * Async error wrapper for route handlers
 */
export function asyncHandler<T>(fn: (args: unknown) => Promise<T>): (args: unknown) => Promise<void> {
  return async (args: unknown) => {
    try {
      await fn(args);
    } catch (error) {
      const { statusCode, body } = handleAPIError(error);
      console.error(`API Error (${statusCode}):`, body);
    }
  };
}

/**
 * Error recovery strategies
 */
export interface RetryOptions {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors?: (error: Error) => boolean;
}

const defaultRetryOptions: RetryOptions = {
  maxAttempts: 3,
  initialDelayMs: 100,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

/**
 * Retry with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts = { ...defaultRetryOptions, ...options };
  let lastError: Error | undefined;
  let delay = opts.initialDelayMs;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      const shouldRetry = !opts.retryableErrors || opts.retryableErrors(lastError);
      if (!shouldRetry || attempt === opts.maxAttempts) {
        throw lastError;
      }

      logger.warn(`Retry attempt ${attempt}/${opts.maxAttempts}`, {
        error: lastError.message,
        delayMs: delay,
      });

      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelayMs);
    }
  }

  throw lastError || new Error('Unknown retry error');
}

/**
 * Gradual degradation for non-critical operations
 */
export async function withFallback<T>(
  primary: () => Promise<T>,
  fallback: () => Promise<T> | T,
  log?: Logger
): Promise<T> {
  try {
    return await primary();
  } catch (error) {
    if (log) {
      log.warn('Primary operation failed, using fallback', { error });
    }
    return await fallback();
  }
}

/**
 * Circuit breaker for external service calls
 */
export class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime?: number;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(private failureThreshold = 5, private resetTimeoutMs = 60000) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - (this.lastFailureTime || 0) > this.resetTimeoutMs) {
        this.state = 'half-open';
      } else {
        throw new ExternalServiceError('CircuitBreaker', 'Circuit breaker is open');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = 'closed';
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'open';
    }
  }

  getState(): string {
    return this.state;
  }

  reset(): void {
    this.failureCount = 0;
    this.state = 'closed';
  }
}
