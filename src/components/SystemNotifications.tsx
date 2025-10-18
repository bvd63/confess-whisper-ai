import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useLanguage } from '@/contexts/LanguageContext';
import { observability } from '@/lib/observability';
import { circuitBreakers } from '@/lib/circuitBreaker';
import { AlertCircle, CheckCircle2, Info, Wifi, WifiOff } from 'lucide-react';

interface SystemNotification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  timestamp: number;
  autoClose?: boolean;
}

export const SystemNotifications = () => {
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      addNotification({
        type: 'success',
        message: t.system_network_error,
        autoClose: true,
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      addNotification({
        type: 'error',
        message: t.system_network_error,
        autoClose: false,
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [t]);

  const addNotification = (notification: Omit<SystemNotification, 'id' | 'timestamp'>) => {
    const id = `${Date.now()}-${Math.random()}`;
    const newNotification: SystemNotification = {
      ...notification,
      id,
      timestamp: Date.now(),
    };

    setNotifications(prev => [...prev, newNotification]);

    if (notification.autoClose !== false) {
      setTimeout(() => {
        removeNotification(id);
      }, 5000);
    }

    observability.info('System notification shown', {
      metadata: { notification: newNotification },
    });
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Monitor circuit breaker states
  useEffect(() => {
    const interval = setInterval(() => {
      const states = {
        supabase: circuitBreakers.supabase.getState(),
        ai: circuitBreakers.ai.getState(),
        storage: circuitBreakers.storage.getState(),
      };

      Object.entries(states).forEach(([service, state]) => {
        if (state === 'OPEN') {
          const existingNotification = notifications.find(
            n => n.message.includes(service)
          );
          
          if (!existingNotification) {
            addNotification({
              type: 'warning',
              message: t.system_service_unavailable,
              autoClose: false,
            });
          }
        }
      });
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [notifications, t]);

  if (notifications.length === 0 && isOnline) {
    return null;
  }

  return (
    <div className="fixed top-20 right-4 z-50 space-y-2 max-w-md">
      {!isOnline && (
        <Alert variant="destructive">
          <WifiOff className="h-4 w-4" />
          <AlertTitle>{t.common_error}</AlertTitle>
          <AlertDescription>{t.system_network_error}</AlertDescription>
        </Alert>
      )}

      {notifications.map((notification) => (
        <Alert
          key={notification.id}
          variant={notification.type === 'error' || notification.type === 'warning' ? 'destructive' : 'default'}
          className="animate-slide-in-right"
        >
          {notification.type === 'error' && <AlertCircle className="h-4 w-4" />}
          {notification.type === 'warning' && <AlertCircle className="h-4 w-4" />}
          {notification.type === 'success' && <CheckCircle2 className="h-4 w-4" />}
          {notification.type === 'info' && <Info className="h-4 w-4" />}
          
          <AlertDescription className="flex items-center justify-between">
            <span>{notification.message}</span>
            <button
              onClick={() => removeNotification(notification.id)}
              className="ml-4 text-sm opacity-70 hover:opacity-100"
            >
              ×
            </button>
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
};
