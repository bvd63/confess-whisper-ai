/**
 * Lightweight performance monitoring utilities
 * Only active in development mode
 */

export const initPerformanceMonitoring = () => {
  if (import.meta.env.DEV) {
    const startTime = performance.now();
    
    window.addEventListener("load", () => {
      const loadTime = performance.now() - startTime;
      console.log(`[Performance] Page load time: ${loadTime.toFixed(2)}ms`);
      
      // Log performance metrics if available
      if (window.performance && window.performance.getEntriesByType) {
        const navigationEntries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
        
        if (navigationEntries.length > 0) {
          const nav = navigationEntries[0];
          console.log(`[Performance] DNS lookup: ${(nav.domainLookupEnd - nav.domainLookupStart).toFixed(2)}ms`);
          console.log(`[Performance] TCP connection: ${(nav.connectEnd - nav.connectStart).toFixed(2)}ms`);
          console.log(`[Performance] DOM interactive: ${nav.domInteractive.toFixed(2)}ms`);
          console.log(`[Performance] DOM complete: ${nav.domComplete.toFixed(2)}ms`);
        }
      }
    });
    
    // Monitor First Contentful Paint
    if (window.PerformanceObserver) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === "paint" && entry.name === "first-contentful-paint") {
              console.log(`[Performance] First Contentful Paint: ${entry.startTime.toFixed(2)}ms`);
            }
          }
        });
        observer.observe({ entryTypes: ["paint"] });
      } catch (e) {
        // PerformanceObserver not supported
      }
    }
  }
};
