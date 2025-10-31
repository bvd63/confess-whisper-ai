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
      try {
        await OneSignal.init({ 
          appId,
          allowLocalhostAsSecureOrigin: true,
          serviceWorkerParam: { scope: '/' },
          serviceWorkerPath: '/OneSignalSDKWorker.js'
        });
        isInitialized = true;
        
        // Enable debug logs
        try {
          await OneSignal.Debug.setLogLevel('trace');
        } catch (e) { /* ignore if not available */ }
        
        console.log('[OneSignal] Initialized');
        
        // Log current status
        try {
          const permission = await OneSignal.Notifications.permission;
          const optedIn = await OneSignal.User.PushSubscription.optedIn;
          const playerId = await OneSignal.User.PushSubscription.id;
          console.log('[OneSignal] Status - permission:', permission, 'optedIn:', optedIn, 'playerId:', playerId);
        } catch (e) { /* ignore status check errors */ }
      } catch (err: any) {
        const msg = err?.message || err?.value?.message || String(err);
        if (msg?.includes('SDK already initialized')) {
          // Treat as success and continue
          isInitialized = true;
          console.warn('[OneSignal] SDK already initialized, continuing');
        } else {
          console.error('[OneSignal] Init error:', err);
          return; // abort further steps on real init failure
        }
      }
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
 * Request push notification permission and subscribe user (v16 API)
 */
export async function requestPushPermission(): Promise<boolean> {
  console.log('[OneSignal] Requesting notification permission...');
  
  // Check if Service Worker is registered and active
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.getRegistration('/');
    console.log('[OneSignal] Service Worker registration:', registration?.active ? 'Active' : 'Not active', registration);
    
    if (!registration || !registration.active) {
      console.error('[OneSignal] Service Worker not ready - cannot subscribe to push');
      return false;
    }
  }
  
  try {
    // Check current permission using browser API
    const perm = Notification.permission;
    console.log('[OneSignal] Current permission:', perm);

    // If denied, show guidance
    if (perm === 'denied') {
      console.log('[OneSignal] Permission denied by user');
      return false;
    }

    // If default, request permission first
    if (perm === 'default') {
      console.log('[OneSignal] Requesting notification permission...');
      const granted = await OneSignal.Notifications.requestPermission();
      console.log('[OneSignal] Permission result:', granted);
      
      if (!granted) {
        return false;
      }
    }

    // Check if already subscribed
    const currentOptedIn = await OneSignal.User.PushSubscription.optedIn;
    const currentPlayerId = await OneSignal.User.PushSubscription.id;
    
    if (currentOptedIn && currentPlayerId) {
      console.log('[OneSignal] Already subscribed:', currentPlayerId);
      return true;
    }

    // Subscribe the user using optIn (v16 API)
    console.log('[OneSignal] Subscribing user...');
    try {
      await OneSignal.User.PushSubscription.optIn();
      console.log('[OneSignal] OptIn called, waiting for confirmation...');
      
      // Poll for subscription status with extended timeout - 10 seconds
      const maxAttempts = 30;
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise(r => setTimeout(r, 333));
        const optedIn = await OneSignal.User.PushSubscription.optedIn;
        const playerId = await OneSignal.User.PushSubscription.id;
        
        console.log(`[OneSignal] Waiting for subscription... (${i+1}/${maxAttempts}) optedIn: ${optedIn} playerId: ${playerId}`);
        
        if (optedIn && playerId) {
          console.log('[OneSignal] ✅ Subscription confirmed!', { playerId });
          return true;
        }
      }
      
      console.error('[OneSignal] ❌ Subscription timeout - opted in but no player ID assigned within 10s');
      console.error('[OneSignal] This usually means:');
      console.error('  1. Service Worker not properly registered');
      console.error('  2. Network request to OneSignal failed');
      console.error('  3. OneSignal App ID configuration issue');
      return false;
    } catch (error) {
      // Retry once on failure
      console.warn('[OneSignal] OptIn failed, retrying...', error);
      await new Promise(r => setTimeout(r, 600));
      try {
        await OneSignal.User.PushSubscription.optIn();
        console.log('[OneSignal] Retry OptIn called, waiting for confirmation...');
        
        // Poll again with extended timeout
        const maxAttempts = 30;
        for (let i = 0; i < maxAttempts; i++) {
          await new Promise(r => setTimeout(r, 333));
          const optedIn = await OneSignal.User.PushSubscription.optedIn;
          const playerId = await OneSignal.User.PushSubscription.id;
          
          console.log(`[OneSignal] Retry waiting... (${i+1}/${maxAttempts}) optedIn: ${optedIn} playerId: ${playerId}`);
          
          if (optedIn && playerId) {
            console.log('[OneSignal] ✅ Subscription confirmed on retry!', { playerId });
            return true;
          }
        }
        
        console.error('[OneSignal] ❌ Subscription timeout on retry');
        return false;
      } catch (retryError) {
        console.error('[OneSignal] OptIn retry failed:', retryError);
        return false;
      }
    }
  } catch (error) {
    console.error('[OneSignal] Permission request failed:', error);
    return false;
  }
}

/**
 * Check if push notifications are enabled (permission + optedIn + playerId)
 */
export async function isPushEnabled(): Promise<boolean> {
  try {
    if (!isInitialized) return false;
    const permission = Notification.permission;
    const optedIn = await OneSignal.User.PushSubscription.optedIn;
    const playerId = await OneSignal.User.PushSubscription.id;
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
    if (!isInitialized) {
      return {
        permission: 'default',
        optedIn: false,
        playerId: null,
        isEnabled: false
      };
    }
    const permission = Notification.permission;
    const optedIn = await OneSignal.User.PushSubscription.optedIn;
    const playerId = await OneSignal.User.PushSubscription.id;
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
 * Unsubscribe from push notifications (v16 API)
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

    console.log('[OneSignal] Push disabled (opted out)');
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
 * Diagnostic tool for development (debug status)
 */
export async function logPushDiagnostics(): Promise<void> {
  if (import.meta.env.PROD) return;
  
  console.log('=== Push Notification Diagnostics ===');
  console.log('OneSignal App ID:', import.meta.env.VITE_ONESIGNAL_APP_ID ? 'Configured' : 'MISSING');
  console.log('Browser permission:', Notification.permission);
  
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.getRegistration('/');
    console.log('Service Worker:', registration?.active ? '✅ Active' : '❌ Not active');
    console.log('SW scope:', registration?.scope);
  }
  
  try {
    const status = await getPushStatus();
    console.log('Push status:', status);
  } catch (error) {
    console.error('[OneSignal] Diagnostic error:', error);
  }
  console.log('=====================================');
}
