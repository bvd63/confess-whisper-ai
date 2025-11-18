import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  offlineQueue,
  OfflineQueueSnapshot,
  EnqueueMutationOptions,
  EnqueueMutationResult,
} from '@/lib/offlineQueue';

interface OfflineQueueContextValue extends OfflineQueueSnapshot {
  enqueue: <T>(options: EnqueueMutationOptions<T>) => Promise<EnqueueMutationResult<T>>;
}

const OfflineQueueContext = createContext<OfflineQueueContextValue | null>(null);

export const OfflineQueueProvider = ({ children }: { children: ReactNode }) => {
  const [snapshot, setSnapshot] = useState<OfflineQueueSnapshot>(offlineQueue.getSnapshot());

  useEffect(() => {
    const unsubscribe = offlineQueue.subscribe((nextSnapshot) => setSnapshot(nextSnapshot));
    return () => unsubscribe();
  }, []);

  const enqueue = useCallback(<T,>(options: EnqueueMutationOptions<T>) => offlineQueue.enqueueMutation(options), []);

  const value = useMemo(
    () => ({
      ...snapshot,
      enqueue,
    }),
    [snapshot, enqueue]
  );

  return <OfflineQueueContext.Provider value={value}>{children}</OfflineQueueContext.Provider>;
};

export const useOfflineQueueState = () => {
  const context = useContext(OfflineQueueContext);
  if (!context) {
    throw new Error('useOfflineQueueState must be used within OfflineQueueProvider');
  }
  return context;
};
