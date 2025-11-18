import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { WifiOff, Clock, Wifi } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';

export const NetworkStatusIndicator = () => {
  const { isOnline, queuedOperations, pendingByScope } = useNetworkStatus();
  const { t } = useLanguage();

  if (isOnline && queuedOperations === 0) {
    return null;
  }

  const scopeBreakdown = Object.entries(pendingByScope)
    .filter(([, count]) => count > 0)
    .map(([scope, count]) => `${scope}: ${count}`)
    .join(' • ');

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
          <Alert className="mb-2 bg-primary/10 border-primary/20">
            <div className="flex items-center gap-2">
              <Wifi className="h-4 w-4 text-primary animate-pulse" />
              <AlertDescription className="flex items-center gap-2">
                {t.network_syncing?.replace('{count}', String(queuedOperations)) || `Syncing ${queuedOperations} pending operation(s)...`}
                <Badge variant="secondary" className="animate-pulse">
                  {queuedOperations}
                </Badge>
              </AlertDescription>
            </div>
            {scopeBreakdown && (
              <p className="text-xs text-muted-foreground mt-1">{scopeBreakdown}</p>
            )}
          </Alert>
        )}
      </div>
    </div>
  );
};
