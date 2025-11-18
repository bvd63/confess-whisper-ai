/**
 * Sentry Client Initialization
 * Error tracking with user context and tags
 */
import { env } from '@/lib/env';

type SentrySeverityLevel = import('@sentry/react').SeverityLevel;

let sentryInitialized = false;
let sentryModule: typeof import('@sentry/react') | null = null;
let sentryLoadPromise: Promise<typeof import('@sentry/react')> | null = null;

export interface SentryUserContext {
  userId?: string;
  plan?: string;
  locale?: string;
}

async function loadSentrySdk(): Promise<typeof import('@sentry/react')> {
  if (sentryModule) {
    return sentryModule;
  }

  if (!sentryLoadPromise) {
    sentryLoadPromise = import('@sentry/react').then((mod) => {
      sentryModule = mod;
      return mod;
    });
  }

  return sentryLoadPromise;
}

/**
 * Initialize Sentry client (browser-only)
 */
export async function initSentry(): Promise<void> {
  // Guard: Only run in browser
  if (typeof window === 'undefined') {
    return;
  }

  if (!env.isProd) {
    return;
  }

  // Guard: Only initialize once
  if (sentryInitialized) {
    return;
  }

  // Guard: Only initialize if DSN is configured
  const dsn = env.client.sentryDsn;
  if (!dsn) {
    if (env.isDev) {
      console.warn('[Sentry] DSN not configured - skipping initialization');
    }
    return;
  }

  try {
    const Sentry = await loadSentrySdk();
    Sentry.init({
      dsn,
      environment: env.isProd ? 'production' : 'development',
      enabled: env.isProd, // Only enable in production
      tracesSampleRate: env.isProd ? 0.1 : 1.0,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
      beforeSend(event) {
        // Filter out certain errors in development
        if (env.isDev) {
          // Skip chunk loading errors in dev
          if (event.exception?.values?.[0]?.value?.includes('ChunkLoadError')) {
            return null;
          }
        }
        return event;
      },
    });

    sentryInitialized = true;
    console.info('[Sentry] Initialized successfully');
  } catch (error) {
    console.error('[Sentry] Initialization failed:', error);
  }
}

/**
 * Set user context for Sentry
 */
export function setSentryUser(context: SentryUserContext): void {
  if (!sentryInitialized || !sentryModule) return;

  try {
    sentryModule.setUser({
      id: context.userId,
    });

    // Set tags for filtering
    if (context.plan) {
      sentryModule.setTag('plan', context.plan);
    }
    if (context.locale) {
      sentryModule.setTag('locale', context.locale);
    }
  } catch (error) {
    console.error('[Sentry] Failed to set user context:', error);
  }
}

/**
 * Set current route tag
 */
export function setSentryRoute(route: string): void {
  if (!sentryInitialized || !sentryModule) return;

  try {
    sentryModule.setTag('route', route);
  } catch (error) {
    console.error('[Sentry] Failed to set route:', error);
  }
}

/**
 * Capture an error manually
 */
export function captureSentryError(error: Error, context?: Record<string, any>): void {
  if (!sentryInitialized) {
    console.error('[Sentry not initialized]', error, context);
    return;
  }

  if (!sentryModule) {
    console.error('[Sentry] SDK not loaded');
    return;
  }

  try {
    sentryModule.captureException(error, {
      extra: context,
    });
  } catch (err) {
    console.error('[Sentry] Failed to capture error:', err);
  }
}

/**
 * Capture a message manually
 */
export function captureSentryMessage(message: string, level: SentrySeverityLevel = 'info'): void {
  if (!sentryInitialized || !sentryModule) return;

  try {
    sentryModule.captureMessage(message, level);
  } catch (error) {
    console.error('[Sentry] Failed to capture message:', error);
  }
}
