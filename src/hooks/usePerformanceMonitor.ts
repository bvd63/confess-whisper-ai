import { useEffect, useRef } from 'react';

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
        console.warn(`[Performance] ${componentName} took ${renderTime.toFixed(2)}ms to render (render #${renderCountRef.current})`);
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
      console.log('[Web Vitals] LCP:', lastEntry.renderTime || lastEntry.loadTime);
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
        console.log('[Web Vitals] FID:', entry.processingStart - entry.startTime);
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
      console.log('[Web Vitals] CLS:', clsValue);
    });

    try {
      clsObserver.observe({ type: 'layout-shift', buffered: true });
    } catch (e) {
      // Browser doesn't support CLS
    }
  }
};
