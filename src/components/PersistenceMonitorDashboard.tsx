import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { persistenceMonitor } from '@/lib/persistenceMonitor';
import { syncScheduler } from '@/lib/syncScheduler';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { offlineQueue } from '@/lib/offlineQueue';
import { observability } from '@/lib/observability';
import { Activity, Database, Wifi, Clock, AlertCircle, CheckCircle2, Trash2, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const getTimestamp = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());

export const PersistenceMonitorDashboard = () => {
  const { isOnline, queuedOperations, pendingByScope, lastSyncAt } = useNetworkStatus();
  const offlineQueueState = useOfflineQueue();
  const [stats, setStats] = useState<any>(null);
  const [cacheSize, setCacheSize] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isClearingQueue, setIsClearingQueue] = useState(false);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const lastSyncLabel = useMemo(() => (lastSyncAt ? new Date(lastSyncAt).toLocaleTimeString() : null), [lastSyncAt]);

  useEffect(() => {
    const updateMetrics = async () => {
      const persistenceStats = persistenceMonitor.getStats();
      setStats(persistenceStats);
      setIsSyncing(syncScheduler.isSyncRunning());

      // Get cache size estimate
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        const usage = estimate.usage || 0;
        const quota = estimate.quota || 1;
        setCacheSize((usage / quota) * 100);
      }
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 5000);

    return () => clearInterval(interval);
  }, []);

  const getSyncStatus = () => {
    if (!isOnline) return { label: 'Offline', variant: 'destructive' as const, icon: Wifi };
    if (isSyncing || queuedOperations > 0) return { label: 'Syncing', variant: 'default' as const, icon: Activity };
    return { label: 'Synced', variant: 'success' as const, icon: CheckCircle2 };
  };

  const syncStatus = getSyncStatus();
  const StatusIcon = syncStatus.icon;

  const handleManualQueueAction = useCallback(
    async (action: 'process' | 'clear') => {
      const snapshotBefore = offlineQueue.getSnapshot();
      const tags = {
        action,
        source: 'persistence_dashboard',
        online: isOnline ? 'true' : 'false',
      };

      observability.info('Offline queue manual action started', {
        action: `offline_queue_${action}`,
        metadata: {
          source: 'persistence_dashboard',
          pendingBefore: snapshotBefore.totalPending,
          scopeBreakdown: snapshotBefore.pendingByScope,
          queuedOperations,
        },
      });

      const startedAt = getTimestamp();

      try {
        if (action === 'process') {
          await offlineQueue.processQueue();
        } else {
          await offlineQueue.clearQueue();
        }

        const finishedAt = getTimestamp();
        const snapshotAfter = offlineQueue.getSnapshot();

        observability.recordMetric({
          name: 'offlineQueue_manual_action_duration',
          value: finishedAt - startedAt,
          unit: 'ms',
          tags,
        });

        observability.recordMetric({
          name: 'offlineQueue_manual_action_pending',
          value: snapshotAfter.totalPending,
          unit: 'count',
          tags,
        });

        observability.info('Offline queue manual action completed', {
          action: `offline_queue_${action}`,
          metadata: {
            source: 'persistence_dashboard',
            pendingBefore: snapshotBefore.totalPending,
            pendingAfter: snapshotAfter.totalPending,
            scopeBreakdown: snapshotAfter.pendingByScope,
          },
        });
      } catch (error) {
        observability.recordMetric({
          name: 'offlineQueue_manual_action_failure',
          value: 1,
          unit: 'count',
          tags,
        });

        observability.error('Offline queue manual action failed', error as Error, {
          action: `offline_queue_${action}`,
          metadata: {
            source: 'persistence_dashboard',
            pendingBefore: snapshotBefore.totalPending,
            queuedOperations,
          },
        });
        throw error;
      }
    },
    [isOnline, queuedOperations]
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Persistence System Monitor</h2>
        <p className="text-muted-foreground">Real-time monitoring of the offline-first persistence layer</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Sync Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sync Status</CardTitle>
            <StatusIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant={syncStatus.variant}>{syncStatus.label}</Badge>
              {queuedOperations > 0 && (
                <span className="text-sm text-muted-foreground">
                  {queuedOperations} pending
                </span>
              )}
            </div>
            {lastSyncLabel && (
              <p className="text-xs text-muted-foreground mt-2">Last sync at {lastSyncLabel}</p>
            )}
          </CardContent>
        </Card>

        {/* Network Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Network</CardTitle>
            <Wifi className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge variant={isOnline ? 'success' : 'destructive'}>
              {isOnline ? 'Online' : 'Offline'}
            </Badge>
          </CardContent>
        </Card>

        {/* Operations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Operations (1min)</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalOperations || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.successRate || 100}% success rate
            </p>
          </CardContent>
        </Card>

        {/* Avg Latency */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.avgDuration || 0}ms</div>
            <p className="text-xs text-muted-foreground">
              p95: {stats?.p95Duration || 0}ms
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
            <CardDescription>Last minute operation statistics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Success Rate</span>
                <span className="text-sm text-muted-foreground">{stats?.successRate || 100}%</span>
              </div>
              <Progress value={parseFloat(stats?.successRate || '100')} />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Avg Duration</span>
                <span className="text-sm text-muted-foreground">{stats?.avgDuration || 0}ms</span>
              </div>
              <Progress value={Math.min(parseFloat(stats?.avgDuration || '0'), 100)} />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">p95 Duration</span>
                <span className="text-sm text-muted-foreground">{stats?.p95Duration || 0}ms</span>
              </div>
              <Progress value={Math.min(parseFloat(stats?.p95Duration || '0'), 100)} />
            </div>

            {stats && stats.slowOperations > 0 && (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                <span className="text-sm text-yellow-800 dark:text-yellow-200">
                  {stats.slowOperations} slow operations detected (&gt;100ms)
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cache Health */}
        <Card>
          <CardHeader>
            <CardTitle>Cache Health</CardTitle>
            <CardDescription>Storage usage and cache status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Storage Usage</span>
                <span className="text-sm text-muted-foreground">{cacheSize.toFixed(1)}%</span>
              </div>
              <Progress value={cacheSize} />
            </div>

            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
              <Database className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-sm text-green-800 dark:text-green-200">
                IndexedDB operational
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Operations</span>
                <span className="font-medium">{stats?.totalOperations || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Queued Operations</span>
                <span className="font-medium">{queuedOperations}</span>
              </div>
              {queuedOperations > 0 && (
                <div className="text-xs text-muted-foreground">
                  {Object.entries(pendingByScope)
                    .filter(([, count]) => count > 0)
                    .map(([scope, count]) => `${scope}: ${count}`)
                    .join(' • ')}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Offline Queue Controls */}
      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Offline Queue</CardTitle>
            <CardDescription>Inspect, flush, or clear pending operations</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              className="gap-2"
              disabled={queuedOperations === 0 || isProcessingQueue}
              onClick={async () => {
                setIsProcessingQueue(true);
                try {
                  await handleManualQueueAction('process');
                } finally {
                  setIsProcessingQueue(false);
                }
              }}
            >
              <RefreshCw className="h-4 w-4" />
              Process Queue
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              disabled={queuedOperations === 0 || isClearingQueue}
              onClick={async () => {
                setIsClearingQueue(true);
                try {
                  await handleManualQueueAction('clear');
                } finally {
                  setIsClearingQueue(false);
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
              Clear Queue
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64 rounded-lg border">
            {offlineQueueState.pendingOperations.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Queue empty — actions will appear here when offline.
              </div>
            ) : (
              <div className="divide-y">
                {offlineQueueState.pendingOperations.map((op) => (
                  <div key={op.id} className="grid gap-2 p-4 md:grid-cols-[1fr_auto] md:items-center">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{op.scope}</Badge>
                        <span className="text-xs uppercase tracking-wide text-muted-foreground">{op.type}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(op.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Retries: {op.retryCount} · Conflict: {op.conflictKey || 'none'} · Hash: {op.payloadHash.slice(0, 8)}
                      </p>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          const snapshotBefore = offlineQueue.getSnapshot();
                          const startedAt = getTimestamp();
                          const tags = {
                            action: 'cancel',
                            source: 'persistence_dashboard',
                            scope: op.scope,
                          };

                          observability.info('Offline queue manual action started', {
                            action: 'offline_queue_cancel',
                            metadata: {
                              source: 'persistence_dashboard',
                              operationId: op.id,
                              scope: op.scope,
                              pendingBefore: snapshotBefore.totalPending,
                            },
                          });

                          try {
                            await offlineQueue.cancelOperation(op.id);
                            const finishedAt = getTimestamp();
                            const snapshotAfter = offlineQueue.getSnapshot();

                            observability.recordMetric({
                              name: 'offlineQueue_manual_action_duration',
                              value: finishedAt - startedAt,
                              unit: 'ms',
                              tags,
                            });

                            observability.recordMetric({
                              name: 'offlineQueue_manual_action_pending',
                              value: snapshotAfter.totalPending,
                              unit: 'count',
                              tags,
                            });

                            observability.info('Offline queue manual action completed', {
                              action: 'offline_queue_cancel',
                              metadata: {
                                source: 'persistence_dashboard',
                                operationId: op.id,
                                pendingBefore: snapshotBefore.totalPending,
                                pendingAfter: snapshotAfter.totalPending,
                              },
                            });
                          } catch (error) {
                            observability.recordMetric({
                              name: 'offlineQueue_manual_action_failure',
                              value: 1,
                              unit: 'count',
                              tags,
                            });
                            observability.error('Offline queue manual action failed', error as Error, {
                              action: 'offline_queue_cancel',
                              metadata: {
                                source: 'persistence_dashboard',
                                operationId: op.id,
                              },
                            });
                          }
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* System Info */}
      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
          <CardDescription>Runtime environment and configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <div className="text-sm font-medium mb-1">Quick Sync</div>
              <div className="text-2xl font-bold text-muted-foreground">30s</div>
              <div className="text-xs text-muted-foreground">Interval</div>
            </div>
            <div>
              <div className="text-sm font-medium mb-1">Deep Sync</div>
              <div className="text-2xl font-bold text-muted-foreground">5m</div>
              <div className="text-xs text-muted-foreground">Interval</div>
            </div>
            <div>
              <div className="text-sm font-medium mb-1">Cache Cleanup</div>
              <div className="text-2xl font-bold text-muted-foreground">1h</div>
              <div className="text-xs text-muted-foreground">Interval</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
