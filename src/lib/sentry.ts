/**
 * Sentry Client Initialization
 * Error tracking with user context and tags
 */
import * as Sentry from '@sentry/react';
import { env } from '@/lib/env';

let sentryInitialized = false;

export interface SentryUserContext {
  userId?: string;
  plan?: string;
  locale?: string;
}

/**
 * Initialize Sentry client (browser-only)
 */
export function initSentry(): void {
  // Guard: Only run in browser
  if (typeof window === 'undefined') {
    return;
  }

  // Guard: Only initialize once
  if (sentryInitialized) {
    return;
  }

  // Guard: Only initialize if DSN is configured
  const dsn = env.client.sentryDsn;
  if (!dsn) {
    console.log('[Sentry] DSN not configured - skipping initialization');
    return;
  }

  try {
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
    console.log('[Sentry] Initialized successfully');
  } catch (error) {
    console.error('[Sentry] Initialization failed:', error);
  }
}

/**
 * Set user context for Sentry
 */
export function setSentryUser(context: SentryUserContext): void {
  if (!sentryInitialized) return;

  try {
    Sentry.setUser({
      id: context.userId,
    });

    // Set tags for filtering
    if (context.plan) {
      Sentry.setTag('plan', context.plan);
    }
    if (context.locale) {
      Sentry.setTag('locale', context.locale);
    }
  } catch (error) {
    console.error('[Sentry] Failed to set user context:', error);
  }
}

/**
 * Set current route tag
 */
export function setSentryRoute(route: string): void {
  if (!sentryInitialized) return;

  try {
    Sentry.setTag('route', route);
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

  try {
    Sentry.captureException(error, {
      extra: context,
    });
  } catch (err) {
    console.error('[Sentry] Failed to capture error:', err);
  }
}

/**
 * Capture a message manually
 */
export function captureSentryMessage(message: string, level: Sentry.SeverityLevel = 'info'): void {
  if (!sentryInitialized) return;

  try {
    Sentry.captureMessage(message, level);
  } catch (error) {
    console.error('[Sentry] Failed to capture message:', error);
  }
}
