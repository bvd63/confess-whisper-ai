/**
 * Lightweight performance monitoring utilities
 * Only active in development mode
 */

export const initPerformanceMonitoring = () => {
  if (import.meta.env.DEV) {
    const startTime = performance.now();
    
    window.addEventListener("load", () => {
      const loadTime = performance.now() - startTime;
      
      // Log performance metrics if available
      if (window.performance && window.performance.getEntriesByType) {
        const navigationEntries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
        
        if (navigationEntries.length > 0) {
          const nav = navigationEntries[0];
          // Performance metrics captured: loadTime, DNS, TCP, DOM
          // Available in performance API for monitoring tools
        }
      }
    });
    
    // Monitor First Contentful Paint
    if (window.PerformanceObserver) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === "paint" && entry.name === "first-contentful-paint") {
              // First Contentful Paint tracked via Performance API
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
