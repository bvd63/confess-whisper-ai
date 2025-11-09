import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Database, Gauge, Zap } from 'lucide-react';
import { usePerformanceOptimizations } from '@/hooks/usePerformanceOptimizations';

/**
 * Performance monitoring dashboard - only visible in dev mode
 * Shows real-time FPS, memory usage, cache size, and adaptive settings
 */
import { useAuth } from '@/hooks/useAuth';
import { env } from '@/lib/env';

export const PerformanceDashboard = () => {
  const { metrics, adaptiveConfig } = usePerformanceOptimizations();
  const [isVisible, setIsVisible] = useState(false);

  // Only show in development or when manually enabled
  useEffect(() => {
    const showDashboard = 
      env.isDev || 
      localStorage.getItem('showPerformanceDashboard') === 'true';
    setIsVisible(showDashboard);
  }, []);

  // Toggle with keyboard shortcut: Ctrl+Shift+P
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        setIsVisible(prev => {
          const newState = !prev;
          localStorage.setItem('showPerformanceDashboard', String(newState));
          return newState;
        });
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  if (!isVisible) return null;

  const getFPSColor = (fps: number) => {
    if (fps >= 55) return 'text-green-500';
    if (fps >= 30) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getMemoryColor = (mb: number) => {
    if (mb < 50) return 'text-green-500';
    if (mb < 100) return 'text-yellow-500';
    return 'text-red-500';
  };

  // Derive device type from config
  const getDeviceType = () => {
    if (!adaptiveConfig.enableAnimations && adaptiveConfig.imageQuality === 'low') {
      return 'Low-end';
    }
    if (adaptiveConfig.imageQuality === 'medium') {
      return 'Mid-range';
    }
    return 'High-end';
  };

  return (
    <Card className="fixed bottom-20 right-4 z-50 p-4 w-72 glass-strong shadow-elegant animate-fade-in">
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Performance Monitor
          </h3>
          <Badge variant="outline" className="text-xs">
            {getDeviceType()}
          </Badge>
        </div>

        {/* FPS */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">FPS</span>
          </div>
          <span className={`text-sm font-mono font-bold ${getFPSColor(metrics.fps)}`}>
            {metrics.fps.toFixed(0)}
          </span>
        </div>

        {/* Memory */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">Memory</span>
          </div>
          <span className={`text-sm font-mono font-bold ${getMemoryColor(metrics.memoryUsage)}`}>
            {metrics.memoryUsage.toFixed(1)} MB
          </span>
        </div>

        {/* Cache Size */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">Cache</span>
          </div>
          <span className="text-sm font-mono">
            {(metrics.cacheSize / 1024).toFixed(1)} MB
          </span>
        </div>

        {/* Adaptive Settings */}
        <div className="pt-2 border-t border-border/50 space-y-1">
          <div className="text-xs text-muted-foreground">Adaptive Settings:</div>
          <div className="flex flex-wrap gap-1">
            {!adaptiveConfig.enableAnimations && (
              <Badge variant="secondary" className="text-xs">
                Reduced Motion
              </Badge>
            )}
            {adaptiveConfig.prefetchStrategy === 'none' && (
              <Badge variant="secondary" className="text-xs">
                Data Saver
              </Badge>
            )}
            {adaptiveConfig.imageQuality === 'low' && (
              <Badge variant="secondary" className="text-xs">
                Low Quality Images
              </Badge>
            )}
            {!adaptiveConfig.enableVideoAutoplay && (
              <Badge variant="secondary" className="text-xs">
                No Autoplay
              </Badge>
            )}
          </div>
        </div>

        <div className="pt-2 text-xs text-muted-foreground text-center">
          Press Ctrl+Shift+P to toggle
        </div>
      </div>
    </Card>
  );
};

export default PerformanceDashboard;
