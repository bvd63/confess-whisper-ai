import OneSignal from 'react-onesignal';

let isInitialized = false;

/**
 * Initialize OneSignal SDK with explicit service worker registration
 * Call this from app entry point (does not auto-prompt)
 */
export async function initOneSignal(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (isInitialized) return;

  const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;
  if (!appId) {
    console.warn('[OneSignal] Missing App ID');
    return;
  }

  // Explicitly register the service worker first
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/OneSignalSDKWorker.js', { scope: '/' });
      await navigator.serviceWorker.ready;
      console.log('[OneSignal] Service worker registered and ready');
    } catch (err) {
      console.error('[OneSignal] Service worker registration failed:', err);
    }
  }

  // Initialize OneSignal SDK
  try {
    await OneSignal.init({
      appId,
      allowLocalhostAsSecureOrigin: true,
      serviceWorkerPath: '/OneSignalSDKWorker.js',
      serviceWorkerParam: { scope: '/' },
    });
    
    isInitialized = true;
    console.log('[OneSignal] SDK initialized');

    // Enable debug logs in development
    if (import.meta.env.DEV) {
      try {
        await OneSignal.Debug.setLogLevel('trace');
      } catch (e) { /* ignore if not available */ }
    }

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
      isInitialized = true;
      console.warn('[OneSignal] SDK already initialized');
    } else {
      console.error('[OneSignal] Init error:', err);
    }
  }
}

/**
 * Link authenticated user to OneSignal
 */
export async function loginOneSignalUser(userId: string): Promise<void> {
  if (!isInitialized) return;
  
  try {
    await OneSignal.login(userId);
    console.log('[OneSignal] User logged in:', userId);
  } catch (error) {
    console.error('[OneSignal] Login error:', error);
  }
}

/**
 * Unlink user from OneSignal
 */
export async function logoutOneSignalUser(): Promise<void> {
  if (!isInitialized) return;
  
  try {
    await OneSignal.logout();
    console.log('[OneSignal] User logged out');
  } catch (error) {
    console.error('[OneSignal] Logout error:', error);
  }
}
