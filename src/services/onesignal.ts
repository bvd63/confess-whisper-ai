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

interface OneSignalNotifications {
  requestPermission: () => Promise<boolean | 'granted' | 'denied' | 'default'>;
  isPushSupported: () => Promise<boolean>;
  permission: Promise<boolean | 'granted' | 'denied' | 'default'> | boolean | 'granted' | 'denied' | 'default';
}

interface OneSignalPushSubscription {
  id: Promise<string | null> | string | null;
}

interface OneSignalUser {
  addTag?: (key: string, value: string) => Promise<void>;
  PushSubscription: OneSignalPushSubscription;
}

interface OneSignalSDK {
  init: (config: Record<string, unknown>) => Promise<void>;
  login: (userId: string) => Promise<void>;
  Notifications: OneSignalNotifications;
  User: OneSignalUser;
}

declare global {
  interface Window {
    OneSignal?: OneSignalSDK;
  }
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
    if (!window.OneSignal) {
      const script = document.createElement('script');
      script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
      script.defer = true;
      document.head.appendChild(script);

      await new Promise((resolve) => {
        script.onload = resolve;
      });
    }

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
    const permission = await window.OneSignal.Notifications.requestPermission();
    return permission === true || permission === 'granted';
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
    const isPushSupported = await window.OneSignal.Notifications.isPushSupported();
    const permission = await window.OneSignal.Notifications.permission;
    if (typeof permission === 'string') {
      return isPushSupported && permission === 'granted';
    }
    return isPushSupported && permission === true;
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
    const subscription = await window.OneSignal.User.PushSubscription.id;
    return subscription;
  } catch {
    return null;
  }
};

/**
 * Save OneSignal player ID to user profile
 */
export const savePlayerIdToProfile = async (userId: string, playerId: string): Promise<void> => {
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    
    const { error } = await supabase
      .from('profiles')
      .update({ onesignal_player_id: playerId })
      .eq('user_id', userId);

    if (error) {
      if (import.meta.env.DEV) {
        console.error('[OneSignal] Failed to save player ID:', error);
      }
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[OneSignal] Failed to save player ID:', error);
    }
  }
};

/**
 * Test helper: reset initialization flag between vitest runs
 */
export const __resetOneSignalState = (): void => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITEST) {
    isInitialized = false;
  }
};
