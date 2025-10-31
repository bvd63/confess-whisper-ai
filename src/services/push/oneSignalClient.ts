import OneSignal from 'react-onesignal';
import { supabase } from '@/integrations/supabase/client';

let isInitialized = false;

/**
 * Initialize OneSignal SDK
 * Call this after user authentication
 */
export async function initOneSignal(userId?: string): Promise<void> {
  try {
    const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;
    
    if (!appId) {
      console.warn('[OneSignal] Missing App ID');
      return;
    }

    // Initialize only once
    if (!isInitialized) {
      await OneSignal.init({ 
        appId,
        allowLocalhostAsSecureOrigin: true,
        serviceWorkerParam: { scope: '/' },
        serviceWorkerPath: '/OneSignalSDKWorker.js'
      });
      isInitialized = true;
      console.log('[OneSignal] Initialized');
    }

    // If permission is already denied, don't try to login
    if (Notification.permission === 'denied') {
      console.log('[OneSignal] Notifications blocked by user');
      return;
    }

    // If user is authenticated, link their ID to OneSignal
    if (userId) {
      await OneSignal.login(userId);
      console.log('[OneSignal] User logged in:', userId);

      // Get the OneSignal player ID (subscription ID)
      const playerId = await OneSignal.User.PushSubscription.id;
      
      if (playerId) {
        // Store token in database
        const { error } = await supabase
          .from('user_push_tokens')
          .upsert({
            user_id: userId,
            provider: 'onesignal',
            token: playerId,
          }, {
            onConflict: 'user_id,provider'
          });

        if (error) {
          console.error('[OneSignal] Failed to save token:', error);
        } else {
          console.log('[OneSignal] Token saved:', playerId);
        }
      }
    } else {
      await OneSignal.logout();
      console.log('[OneSignal] User logged out');
    }
  } catch (error) {
    console.error('[OneSignal] Init error:', error);
  }
}

/**
 * Request push notification permission from user
 */
export async function requestPushPermission(): Promise<boolean> {
  try {
    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    const permission = await OneSignal.Notifications.requestPermission();
    console.log('[OneSignal] Permission result:', permission);
    
    return permission;
  } catch (error) {
    console.error('[OneSignal] Permission request failed:', error);
    return false;
  }
}

/**
 * Check if push notifications are enabled
 */
export async function isPushEnabled(): Promise<boolean> {
  try {
    if (!isInitialized) return false;
    const permission = Notification.permission;
    const optedIn = await OneSignal.Notifications.permission;
    return permission === 'granted' && optedIn;
  } catch {
    return false;
  }
}

/**
 * Opt out of push notifications
 */
export async function disablePush(userId: string): Promise<void> {
  try {
    await OneSignal.User.PushSubscription.optOut();
    
    // Remove token from database
    await supabase
      .from('user_push_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('provider', 'onesignal');

    console.log('[OneSignal] Push disabled');
  } catch (error) {
    console.error('[OneSignal] Failed to disable push:', error);
  }
}

/**
 * Send a test notification
 */
export async function sendTestNotification(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase.functions.invoke('send-push', {
      body: {
        userId,
        title: 'Test Notification 🔔',
        body: 'Push notifications are working correctly!',
        data: { type: 'test' }
      }
    });

    return !error;
  } catch {
    return false;
  }
}
