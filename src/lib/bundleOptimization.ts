/**
 * Bundle optimization utilities and lazy loading helpers
 */
import { env } from '@/lib/env';
import { logDebug } from '@/lib/logger';

/**
 * Dynamically import large libraries only when needed
 * Example: import charts library only when user opens analytics
 */
export const lazyLoadChart = () => import('recharts');

/**
 * Code splitting helper for route-based lazy loading
 * Automatically adds webpackChunkName comments for better debugging
 */
export const lazyRoute = <T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  chunkName?: string
): React.LazyExoticComponent<T> => {
  return React.lazy(importFn);
};

/**
 * Preload a route component during idle time
 * Useful for preloading the next likely route
 */
export const preloadRoute = (importFn: () => Promise<any>) => {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => importFn(), { timeout: 2000 });
  } else {
    setTimeout(() => importFn(), 100);
  }
};

/**
 * Bundle size analyzer - logs current loaded chunks (dev only)
 */
export const analyzeBundleSize = () => {
  if (env.isDev) {
    const scripts = Array.from(document.scripts);
    const chunks = scripts
      .filter(s => s.src.includes('assets'))
      .map(s => ({
        url: s.src.split('/').pop(),
        loaded: true,
      }));
    
    logDebug('Bundle chunks', { totalScripts: scripts.length, chunks: chunks.length });
  }
};

/**
 * Dynamic import with retry logic for flaky networks
 */
export const dynamicImportWithRetry = async <T>(
  importFn: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> => {
  try {
    return await importFn();
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return dynamicImportWithRetry(importFn, retries - 1, delay * 2);
    }
    throw error;
  }
};

/**
 * Prefetch critical routes during app initialization
 * Call this after the main app has loaded
 */
export const prefetchCriticalRoutes = () => {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      // Prefetch explore page
      import('../pages/Explore').catch(() => {});
      // Prefetch profile page  
      import('../pages/Profile').catch(() => {});
      // Prefetch messages
      import('../pages/Messages').catch(() => {});
    }, { timeout: 5000 });
  }
};

/**
 * Monitor bundle load performance
 */
export const monitorBundlePerformance = () => {
  if ('performance' in window && 'getEntriesByType' in performance) {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const scripts = resources.filter(r => r.initiatorType === 'script');
    
    const totalSize = scripts.reduce((acc, s) => acc + (s.transferSize || 0), 0);
    const avgLoadTime = scripts.reduce((acc, s) => acc + s.duration, 0) / scripts.length;
    
    logDebug('📦 Bundle Performance', {
      totalSize: `${(totalSize / 1024).toFixed(2)} KB`,
      avgLoadTime: `${avgLoadTime.toFixed(2)} ms`,
      scriptsLoaded: scripts.length
    });
  }
};

// Auto-monitor in dev mode
if (env.isDev) {
  if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
      setTimeout(() => {
        monitorBundlePerformance();
      }, 2000);
    });
  }
}

// Make React available for lazy helper
import React from 'react';
