/**
 * Centralized Logging Utility with Sentry Integration
 * 
 * Replaces console.log with structured logging that:
 * - Shows in console during development
 * - Sends to Sentry in production for tracking
 * - Supports different log levels (debug, info, warn, error)
 */

import { captureSentryMessage, captureSentryError } from '@/lib/sentry';
import type { AppEnv } from '@/lib/env';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

export type LoggerEnv = Pick<AppEnv, 'isDev' | 'isProd'>;

export interface Logger {
  debug: (message: string, context?: LogContext) => void;
  info: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext) => void;
  error: (message: string, error?: Error | unknown, context?: LogContext) => void;
  performance: (metric: string, value: number, context?: LogContext) => void;
  feature: (feature: string, enabled: boolean, context?: LogContext) => void;
  api: (method: string, endpoint: string, status?: number, context?: LogContext) => void;
  cache: (operation: string, key: string, hit?: boolean, context?: LogContext) => void;
}

function resolveRuntimeEnv(): LoggerEnv {
  const nodeEnv = typeof process !== 'undefined' ? process.env?.NODE_ENV : undefined;
  const mode = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.MODE : nodeEnv;
  return {
    isDev: mode === 'development' || (!mode && nodeEnv !== 'production'),
    isProd: mode === 'production',
  };
}

export function createLogger(envConfig: LoggerEnv): Logger {
  function log(level: LogLevel, message: string, context?: LogContext): void {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

    if (envConfig.isDev) {
      const logFn = level === 'error' ? console.error :
                    level === 'warn' ? console.warn :
                    console.log;

      if (context) {
        logFn(`${prefix} ${message}`, context);
      } else {
        logFn(`${prefix} ${message}`);
      }
    }

    if (envConfig.isProd) {
      if (level === 'error' && context?.error instanceof Error) {
        captureSentryError(context.error, { message, ...context });
      } else if (level === 'warn' || level === 'error') {
        captureSentryMessage(message, level === 'error' ? 'error' : 'warning');
      }
    }
  }

  const logDebug = (message: string, context?: LogContext): void => {
    if (envConfig.isDev) {
      log('debug', message, context);
    }
  };

  const logInfo = (message: string, context?: LogContext): void => {
    log('info', message, context);
  };

  const logWarn = (message: string, context?: LogContext): void => {
    log('warn', message, context);
  };

  const logError = (message: string, error?: Error | unknown, context?: LogContext): void => {
    const errorContext = error instanceof Error 
      ? { error, stack: error.stack, ...context }
      : { error, ...context };
    log('error', message, errorContext);
  };

  const logPerformance = (metric: string, value: number, context?: LogContext): void => {
    logDebug(`📊 ${metric}: ${value.toFixed(2)}ms`, context);
  };

  const logFeature = (feature: string, enabled: boolean, context?: LogContext): void => {
    logDebug(`🚩 Feature "${feature}": ${enabled ? 'enabled' : 'disabled'}`, context);
  };

  const logAPI = (method: string, endpoint: string, status?: number, context?: LogContext): void => {
    const statusEmoji = status && status >= 200 && status < 300 ? '✅' :
                        status && status >= 400 ? '❌' : '🔄';
    logDebug(`${statusEmoji} ${method} ${endpoint}${status ? ` (${status})` : ''}`, context);
  };

  const logCache = (operation: string, key: string, hit: boolean = true, context?: LogContext): void => {
    const emoji = hit ? '✅' : '❌';
    logDebug(`${emoji} Cache ${operation}: ${key}`, context);
  };

  return {
    debug: logDebug,
    info: logInfo,
    warn: logWarn,
    error: logError,
    performance: logPerformance,
    feature: logFeature,
    api: logAPI,
    cache: logCache,
  };
}
let activeLogger = createLogger(resolveRuntimeEnv());

export function configureLogger(envConfig: LoggerEnv) {
  activeLogger = createLogger(envConfig);
}

export const logDebug = (message: string, context?: LogContext): void => {
  activeLogger.debug(message, context);
};

export const logInfo = (message: string, context?: LogContext): void => {
  activeLogger.info(message, context);
};

export const logWarn = (message: string, context?: LogContext): void => {
  activeLogger.warn(message, context);
};

export const logError = (message: string, error?: Error | unknown, context?: LogContext): void => {
  activeLogger.error(message, error, context);
};

export const logPerformance = (metric: string, value: number, context?: LogContext): void => {
  activeLogger.performance(metric, value, context);
};

export const logFeature = (feature: string, enabled: boolean, context?: LogContext): void => {
  activeLogger.feature(feature, enabled, context);
};

export const logAPI = (method: string, endpoint: string, status?: number, context?: LogContext): void => {
  activeLogger.api(method, endpoint, status, context);
};

export const logCache = (operation: string, key: string, hit: boolean = true, context?: LogContext): void => {
  activeLogger.cache(operation, key, hit, context);
};

export const logger: Logger = {
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
