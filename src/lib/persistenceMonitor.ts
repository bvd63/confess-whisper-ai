/**
 * Performance monitoring for persistence operations
 * Tracks operation times, success rates, and cache hit rates
 */
import { logWarn } from '@/lib/logger';

interface OperationMetric {
  operation: string;
  duration: number;
  success: boolean;
  timestamp: number;
}

class PersistenceMonitor {
  private metrics: OperationMetric[] = [];
  private maxMetrics = 1000;

  async trackOperation<T>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now();
    let success = false;
    
    try {
      const result = await fn();
      success = true;
      return result;
    } catch (error) {
      success = false;
      throw error;
    } finally {
      const duration = performance.now() - startTime;
      this.recordMetric({
        operation,
        duration,
        success,
        timestamp: Date.now()
      });

      // Log slow operations
      if (duration > 100) {
        logWarn(`Slow persistence operation: ${operation} took ${duration.toFixed(2)}ms`);
      }
    }
  }

  private recordMetric(metric: OperationMetric): void {
    this.metrics.push(metric);
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  getStats() {
    const now = Date.now();
    const recentMetrics = this.metrics.filter(m => now - m.timestamp < 60000); // Last minute

    const avgDuration = recentMetrics.length > 0
      ? recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length
      : 0;

    const successRate = recentMetrics.length > 0
      ? recentMetrics.filter(m => m.success).length / recentMetrics.length
      : 1;

    const p95Duration = this.calculatePercentile(recentMetrics, 0.95);

    return {
      totalOperations: recentMetrics.length,
      avgDuration: avgDuration.toFixed(2),
      p95Duration: p95Duration.toFixed(2),
      successRate: (successRate * 100).toFixed(1),
      slowOperations: recentMetrics.filter(m => m.duration > 100).length
    };
  }

  private calculatePercentile(metrics: OperationMetric[], percentile: number): number {
    if (metrics.length === 0) return 0;
    
    const sorted = [...metrics].sort((a, b) => a.duration - b.duration);
    const index = Math.ceil(sorted.length * percentile) - 1;
    return sorted[index]?.duration || 0;
  }

  reset(): void {
    this.metrics = [];
  }
}

export const persistenceMonitor = new PersistenceMonitor();
