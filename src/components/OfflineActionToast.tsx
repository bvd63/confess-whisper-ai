import { useEffect, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useOfflineQueueState } from '@/contexts/OfflineQueueContext';
import { offlineQueue } from '@/lib/offlineQueue';
import { useLanguage } from '@/contexts/LanguageContext';

const formatScopeLabel = (scope: string) => {
  switch (scope) {
    case 'messages':
      return 'messages';
    case 'confessions':
      return 'confessions';
    case 'notifications':
      return 'notifications';
    case 'subscriptions':
      return 'subscriptions';
    case 'system':
      return 'system';
    default:
      return 'general';
  }
};

export const OfflineActionToast = () => {
  const { lastEvent, pendingByScope } = useOfflineQueueState();
  const { t } = useLanguage();
  const toastRefs = useRef(new Map<string, string | number>());

  const scopeSummary = useMemo(() => {
    const activeScopes = Object.entries(pendingByScope).filter(([, count]) => count > 0);
    if (!activeScopes.length) {
      return t.network_syncing?.replace('{count}', '0') ?? 'No pending actions';
    }
    return activeScopes
      .map(([scope, count]) => `${formatScopeLabel(scope)}: ${count}`)
      .join(' • ');
  }, [pendingByScope, t.network_syncing]);

  useEffect(() => {
    if (!lastEvent) return;

    if (lastEvent.type === 'queued') {
      const toastId = toast.custom((id) => (
        <div className="flex flex-col gap-2 text-sm">
          <div className="font-medium">
            {t.offline_mode || 'Offline mode'} • {formatScopeLabel(lastEvent.scope)}
          </div>
          <p className="text-xs text-muted-foreground">{scopeSummary}</p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                offlineQueue.processQueue();
                toast.dismiss(id);
              }}
            >
              Retry now
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                await offlineQueue.cancelOperation(lastEvent.operationId);
                toast.dismiss(id);
                toastRefs.current.delete(lastEvent.operationId);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ), { duration: Infinity });
      toastRefs.current.set(lastEvent.operationId, toastId);
      return;
    }

    if (lastEvent.type === 'synced') {
      if (lastEvent.operationId) {
        const toastId = toastRefs.current.get(lastEvent.operationId);
        if (toastId) {
          toast.success('Action synced successfully');
          toast.dismiss(toastId);
          toastRefs.current.delete(lastEvent.operationId);
        }
      } else {
        toast.success('Queued actions synced');
      }
      return;
    }

    if (lastEvent.type === 'dropped') {
      if (lastEvent.operationId) {
        const toastId = toastRefs.current.get(lastEvent.operationId);
        if (toastId) {
          toast.dismiss(toastId);
          toastRefs.current.delete(lastEvent.operationId);
        }
      }
      toast.error(lastEvent.reason === 'cancelled' ? 'Action cancelled' : 'Failed to sync after retries');
    }
  }, [lastEvent, scopeSummary, t.offline_mode]);

  return null;
};
