import { useEffect, useRef } from 'react';
import { logPerformance, logDebug } from '@/lib/logger';

interface PerformanceMetrics {
  renderTime: number;
  componentName: string;
}

export const usePerformanceMonitor = (componentName: string) => {
  const renderCountRef = useRef(0);
  const startTimeRef = useRef(performance.now());

  useEffect(() => {
    renderCountRef.current += 1;
    const renderTime = performance.now() - startTimeRef.current;

    if (process.env.NODE_ENV === 'development') {
      if (renderTime > 16) { // More than one frame (60fps)
        logPerformance(`${componentName} render #${renderCountRef.current}`, renderTime);
      }
    }

    startTimeRef.current = performance.now();
  });

  return {
    renderCount: renderCountRef.current,
  };
};

// Web Vitals monitoring
export const reportWebVitals = () => {
  if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
    // Largest Contentful Paint (LCP)
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as any;
      logDebug('[Web Vitals] LCP', { value: lastEntry.renderTime || lastEntry.loadTime });
    });
    
    try {
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) {
      // Browser doesn't support LCP
    }

    // First Input Delay (FID)
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        logDebug('[Web Vitals] FID', { value: entry.processingStart - entry.startTime });
      });
    });

    try {
      fidObserver.observe({ type: 'first-input', buffered: true });
    } catch (e) {
      // Browser doesn't support FID
    }

    // Cumulative Layout Shift (CLS)
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as any[]) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      }
      logDebug('[Web Vitals] CLS', { value: clsValue });
    });

    try {
      clsObserver.observe({ type: 'layout-shift', buffered: true });
    } catch (e) {
      // Browser doesn't support CLS
    }
  }
};
