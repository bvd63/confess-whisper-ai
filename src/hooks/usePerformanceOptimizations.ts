import { useEffect, useState, useCallback } from 'react';
import { useAdaptiveLoading } from './useAdaptiveLoading';

interface PerformanceMetrics {
  fps: number;
  memoryUsage: number;
  cacheSize: number;
}

export const usePerformanceOptimizations = () => {
  const adaptiveConfig = useAdaptiveLoading();
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    memoryUsage: 0,
    cacheSize: 0,
  });

  const measureCacheSize = useCallback(() => {
    try {
      let totalSize = 0;
      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          totalSize += localStorage[key].length + key.length;
        }
      }
      return totalSize / 1024; // KB
    } catch {
      return 0;
    }
  }, []);

  const optimizeCache = useCallback(() => {
    const cacheSize = measureCacheSize();
    
    // If cache is too large (> 5MB), clean old entries
    if (cacheSize > 5120) {
      const keys = Object.keys(localStorage);
      const timestampedKeys = keys
        .filter(key => key.startsWith('confession_') || key.startsWith('comment_'))
        .map(key => {
          try {
            const data = JSON.parse(localStorage.getItem(key) || '{}');
            return { key, timestamp: data.timestamp || 0 };
          } catch {
            return { key, timestamp: 0 };
          }
        })
        .sort((a, b) => a.timestamp - b.timestamp);

      // Remove oldest 25%
      const removeCount = Math.floor(timestampedKeys.length * 0.25);
      timestampedKeys.slice(0, removeCount).forEach(({ key }) => {
        localStorage.removeItem(key);
      });

      console.log(`Cache optimized: removed ${removeCount} old entries`);
    }
  }, [measureCacheSize]);

  useEffect(() => {
    // Apply adaptive optimizations based on device capabilities
    if (!adaptiveConfig.enableAnimations) {
      document.documentElement.classList.add('reduce-motion');
    } else {
      document.documentElement.classList.remove('reduce-motion');
    }

    // Add data-saver attribute for CSS
    if (adaptiveConfig.prefetchStrategy === 'none') {
      document.documentElement.setAttribute('data-saver', 'true');
    } else {
      document.documentElement.removeAttribute('data-saver');
    }

    // Set image quality CSS variable
    const qualityMap = { low: '0.6', medium: '0.75', high: '0.9' };
    document.documentElement.style.setProperty(
      '--image-quality',
      qualityMap[adaptiveConfig.imageQuality]
    );
  }, [adaptiveConfig]);

  useEffect(() => {
    // Measure FPS
    let lastTime = performance.now();
    let frames = 0;
    let fpsInterval: number;

    const measureFPS = () => {
      const currentTime = performance.now();
      frames++;

      if (currentTime >= lastTime + 1000) {
        const currentFPS = Math.round((frames * 1000) / (currentTime - lastTime));
        setMetrics(prev => ({ ...prev, fps: currentFPS }));
        frames = 0;
        lastTime = currentTime;
      }

      fpsInterval = requestAnimationFrame(measureFPS);
    };

    fpsInterval = requestAnimationFrame(measureFPS);

    // Measure memory (if available)
    const memoryInterval = setInterval(() => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        setMetrics(prev => ({
          ...prev,
          memoryUsage: Math.round(memory.usedJSHeapSize / 1048576), // MB
          cacheSize: measureCacheSize(),
        }));
      }
    }, 5000);

    // Auto-optimize cache every 10 minutes
    const optimizeInterval = setInterval(optimizeCache, 600000);

    return () => {
      cancelAnimationFrame(fpsInterval);
      clearInterval(memoryInterval);
      clearInterval(optimizeInterval);
    };
  }, [measureCacheSize, optimizeCache]);

  return {
    metrics,
    optimizeCache,
    adaptiveConfig,
  };
};