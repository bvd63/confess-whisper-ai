import OneSignal from 'react-onesignal';
import { supabase } from '@/integrations/supabase/client';

/**
 * Link authenticated user to OneSignal
 * Call this after user login with their userId
 */
export async function linkOneSignalUser(userId?: string): Promise<void> {
  try {
    const os = (window as any).OneSignal || OneSignal;

    if (!userId) {
      console.info('[OneSignal] No userId provided -> skipping login()');
      return;
    }

    try {
      await os.login(userId);
      console.log('[OneSignal] ✅ User logged in:', userId);
      
      // Save player ID to database after login
      await savePlayerIdToDB(userId);
    } catch (e) {
      console.warn('[OneSignal] login skipped/failed:', e);
    }
  } catch (error) {
    console.error('[OneSignal] linkOneSignalUser error:', error);
  }
}

/**
 * Request push notification permission and subscribe user
 */
export async function requestPushPermission(): Promise<boolean> {
  try {
    const os = (window as any).OneSignal || OneSignal;

    // Check current permission
    const perm = await os.Notifications.permission;
    console.log('[OneSignal] Current permission:', perm);

    if (perm === 'denied') {
      console.log('[OneSignal] Permission denied by user');
      return false;
    }

    // Request permission if needed
    if (perm === 'default') {
      console.log('[OneSignal] Requesting permission...');
      const granted = await os.Notifications.requestPermission();
      console.log('[OneSignal] Permission granted:', granted);
      if (!granted) return false;
    }

    // Subscribe user
    console.log('[OneSignal] Subscribing user via optIn()...');
    await os.User.PushSubscription.optIn();

    // Wait for playerId with retry logic
    let playerId = await os.User.PushSubscription.id;
    console.log('[OneSignal] Initial playerId check:', playerId);

    for (let i = 0; i < 6 && !playerId; i++) {
      await new Promise(r => setTimeout(r, 500));
      playerId = await os.User.PushSubscription.id;
      console.log(`[OneSignal] Retry ${i + 1}/6 - playerId:`, playerId);
    }

    if (playerId) {
      console.log('[OneSignal] ✅ Subscribed successfully - playerId:', playerId);
      return true;
    } else {
      console.error('[OneSignal] ❌ Failed to obtain playerId after retries');
      return false;
    }
  } catch (error) {
    console.error('[OneSignal] requestPushPermission error:', error);
    return false;
  }
}

/**
 * Save OneSignal player ID to database
 */
export async function savePlayerIdToDB(userId: string): Promise<void> {
  try {
    const os = (window as any).OneSignal || OneSignal;
    const playerId = await os.User.PushSubscription.id;
    
    if (!playerId) {
      console.log('[OneSignal] No playerId to save yet');
      return;
    }

    const { error } = await supabase
      .from('user_push_tokens')
      .upsert(
        { 
          user_id: userId, 
          provider: 'onesignal', 
          token: playerId 
        },
        { onConflict: 'user_id,provider' }
      );

    if (error) {
      console.error('[OneSignal] Failed to save token to DB:', error);
    } else {
      console.log('[OneSignal] ✅ Token saved to DB:', playerId);
    }
  } catch (e) {
    console.error('[OneSignal] savePlayerIdToDB exception:', e);
  }
}

/**
 * Check if push notifications are fully enabled
 */
export async function isPushEnabled(): Promise<boolean> {
  try {
    const os = (window as any).OneSignal || OneSignal;
    const permission = Notification.permission;
    const optedIn = await os.User.PushSubscription.optedIn;
    const playerId = await os.User.PushSubscription.id;
    
    return permission === 'granted' && optedIn === true && !!playerId;
  } catch {
    return false;
  }
}

/**
 * Get detailed push notification status
 */
export async function getPushStatus(): Promise<{
  permission: NotificationPermission;
  optedIn: boolean;
  playerId: string | null;
  isEnabled: boolean;
}> {
  try {
    const os = (window as any).OneSignal || OneSignal;
    const permission = Notification.permission;
    const optedIn = await os.User.PushSubscription.optedIn;
    const playerId = await os.User.PushSubscription.id;
    const isEnabled = permission === 'granted' && optedIn === true && !!playerId;
    
    return { permission, optedIn, playerId, isEnabled };
  } catch {
    return {
      permission: 'default',
      optedIn: false,
      playerId: null,
      isEnabled: false
    };
  }
}

/**
 * Disable push notifications
 */
export async function disablePush(userId: string): Promise<void> {
  try {
    const os = (window as any).OneSignal || OneSignal;
    await os.User.PushSubscription.optOut();
    
    // Remove token from database
    await supabase
      .from('user_push_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('provider', 'onesignal');

    console.log('[OneSignal] ✅ Push disabled and token removed');
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

/**
 * Diagnostic tool for development
 */
export async function logPushDiagnostics(): Promise<void> {
  if (import.meta.env.PROD) return;
  
  console.log('=== Push Notification Diagnostics ===');
  console.log('OneSignal App ID:', import.meta.env.VITE_ONESIGNAL_APP_ID ? 'Configured' : 'MISSING');
  console.log('Browser permission:', Notification.permission);
  console.log('window.OneSignal:', (window as any).OneSignal ? 'Available' : 'Not available');
  
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.getRegistration('/');
    console.log('Service Worker:', registration?.active ? '✅ Active' : '❌ Not active');
    console.log('SW scope:', registration?.scope);
  }
  
  try {
    const status = await getPushStatus();
    console.table(status);
  } catch (error) {
    console.error('[OneSignal] Diagnostic error:', error);
  }
  console.log('=====================================');
}
