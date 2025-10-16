import { useState, useEffect } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RateLimitNotificationProps {
  onClose: () => void;
}

const RateLimitNotification = ({ onClose }: RateLimitNotificationProps) => {
  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md animate-slide-up">
      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-destructive mb-1">
              Prea multe cereri
            </h3>
            <p className="text-sm text-muted-foreground">
              Ai atins limita de cereri AI. Te rugăm să aștepți câteva momente înainte să încerci din nou.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0 hover:bg-destructive/20"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export const useRateLimitHandler = () => {
  const [showNotification, setShowNotification] = useState(false);
  const [lastRateLimitTime, setLastRateLimitTime] = useState<number>(0);

  const handleRateLimit = () => {
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
  };

  useEffect(() => {
    // Listen for rate limit events
    const handleRateLimitEvent = (event: CustomEvent) => {
      handleRateLimit();
    };

    window.addEventListener('ai-rate-limit', handleRateLimitEvent as EventListener);

    return () => {
      window.removeEventListener('ai-rate-limit', handleRateLimitEvent as EventListener);
    };
  }, [lastRateLimitTime]);

  const RateLimitUI = showNotification ? (
    <RateLimitNotification onClose={() => setShowNotification(false)} />
  ) : null;

  return { RateLimitUI, triggerRateLimit: handleRateLimit };
};

export default RateLimitNotification;
