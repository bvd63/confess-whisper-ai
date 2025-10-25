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
    const reportedIssues = new Set<string>();
    
    // Check performance metrics every 60 seconds (reduced frequency)
    const interval = setInterval(() => {
      const metrics = observability.getMetricsSummary();
      
      Object.entries(metrics).forEach(([name, stats]) => {
        const issueKey = `${name}-${stats.p95 > budget.p95Threshold ? 'error' : 'warn'}`;
        
        // Only log each unique issue once per session to reduce console spam
        if (reportedIssues.has(issueKey)) return;
        
        if (stats.p95 > budget.p95Threshold) {
          console.error(`🚨 PERFORMANCE BUDGET EXCEEDED: ${name} p95=${stats.p95}ms (limit: ${budget.p95Threshold}ms)`);
          reportedIssues.add(issueKey);
        } else if (stats.p95 > budget.warningThreshold) {
          console.warn(`⚠️ PERFORMANCE WARNING: ${name} p95=${stats.p95}ms (approaching limit: ${budget.p95Threshold}ms)`);
          reportedIssues.add(issueKey);
        }
      });
    }, 60000); // Increased to 60s

    return () => clearInterval(interval);
  }, [budget]);
};
