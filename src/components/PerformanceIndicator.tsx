import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { observability } from '@/lib/observability';
import { env } from '@/lib/env';
import { Activity, Database, TrendingUp, Zap } from 'lucide-react';

interface PerformanceMetrics {
  latency: number;
  cacheHitRate: number;
  errorRate: number;
  activeRequests: number;
}

export const PerformanceIndicator = () => {
  const { t } = useLanguage();
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    latency: 0,
    cacheHitRate: 0,
    errorRate: 0,
    activeRequests: 0,
  });
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const summary = observability.getMetricsSummary();
      
      // Calculate average latency
      const queryMetrics = Object.entries(summary)
        .filter(([key]) => key.startsWith('query_'))
        .map(([_, value]) => value.avg);
      
      const avgLatency = queryMetrics.length > 0
        ? queryMetrics.reduce((a, b) => a + b, 0) / queryMetrics.length
        : 0;

      // Calculate cache hit rate
      const cacheHits = summary['cache_hit']?.count || 0;
      const cacheMisses = summary['cache_miss']?.count || 0;
      const totalCache = cacheHits + cacheMisses;
      const cacheHitRate = totalCache > 0 ? (cacheHits / totalCache) * 100 : 0;

      // Calculate error rate
      const errors = Object.entries(summary)
        .filter(([key]) => key.includes('error'))
        .reduce((sum, [_, value]) => sum + value.count, 0);
      
      const total = Object.values(summary).reduce((sum, value) => sum + value.count, 0);
      const errorRate = total > 0 ? (errors / total) * 100 : 0;

      setMetrics({
        latency: Math.round(avgLatency),
        cacheHitRate: Math.round(cacheHitRate),
        errorRate: Number(errorRate.toFixed(2)),
        activeRequests: 0, // Would need real-time tracking
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Don't show in production
  if (env.isProd) {
    return null;
  }

  const getLatencyColor = () => {
    if (metrics.latency < 100) return 'text-green-500';
    if (metrics.latency < 200) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getCacheColor = () => {
    if (metrics.cacheHitRate >= 85) return 'text-green-500';
    if (metrics.cacheHitRate >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <Badge
        variant="outline"
        className="cursor-pointer hover:scale-105 transition-transform"
        onClick={() => setShowDetails(!showDetails)}
      >
        <Activity className="h-3 w-3 mr-1" />
        <span className={getLatencyColor()}>{metrics.latency}ms</span>
      </Badge>

      {showDetails && (
        <div className="absolute bottom-10 left-0 bg-background border rounded-lg p-4 shadow-lg min-w-[250px]">
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                <span>Latency (avg)</span>
              </div>
              <span className={getLatencyColor()}>
                {metrics.latency}ms
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                <span>Cache Hit Rate</span>
              </div>
              <span className={getCacheColor()}>
                {metrics.cacheHitRate}%
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <span>Error Rate</span>
              </div>
              <span className={metrics.errorRate < 0.1 ? 'text-green-500' : 'text-red-500'}>
                {metrics.errorRate}%
              </span>
            </div>

            {metrics.latency > 200 && (
              <div className="text-xs text-yellow-500 border-t pt-2">
                {t.performance_slow_query}
              </div>
            )}

            {metrics.cacheHitRate >= 85 && (
              <div className="text-xs text-green-500 border-t pt-2">
                {t.performance_cache_hit}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
