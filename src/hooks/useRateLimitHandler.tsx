import { useState, useEffect, useCallback } from 'react';
import RateLimitNotification from '@/components/RateLimitNotification';

export const useRateLimitHandler = () => {
  const [showNotification, setShowNotification] = useState(false);
  const [lastRateLimitTime, setLastRateLimitTime] = useState<number>(0);

  const handleRateLimit = useCallback(() => {
    const now = Date.now();

    // Only show notification once per minute
    if (now - lastRateLimitTime > 60000) {
      setShowNotification(true);
      setLastRateLimitTime(now);

      // Auto-hide after 5 seconds
      setTimeout(() => {
        setShowNotification(false);
      }, 5000);
    }
  }, [lastRateLimitTime]);

  useEffect(() => {
    const handleRateLimitEvent = () => {
      handleRateLimit();
    };

    window.addEventListener('ai-rate-limit', handleRateLimitEvent);

    return () => {
      window.removeEventListener('ai-rate-limit', handleRateLimitEvent);
    };
  }, [handleRateLimit]);

  const RateLimitUI = showNotification ? (
    <RateLimitNotification onClose={() => setShowNotification(false)} />
  ) : null;

  return { RateLimitUI, triggerRateLimit: handleRateLimit };
};
