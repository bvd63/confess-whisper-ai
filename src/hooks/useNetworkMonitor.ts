import { useEffect, useCallback, useRef } from 'react';

interface NetworkMonitorMetrics {
  totalRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  slowRequests: number;
}

export const useNetworkMonitor = () => {
  const metricsRef = useRef<NetworkMonitorMetrics>({
    totalRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    slowRequests: 0,
  });
  const requestTimesRef = useRef<number[]>([]);

  const logRequest = useCallback((url: string, duration: number, success: boolean) => {
    metricsRef.current.totalRequests++;
    
    if (!success) {
      metricsRef.current.failedRequests++;
    }

    requestTimesRef.current.push(duration);
    
    // Keep only last 100 requests
    if (requestTimesRef.current.length > 100) {
      requestTimesRef.current.shift();
    }

    // Calculate average
    const sum = requestTimesRef.current.reduce((a, b) => a + b, 0);
    metricsRef.current.averageResponseTime = sum / requestTimesRef.current.length;

    // Count slow requests (>1s)
    if (duration > 1000) {
      metricsRef.current.slowRequests++;
    }

    // Log warnings in development
    if (process.env.NODE_ENV === 'development') {
      if (duration > 1000) {
        console.warn(`[Network] Slow request detected: ${url} (${duration}ms)`);
      }
      if (!success) {
        console.error(`[Network] Failed request: ${url}`);
      }
    }
  }, []);

  const getMetrics = useCallback(() => {
    return { ...metricsRef.current };
  }, []);

  useEffect(() => {
    // Intercept fetch for monitoring
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      const startTime = performance.now();
      const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
      
      
      try {
        const response = await originalFetch(...args);
        const duration = performance.now() - startTime;
        logRequest(url, duration, response.ok);
        return response;
      } catch (error) {
        const duration = performance.now() - startTime;
        logRequest(url, duration, false);
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [logRequest]);

  return { getMetrics, logRequest };
};
