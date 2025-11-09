/**
 * Hook to initialize OneSignal and manage push notifications
 */

import { useEffect } from 'react';
import { initializeOneSignal, setOneSignalUserId } from '@/services/onesignal';
import { useCurrentUser } from './useCurrentUser';

export const useOneSignalInit = () => {
  const { user } = useCurrentUser();

  useEffect(() => {
    const initPushNotifications = async () => {
      // Only initialize if OneSignal App ID is configured
      const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;
      if (!appId) return;

      try {
        const initialized = await initializeOneSignal();
        
        if (initialized && user?.id) {
          // Link user with OneSignal for targeted notifications
          await setOneSignalUserId(user.id);
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('[OneSignal] Initialization failed:', error);
        }
      }
    };

    // Initialize on mount with a slight delay to ensure DOM is ready
    const timer = setTimeout(initPushNotifications, 1000);

    return () => clearTimeout(timer);
  }, [user?.id]);
};
