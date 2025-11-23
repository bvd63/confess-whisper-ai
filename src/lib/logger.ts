/**
 * Centralized Logging Utility with Sentry Integration
 * 
 * Replaces console.log with structured logging that:
 * - Shows in console during development
 * - Sends to Sentry in production for tracking
 * - Supports different log levels (debug, info, warn, error)
 */

import { captureSentryMessage, captureSentryError } from '@/lib/sentry';
import { env } from '@/lib/env';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

/**
 * Core logging function
 */
function log(level: LogLevel, message: string, context?: LogContext): void {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

  // Always log to console in development
  if (env.isDev) {
    const logFn = level === 'error' ? console.error :
            level === 'warn' ? console.warn :
            level === 'info' ? console.info :
            console.debug;
    
    if (context) {
      logFn(`${prefix} ${message}`, context);
    } else {
      logFn(`${prefix} ${message}`);
    }
  }

  // Send to Sentry in production (info and above)
  if (env.isProd) {
    if (level === 'error' && context?.error instanceof Error) {
      captureSentryError(context.error, { message, ...context });
    } else if (level === 'warn' || level === 'error') {
      captureSentryMessage(message, level === 'error' ? 'error' : 'warning');
    }
    // Skip debug/info in production to reduce noise
  }
}

/**
 * Debug level - for detailed debugging info
 * Only shows in development
 */
export function logDebug(message: string, context?: LogContext): void {
  if (env.isDev) {
    log('debug', message, context);
  }
}

/**
 * Info level - for general informational messages
 * Shows in development, not sent to Sentry
 */
export function logInfo(message: string, context?: LogContext): void {
  log('info', message, context);
}

/**
 * Warning level - for non-critical issues
 * Shows in console and sends to Sentry
 */
export function logWarn(message: string, context?: LogContext): void {
  log('warn', message, context);
}

/**
 * Error level - for errors and exceptions
 * Shows in console and sends to Sentry
 */
export function logError(message: string, error?: Error | unknown, context?: LogContext): void {
  const errorContext = error instanceof Error 
    ? { error, stack: error.stack, ...context }
    : { error, ...context };
  
  log('error', message, errorContext);
}

/**
 * Performance logging helper
 */
export function logPerformance(metric: string, value: number, context?: LogContext): void {
  logDebug(`📊 ${metric}: ${value.toFixed(2)}ms`, context);
}

/**
 * Feature flag logging helper
 */
export function logFeature(feature: string, enabled: boolean, context?: LogContext): void {
  logDebug(`🚩 Feature "${feature}": ${enabled ? 'enabled' : 'disabled'}`, context);
}

/**
 * API call logging helper
 */
export function logAPI(method: string, endpoint: string, status?: number, context?: LogContext): void {
  const statusEmoji = status && status >= 200 && status < 300 ? '✅' : 
                      status && status >= 400 ? '❌' : '🔄';
  logDebug(`${statusEmoji} ${method} ${endpoint}${status ? ` (${status})` : ''}`, context);
}

/**
 * Cache operation logging helper
 */
export function logCache(operation: string, key: string, hit: boolean = true, context?: LogContext): void {
  const emoji = hit ? '✅' : '❌';
  logDebug(`${emoji} Cache ${operation}: ${key}`, context);
}

/**
 * Legacy console logging replacement
 * Use this to gradually migrate old console statements
 */
export const logger = {
  debug: logDebug,
  info: logInfo,
  warn: logWarn,
  error: logError,
  performance: logPerformance,
  feature: logFeature,
  api: logAPI,
  cache: logCache,
};

export default logger;
