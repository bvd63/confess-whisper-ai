import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePerformanceOptimizations } from '@/hooks/usePerformanceOptimizations';
import { env } from '@/lib/env';
import { Activity, Database, Zap } from 'lucide-react';

export const PerformanceMonitor = () => {
  const [isVisible, setIsVisible] = useState(false);
  const { metrics, optimizeCache } = usePerformanceOptimizations();

  // Only show in development
  if (env.isProd) return null;

  if (!isVisible) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsVisible(true)}
        className="fixed bottom-20 right-4 z-50 opacity-50 hover:opacity-100"
      >
        <Activity className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-20 right-4 z-50 p-4 w-64 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-sm">Performance</h4>
        <Button variant="ghost" size="sm" onClick={() => setIsVisible(false)}>
          ×
        </Button>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Zap className="h-3 w-3" /> FPS
          </span>
          <span className={metrics.fps < 30 ? 'text-red-500' : 'text-green-500'}>
            {metrics.fps}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Activity className="h-3 w-3" /> Memory
          </span>
          <span>{metrics.memoryUsage}MB</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Database className="h-3 w-3" /> Cache
          </span>
          <span>{metrics.cacheSize.toFixed(2)}KB</span>
        </div>
      </div>

      <Button
        size="sm"
        variant="outline"
        onClick={optimizeCache}
        className="w-full mt-3"
      >
        Optimize Cache
      </Button>
    </Card>
  );
};