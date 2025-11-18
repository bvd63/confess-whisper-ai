import { useOfflineQueueState } from '@/contexts/OfflineQueueContext';

export const useOfflineQueue = () => {
  return useOfflineQueueState();
};
