import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, RefreshCw } from 'lucide-react';
import { useCachePurgeOnDelete } from '@/hooks/useCachePurgeOnDelete';
import { logDebug } from '@/lib/logger';

export const CacheMonitor = () => {
  const [cacheStats, setCacheStats] = useState({
    size: 0,
    items: 0,
    confessions: 0,
    comments: 0,
    messages: 0,
    notifications: 0,
  });
  const { purgeAll } = useCachePurgeOnDelete();

  const calculateStats = () => {
    const keys = Object.keys(localStorage);
    let totalSize = 0;

    const stats = {
      confessions: keys.filter(k => k.startsWith('confession_')).length,
      comments: keys.filter(k => k.startsWith('comment_')).length,
      messages: keys.filter(k => k.startsWith('message_')).length,
      notifications: keys.filter(k => k.startsWith('notification_')).length,
    };

    keys.forEach(key => {
      try {
        totalSize += (localStorage.getItem(key) || '').length + key.length;
      } catch (error) {
        // Ignore storage errors for individual keys
        logDebug('Failed to get size for key', { key, error });
      }
    });

    setCacheStats({
      size: Math.round(totalSize / 1024), // KB
      items: keys.length,
      ...stats,
    });
  };

  useEffect(() => {
    calculateStats();
    const interval = setInterval(calculateStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const handlePurge = () => {
    if (confirm('Clear all cached data? This will not affect saved confessions.')) {
      purgeAll();
      calculateStats();
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Cache Status</h3>
        <Button variant="ghost" size="sm" onClick={calculateStats}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total Size:</span>
          <span className="font-medium">{cacheStats.size} KB</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total Items:</span>
          <span className="font-medium">{cacheStats.items}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-2 border-t text-xs">
          <div>Confessions: {cacheStats.confessions}</div>
          <div>Comments: {cacheStats.comments}</div>
          <div>Messages: {cacheStats.messages}</div>
          <div>Notifications: {cacheStats.notifications}</div>
        </div>
      </div>

      <Button
        variant="destructive"
        size="sm"
        onClick={handlePurge}
        className="w-full mt-3"
      >
        <Trash2 className="h-3 w-3 mr-2" />
        Clear Cache
      </Button>
    </Card>
  );
};