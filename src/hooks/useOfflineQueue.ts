import { useState, useCallback, useEffect } from 'react';
import { useNetworkStatus } from './useNetworkStatus';
import { logError } from '@/lib/logger';

interface QueueItem {
  id: string;
  action: () => Promise<unknown>;
  retries: number;
  timestamp: number;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

export const useOfflineQueue = () => {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { isOnline } = useNetworkStatus();

  const addToQueue = useCallback((action: () => Promise<unknown>) => {
    const item: QueueItem = {
      id: crypto.randomUUID(),
      action,
      retries: 0,
      timestamp: Date.now(),
    };
    setQueue(prev => [...prev, item]);
  }, []);

  const processQueue = useCallback(async () => {
    if (isProcessing || queue.length === 0 || !isOnline) return;

    setIsProcessing(true);

    while (queue.length > 0) {
      const item = queue[0];

      try {
        await item.action();
        // Success - remove from queue
        setQueue(prev => prev.slice(1));
      } catch (error) {
        logError('Queue item failed', error as Error);
        
        if (item.retries < MAX_RETRIES) {
          // Retry with exponential backoff
          await new Promise(resolve => 
            setTimeout(resolve, RETRY_DELAY * Math.pow(2, item.retries))
          );
          setQueue(prev => {
            const updated = [...prev];
            updated[0] = { ...item, retries: item.retries + 1 };
            return updated;
          });
        } else {
          // Max retries reached - remove from queue
          setQueue(prev => prev.slice(1));
        }
      }
    }

    setIsProcessing(false);
  }, [queue, isProcessing, isOnline]);

  // Process queue when online
  useEffect(() => {
    if (isOnline && queue.length > 0) {
      processQueue();
    }
  }, [isOnline, queue.length, processQueue]);

  return {
    addToQueue,
    queueLength: queue.length,
    isProcessing,
  };
};
