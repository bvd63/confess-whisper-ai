import { useEffect } from 'react';
import { observability } from '@/lib/observability';

interface PerformanceBudget {
  p95Threshold: number;
  warningThreshold: number;
}

const DEFAULT_BUDGET: PerformanceBudget = {
  p95Threshold: 200, // Critical: p95 must stay under 200ms
  warningThreshold: 150, // Warning: approaching limit
};

export const usePerformanceBudget = (budget: PerformanceBudget = DEFAULT_BUDGET) => {
  useEffect(() => {
    // Check performance metrics every 30 seconds
    const interval = setInterval(() => {
      const metrics = observability.getMetricsSummary();
      
      Object.entries(metrics).forEach(([name, stats]) => {
        if (stats.p95 > budget.p95Threshold) {
          console.error(`🚨 PERFORMANCE BUDGET EXCEEDED: ${name} p95=${stats.p95}ms (limit: ${budget.p95Threshold}ms)`);
        } else if (stats.p95 > budget.warningThreshold) {
          console.warn(`⚠️ PERFORMANCE WARNING: ${name} p95=${stats.p95}ms (approaching limit: ${budget.p95Threshold}ms)`);
        }
      });
    }, 30000);

    return () => clearInterval(interval);
  }, [budget]);
};
