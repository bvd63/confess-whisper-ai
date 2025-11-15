/**
 * Lighthouse Performance Monitor
 * Tracks Core Web Vitals and provides auto-fix suggestions
 */
import { logWarn } from '@/lib/logger';

interface PerformanceBudget {
  lcp: number;      // Largest Contentful Paint
  fid: number;      // First Input Delay
  cls: number;      // Cumulative Layout Shift
  tti: number;      // Time to Interactive
  bundleSize: number; // KB gzipped
  fcp: number;      // First Contentful Paint
}

interface PerformanceMetrics {
  lcp?: number;
  fid?: number;
  cls?: number;
  tti?: number;
  fcp?: number;
  bundleSize?: number;
}

interface BudgetViolation {
  metric: keyof PerformanceBudget;
  actual: number;
  budget: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  suggestion: string;
}

interface BudgetReport {
  passed: boolean;
  violations: BudgetViolation[];
  score: number;
}

export class LighthouseMonitor {
  private budget: PerformanceBudget = {
    lcp: 1500,      // < 1.5s
    fid: 50,        // < 50ms
    cls: 0.05,      // < 0.05
    tti: 2000,      // < 2s
    bundleSize: 200, // < 200KB
    fcp: 1000,      // < 1s
  };

  private observer: PerformanceObserver | null = null;
  private metrics: PerformanceMetrics = {};

  /**
   * Initialize performance monitoring
   */
  init(): void {
    if (typeof window === 'undefined') return;

    // Observe LCP
    this.observeLCP();

    // Observe FID
    this.observeFID();

    // Observe CLS
    this.observeCLS();

    // Measure TTI
    this.measureTTI();

    // Measure FCP
    this.measureFCP();
  }

  private observeLCP(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as PerformanceEntry & { renderTime?: number; loadTime?: number };
        this.metrics.lcp = lastEntry.renderTime || lastEntry.loadTime || 0;
      });

      observer.observe({ type: 'largest-contentful-paint', buffered: true });
      this.observer = observer;
    } catch (error) {
      logWarn('[LighthouseMonitor] LCP observation not supported');
    }
  }

  private observeFID(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          const fidEntry = entry as PerformanceEntry & { processingStart?: number };
          this.metrics.fid = fidEntry.processingStart ? fidEntry.processingStart - entry.startTime : 0;
        });
      });

      observer.observe({ type: 'first-input', buffered: true });
    } catch (error) {
      logWarn('[LighthouseMonitor] FID observation not supported');
    }
  }

  private observeCLS(): void {
    try {
      let clsValue = 0;
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          const layoutShift = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
          if (!layoutShift.hadRecentInput) {
            clsValue += layoutShift.value || 0;
          }
        });
        this.metrics.cls = clsValue;
      });

      observer.observe({ type: 'layout-shift', buffered: true });
    } catch (error) {
      logWarn('[LighthouseMonitor] CLS observation not supported');
    }
  }

  private measureTTI(): void {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.metrics.tti = lastEntry.startTime;
        });

        observer.observe({ type: 'event', buffered: true });
      } catch (error) {
        // TTI calculation fallback
        setTimeout(() => {
          this.metrics.tti = performance.now();
        }, 0);
      }
    }
  }

  private measureFCP(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.name === 'first-contentful-paint') {
            this.metrics.fcp = entry.startTime;
          }
        });
      });

      observer.observe({ type: 'paint', buffered: true });
    } catch (error) {
      logWarn('[LighthouseMonitor] FCP observation not supported');
    }
  }

  /**
   * Get current metrics
   */
  getCurrentMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Check performance budget
   */
  checkBudget(): BudgetReport {
    const violations: BudgetViolation[] = [];

    Object.entries(this.budget).forEach(([key, limit]) => {
      const metricKey = key as keyof PerformanceBudget;
      const actual = this.metrics[metricKey];

      if (actual !== undefined && actual > limit) {
        violations.push({
          metric: metricKey,
          actual,
          budget: limit,
          severity: this.getSeverity(metricKey, actual, limit),
          suggestion: this.getSuggestion(metricKey),
        });
      }
    });

    const score = this.calculateScore(violations);

    return {
      passed: violations.length === 0,
      violations,
      score,
    };
  }

  private getSeverity(metric: keyof PerformanceBudget, actual: number, budget: number): 'low' | 'medium' | 'high' | 'critical' {
    const ratio = actual / budget;

    if (ratio > 2) return 'critical';
    if (ratio > 1.5) return 'high';
    if (ratio > 1.2) return 'medium';
    return 'low';
  }

  private getSuggestion(metric: keyof PerformanceBudget): string {
    const suggestions: Record<keyof PerformanceBudget, string> = {
      lcp: 'Optimize images, reduce server response time, preload critical resources',
      fid: 'Reduce JavaScript execution time, split long tasks, use web workers',
      cls: 'Set explicit dimensions on images/videos, reserve space for ads, avoid inserting content above existing content',
      tti: 'Minimize main thread work, reduce JavaScript bundle size, use code splitting',
      bundleSize: 'Enable tree-shaking, lazy load non-critical code, remove unused dependencies',
      fcp: 'Reduce server response time, eliminate render-blocking resources, optimize CSS delivery',
    };

    return suggestions[metric];
  }

  private calculateScore(violations: BudgetViolation[]): number {
    if (violations.length === 0) return 100;

    const severityWeights = {
      low: 5,
      medium: 10,
      high: 20,
      critical: 30,
    };

    const totalDeduction = violations.reduce((sum, v) => sum + severityWeights[v.severity], 0);
    return Math.max(0, 100 - totalDeduction);
  }

  /**
   * Get Lighthouse-like score
   */
  getLighthouseScore(): {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
  } {
    const budgetReport = this.checkBudget();

    return {
      performance: budgetReport.score,
      accessibility: 100, // Would need separate checks
      bestPractices: 100, // Would need separate checks
      seo: 100, // Would need separate checks
    };
  }

  /**
   * Auto-fix suggestions
   */
  getAutoFixSuggestions(): Array<{
    issue: string;
    fix: string;
    priority: 'high' | 'medium' | 'low';
  }> {
    const report = this.checkBudget();
    
    return report.violations.map(v => ({
      issue: `${v.metric.toUpperCase()}: ${v.actual.toFixed(2)}ms (budget: ${v.budget}ms)`,
      fix: v.suggestion,
      priority: v.severity === 'critical' || v.severity === 'high' ? 'high' : v.severity,
    }));
  }

  /**
   * Cleanup
   */
  disconnect(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}

// Export singleton
export const lighthouseMonitor = new LighthouseMonitor();

// Auto-init in browser
if (typeof window !== 'undefined') {
  lighthouseMonitor.init();
}
