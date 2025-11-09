/**
 * OneSignal Push Notifications Integration
 * Browser-only initialization with environment validation
 */
import { env } from '@/lib/env';
import { logDebug, logError, logWarn } from '@/lib/logger';

let oneSignalInitialized = false;

/**
 * Initialize OneSignal SDK (browser-only)
 * Must be called from client-side code only
 */
export async function initOneSignal(): Promise<void> {
  // Guard: Only run in browser
  if (typeof window === 'undefined') {
    logWarn('[OneSignal] Skipping initialization - not in browser context');
    return;
  }

  // Guard: Only initialize once
  if (oneSignalInitialized) {
    logDebug('[OneSignal] Already initialized');
    return;
  }

  try {
    const appId = env.client.oneSignalAppId;
    
    if (!appId) {
      logError('[OneSignal] App ID not configured');
      return;
    }

    // Dynamically load OneSignal SDK
    const OneSignalDeferred = await import('react-onesignal');
    const OneSignal = OneSignalDeferred.default;

    await OneSignal.init({
      appId,
      allowLocalhostAsSecureOrigin: env.isDev,
    });

    oneSignalInitialized = true;
    logDebug('[OneSignal] Initialized successfully');
  } catch (error) {
    logError('[OneSignal] Initialization failed', error as Error);
  }
}

/**
 * Request push notification permission
 * Call this from UI (e.g., banner, settings page)
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  
  if (!oneSignalInitialized) {
    await initOneSignal();
  }

  try {
    const OneSignalDeferred = await import('react-onesignal');
    const OneSignal = OneSignalDeferred.default;
    
    const permission = await OneSignal.Notifications.requestPermission();
    return permission;
  } catch (error) {
    logError('[OneSignal] Permission request failed', error as Error);
    return false;
  }
}

/**
 * Check if user has granted notification permission
 */
export async function hasNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    const OneSignalDeferred = await import('react-onesignal');
    const OneSignal = OneSignalDeferred.default;
    
    const permission = await OneSignal.Notifications.permission;
    return permission;
  } catch {
    return false;
  }
}

/**
 * Set user ID for targeted notifications
 */
export async function setOneSignalUserId(userId: string): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const OneSignalDeferred = await import('react-onesignal');
    const OneSignal = OneSignalDeferred.default;
    
    await OneSignal.login(userId);
    logDebug('[OneSignal] User ID set', { userId });
  } catch (error) {
    logError('[OneSignal] Failed to set user ID', error as Error);
  }
}
