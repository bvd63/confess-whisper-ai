import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export const useOffline = () => {
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );

  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true);
      toast.error('You are offline. Some features may be limited.');
    };

    const handleOnline = () => {
      setIsOffline(false);
      toast.success('You are back online!');
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return isOffline;
};
