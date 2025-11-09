/**
 * OneSignal Push Notification Service
 * Handles web push notifications initialization and management
 */

let isInitialized = false;

export interface NotificationPreferences {
  enabled: boolean;
  confessionApproved: boolean;
  aiResponse: boolean;
  streakCompleted: boolean;
}

/**
 * Initialize OneSignal SDK
 */
export const initializeOneSignal = async (): Promise<boolean> => {
  if (typeof window === 'undefined' || isInitialized) {
    return isInitialized;
  }

  const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;
  
  if (!appId) {
    if (import.meta.env.DEV) {
      console.warn('[OneSignal] App ID not configured');
    }
    return false;
  }

  try {
    // @ts-ignore - OneSignal global
    if (!window.OneSignal) {
      const script = document.createElement('script');
      script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
      script.defer = true;
      document.head.appendChild(script);

      await new Promise((resolve) => {
        script.onload = resolve;
      });
    }

    // @ts-ignore
    await window.OneSignal.init({
      appId,
      serviceWorkerPath: '/OneSignalSDKWorker.js',
      serviceWorkerParam: { scope: '/' },
      allowLocalhostAsSecureOrigin: true,
    });

    isInitialized = true;
    return true;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[OneSignal] Initialization failed:', error);
    }
    return false;
  }
};

/**
 * Request push notification permission
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!isInitialized) {
    const initialized = await initializeOneSignal();
    if (!initialized) return false;
  }

  try {
    // @ts-ignore
    const permission = await window.OneSignal.Notifications.requestPermission();
    return permission === 'granted';
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[OneSignal] Permission request failed:', error);
    }
    return false;
  }
};

/**
 * Get current notification permission status
 */
export const getNotificationPermission = (): NotificationPermission => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'default';
  }
  return Notification.permission;
};

/**
 * Check if push notifications are enabled
 */
export const isPushEnabled = async (): Promise<boolean> => {
  if (!isInitialized) return false;
  
  try {
    // @ts-ignore
    const isPushSupported = await window.OneSignal.Notifications.isPushSupported();
    // @ts-ignore
    const permission = await window.OneSignal.Notifications.permission;
    return isPushSupported && permission === 'granted';
  } catch {
    return false;
  }
};

/**
 * Set external user ID for OneSignal
 */
export const setOneSignalUserId = async (userId: string): Promise<void> => {
  if (!isInitialized) {
    await initializeOneSignal();
  }

  try {
    // @ts-ignore
    await window.OneSignal.login(userId);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[OneSignal] Failed to set user ID:', error);
    }
  }
};

/**
 * Send a tag to OneSignal for user segmentation
 */
export const sendOneSignalTag = async (key: string, value: string): Promise<void> => {
  if (!isInitialized) return;

  try {
    // @ts-ignore
    await window.OneSignal.User.addTag(key, value);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[OneSignal] Failed to send tag:', error);
    }
  }
};

/**
 * Get OneSignal player ID
 */
export const getOneSignalPlayerId = async (): Promise<string | null> => {
  if (!isInitialized) return null;

  try {
    // @ts-ignore
    const subscription = await window.OneSignal.User.PushSubscription.id;
    return subscription;
  } catch {
    return null;
  }
};
