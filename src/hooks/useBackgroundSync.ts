import { useEffect } from 'react';
import { offlineQueue } from '@/lib/offlineQueue';
import { persistenceManager } from '@/lib/persistenceManager';
import { logInfo } from '@/lib/logger';

/**
 * Hook for background sync when app regains focus
 * Handles syncing queued operations and refreshing data
 */
export const useBackgroundSync = () => {
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        logInfo('🔄 App regained focus, starting background sync');
        
        // Process offline queue
        if (navigator.onLine) {
          await offlineQueue.processQueue();
        }

        // Trigger data refresh events
        window.dispatchEvent(new Event('app-focus-sync'));
      }
    };

    const handleOnline = async () => {
      logInfo('🌐 Network connection restored, syncing data');
      await offlineQueue.processQueue();
      window.dispatchEvent(new Event('network-restored'));
    };

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);

    // Initial sync if app just loaded
    if (document.visibilityState === 'visible' && navigator.onLine) {
      offlineQueue.processQueue();
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
    };
  }, []);
};
