/**
 * OneSignal Push Notifications Integration
 * Browser-only initialization with environment validation
 */
import { env } from '@/lib/env';

let oneSignalInitialized = false;

/**
 * Initialize OneSignal SDK (browser-only)
 * Must be called from client-side code only
 */
export async function initOneSignal(): Promise<void> {
  // Guard: Only run in browser
  if (typeof window === 'undefined') {
    console.warn('[OneSignal] Skipping initialization - not in browser context');
    return;
  }

  // Guard: Only initialize once
  if (oneSignalInitialized) {
    console.log('[OneSignal] Already initialized');
    return;
  }

  try {
    const appId = env.client.oneSignalAppId;
    
    if (!appId) {
      console.error('[OneSignal] App ID not configured');
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
    console.log('[OneSignal] Initialized successfully');
  } catch (error) {
    console.error('[OneSignal] Initialization failed:', error);
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
    console.error('[OneSignal] Permission request failed:', error);
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
    console.log('[OneSignal] User ID set:', userId);
  } catch (error) {
    console.error('[OneSignal] Failed to set user ID:', error);
  }
}
