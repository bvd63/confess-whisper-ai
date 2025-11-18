import { useState, useEffect } from 'react';
import { offlineQueue } from '@/lib/offlineQueue';
import { useOfflineQueueState } from '@/contexts/OfflineQueueContext';

/**
 * Hook for monitoring network status and managing offline queue
 */
const getInitialOnlineState = () => (typeof navigator === 'undefined' ? true : navigator.onLine);

export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(getInitialOnlineState);
  const queueState = useOfflineQueueState();

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleOnline = () => {
      setIsOnline(true);
      // Process queued operations
      offlineQueue.processQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOnline,
    queuedOperations: queueState.totalPending,
    pendingByScope: queueState.pendingByScope,
    lastSyncAt: queueState.lastSyncAt,
    lastEvent: queueState.lastEvent,
    enqueueOfflineMutation: queueState.enqueue,
  };
};
