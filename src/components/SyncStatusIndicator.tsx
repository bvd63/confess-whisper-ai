import { useMemo } from 'react';
import { CheckCircle2, CloudOff, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export const SyncStatusIndicator = () => {
  const { isOnline, queuedOperations, lastSyncAt } = useNetworkStatus();
  const lastSyncTime = useMemo(() => (lastSyncAt ? new Date(lastSyncAt) : null), [lastSyncAt]);
  const isSyncing = isOnline && queuedOperations > 0;

  const getStatusIcon = () => {
    if (!isOnline) return <CloudOff className="w-3 h-3" />;
    if (isSyncing) return <RefreshCw className="w-3 h-3 animate-spin" />;
    return <CheckCircle2 className="w-3 h-3" />;
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (isSyncing) return 'Syncing...';
    if (lastSyncTime) {
      const diff = Date.now() - lastSyncTime.getTime();
      if (diff < 5000) return 'Just synced';
      if (diff < 60000) return 'Up to date';
      return `Synced ${Math.floor(diff / 60000)}m ago`;
    }
    return 'Awaiting sync';
  };

  const getVariant = () => {
    if (!isOnline) return 'destructive' as const;
    if (isSyncing) return 'secondary' as const;
    return 'default' as const;
  };

  return (
    <Badge variant={getVariant()} className="gap-1 text-xs">
      {getStatusIcon()}
      <span>{getStatusText()}</span>
    </Badge>
  );
};
