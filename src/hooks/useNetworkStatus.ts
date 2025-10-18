import { useState, useEffect } from 'react';
import { offlineQueue } from '@/lib/offlineQueue';

/**
 * Hook for monitoring network status and managing offline queue
 */
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queuedOperations, setQueuedOperations] = useState(0);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Process queued operations
      offlineQueue.processQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    // Update queued operations count periodically
    const updateQueue = () => {
      setQueuedOperations(offlineQueue.getQueueLength());
    };

    const intervalId = setInterval(updateQueue, 1000);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    updateQueue();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(intervalId);
    };
  }, []);

  return { isOnline, queuedOperations };
};
