/**
 * Type-safe API response wrapper
 * Ensures all API calls have consistent error handling and typing
 */

import { logError, logWarn } from '@/lib/logger';

export type ApiSuccess<T> = {
  success: true;
  data: T;
  status: number;
};

export type ApiFailure = {
  success: false;
  error: string;
  status: number;
  details?: Record<string, unknown>;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

/**
 * Check if response is successful
 */
export function isSuccess<T>(response: ApiResponse<T>): response is ApiSuccess<T> {
  return response.success === true;
}

/**
 * Check if response failed
 */
export function isFailure<T>(response: ApiResponse<T>): response is ApiFailure {
  return response.success === false;
}

/**
 * Wrap fetch call with type-safe error handling
 */
export async function fetchAPI<T = unknown>(
  url: string,
  options: RequestInit = {},
  context: string = 'API Call',
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      logError(
        `[${context}] HTTP ${response.status}: ${data?.message || 'Unknown error'}`,
        {
          url,
          status: response.status,
          details: data?.details,
        }
      );

      return {
        success: false,
        error: data?.message || `HTTP ${response.status}`,
        status: response.status,
        details: data?.details,
      };
    }

    return {
      success: true,
      data,
      status: response.status,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logError(`[${context}] Network error: ${message}`, { url });

    return {
      success: false,
      error: 'Network error: ' + message,
      status: 0,
    };
  }
}

/**
 * Wrap JSON response parsing with safe error handling
 */
export async function parseJSON<T>(response: Response, context: string): Promise<T | null> {
  try {
    return await response.json();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid JSON';
    logWarn(`[${context}] Failed to parse JSON: ${message}`, { context });
    return null;
  }
}

/**
 * Type-safe validator for API responses
 */
export function validateResponse<T>(
  data: unknown,
  validator: (data: unknown) => data is T,
  context: string,
): data is T {
  const isValid = validator(data);
  
  if (!isValid) {
    logError(`[${context}] Response validation failed`, { 
      type: typeof data,
      context,
    });
  }

  return isValid;
}

/**
 * Retry fetch with exponential backoff
 */
export async function fetchWithRetry<T = unknown>(
  url: string,
  options: RequestInit = {},
  maxRetries: number = 3,
  context: string = 'API Call',
): Promise<ApiResponse<T>> {
  let lastError: ApiFailure | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const response = await fetchAPI<T>(url, options, context);

    if (isSuccess(response)) {
      return response;
    }

    lastError = response;

    // Only retry on transient errors
    if (![408, 429, 500, 502, 503, 504].includes(response.status)) {
      return response;
    }

    if (attempt < maxRetries) {
      const delayMs = Math.pow(2, attempt - 1) * 1000;
      logWarn(
        `[${context}] Attempt ${attempt} failed (${response.status}), retrying in ${delayMs}ms...`,
        { context, attempt, status: response.status }
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return lastError ?? {
    success: false,
    error: 'Max retries exceeded',
    status: 0,
  };
}

/**
 * Helper to extract error message from various error formats
 */
export function extractErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null) {
    const obj = error as Record<string, unknown>;
    
    if (typeof obj.message === 'string') {
      return obj.message;
    }
    
    if (typeof obj.error === 'string') {
      return obj.error;
    }
  }

  return 'Unknown error occurred';
}
