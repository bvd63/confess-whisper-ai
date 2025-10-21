import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { WifiOff, Clock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLanguage } from '@/contexts/LanguageContext';

export const NetworkStatusIndicator = () => {
  const { isOnline, queuedOperations } = useNetworkStatus();
  const { t } = useLanguage();

  if (isOnline && queuedOperations === 0) {
    return null;
  }

  return (
    <div className="fixed top-16 left-0 right-0 z-50 px-4 pointer-events-none">
      <div className="container max-w-4xl mx-auto pointer-events-auto">
        {!isOnline && (
          <Alert variant="destructive" className="mb-2">
            <WifiOff className="h-4 w-4" />
            <AlertDescription>
              {t.network_offline || "You are offline. Messages will be sent when connection is restored."}
            </AlertDescription>
          </Alert>
        )}
        
        {isOnline && queuedOperations > 0 && (
          <Alert className="mb-2 bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
            <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-800 dark:text-blue-200">
              {t.network_syncing?.replace('{count}', String(queuedOperations)) || `Syncing ${queuedOperations} pending operation(s)...`}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
};
