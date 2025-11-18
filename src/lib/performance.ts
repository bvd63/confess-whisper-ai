/**
 * Lightweight performance monitoring utilities
 * Only active in development mode
 */

import { logPerformance } from '@/lib/logger';

export const initPerformanceMonitoring = () => {
  if (!import.meta.env.DEV) {
    return;
  }

  const recordMetric = (metric: string, value: number) => {
    logPerformance(metric, value);
  };

  const startTime = performance.now();

  window.addEventListener("load", () => {
    const loadTime = performance.now() - startTime;
    recordMetric("Page load time", loadTime);

    // Log performance metrics if available
    if (window.performance && window.performance.getEntriesByType) {
      const navigationEntries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];

      if (navigationEntries.length > 0) {
        const nav = navigationEntries[0];
        recordMetric("DNS lookup", nav.domainLookupEnd - nav.domainLookupStart);
        recordMetric("TCP connection", nav.connectEnd - nav.connectStart);
        recordMetric("DOM interactive", nav.domInteractive);
        recordMetric("DOM complete", nav.domComplete);
      }
    }
  });

  // Monitor First Contentful Paint
  if (window.PerformanceObserver) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === "paint" && entry.name === "first-contentful-paint") {
            recordMetric("First Contentful Paint", entry.startTime);
          }
        }
      });
      observer.observe({ entryTypes: ["paint"] });
    } catch (e) {
      // PerformanceObserver not supported
    }
  }
};
