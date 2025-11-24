import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { persistenceMonitor } from '@/lib/persistenceMonitor';
import { persistenceManager } from '@/lib/persistenceManager';
import { syncScheduler } from '@/lib/syncScheduler';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { Activity, Database, Wifi, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export const PersistenceMonitorDashboard = () => {
  const { t } = useLanguage();
  const { isOnline, queuedOperations } = useNetworkStatus();
  const [stats, setStats] = useState<any>(null);
  const [cacheSize, setCacheSize] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState(false);

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
            </div>
          </CardContent>
        </Card>
      </div>

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
