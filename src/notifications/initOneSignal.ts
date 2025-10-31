import OneSignal from 'react-onesignal';

let isInitialized = false;

/**
 * Initialize OneSignal SDK once at app startup
 * Exposes OneSignal globally for debugging
 */
export async function initOneSignal(): Promise<void> {
  if (typeof window === 'undefined') return;

  // Prevent double initialization
  // @ts-ignore
  if ((window as any).__ONESIGNAL_INITED) { 
    isInitialized = true; 
    return; 
  }
  if (isInitialized) return;

  const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;
  console.log('[OneSignal] App ID detected:', appId ? 'Yes' : 'No');
  
  if (!appId) { 
    console.warn('[OneSignal] Missing App ID'); 
    return; 
  }

  try {
    await OneSignal.init({
      appId,
      serviceWorkerPath: '/OneSignalSDKWorker.js',
      serviceWorkerParam: { scope: '/' },
      allowLocalhostAsSecureOrigin: true,
    });

    // Expose OneSignal globally for debugging
    (window as any).OneSignal = OneSignal;

    isInitialized = true;
    // @ts-ignore
    (window as any).__ONESIGNAL_INITED = true;
    console.log('[OneSignal] ✅ SDK initialized and exposed on window.OneSignal');

    // Enable debug logs in development
    if (import.meta.env.DEV) {
      try {
        await OneSignal.Debug.setLogLevel('trace');
      } catch (e) { /* ignore if not available */ }
    }
  } catch (err) {
    console.error('[OneSignal] Init error:', err);
  }
}
