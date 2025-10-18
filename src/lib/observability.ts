import { v4 as uuidv4 } from 'uuid';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  requestId?: string;
  userId?: string;
  action?: string;
  metadata?: Record<string, any>;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count';
  timestamp: number;
  requestId?: string;
  tags?: Record<string, string>;
}

class ObservabilityService {
  private requestId: string | null = null;
  private metrics: PerformanceMetric[] = [];
  private readonly MAX_METRICS = 1000;

  generateRequestId(): string {
    this.requestId = uuidv4();
    return this.requestId;
  }

  getCurrentRequestId(): string | null {
    return this.requestId;
  }

  log(level: LogLevel, message: string, context?: LogContext) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      requestId: context?.requestId || this.requestId,
      userId: context?.userId,
      action: context?.action,
      metadata: context?.metadata,
    };

    // Structured logging in JSON format
    if (import.meta.env.DEV) {
      console.log(JSON.stringify(logEntry, null, 2));
    } else {
      console.log(JSON.stringify(logEntry));
    }

    // Send to analytics in production
    if (!import.meta.env.DEV && level === 'error') {
      this.sendErrorToAnalytics(logEntry);
    }
  }

  debug(message: string, context?: LogContext) {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error, context?: LogContext) {
    const errorContext = {
      ...context,
      metadata: {
        ...context?.metadata,
        error: error ? {
          message: error.message,
          stack: error.stack,
          name: error.name,
        } : undefined,
      },
    };
    this.log('error', message, errorContext);
  }

  recordMetric(metric: Omit<PerformanceMetric, 'timestamp' | 'requestId'>) {
    const fullMetric: PerformanceMetric = {
      ...metric,
      timestamp: Date.now(),
      requestId: this.requestId || undefined,
    };

    this.metrics.push(fullMetric);

    // Keep only last MAX_METRICS
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }

    this.info(`Metric recorded: ${metric.name}`, {
      metadata: { metric: fullMetric },
    });
  }

  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  clearMetrics() {
    this.metrics = [];
  }

  // Measure execution time
  async measureAsync<T>(
    name: string,
    fn: () => Promise<T>,
    tags?: Record<string, string>
  ): Promise<T> {
    const startTime = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - startTime;
      
      this.recordMetric({
        name,
        value: duration,
        unit: 'ms',
        tags,
      });

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      this.recordMetric({
        name: `${name}_error`,
        value: duration,
        unit: 'ms',
        tags: { ...tags, error: 'true' },
      });

      throw error;
    }
  }

  measureSync<T>(
    name: string,
    fn: () => T,
    tags?: Record<string, string>
  ): T {
    const startTime = performance.now();
    try {
      const result = fn();
      const duration = performance.now() - startTime;
      
      this.recordMetric({
        name,
        value: duration,
        unit: 'ms',
        tags,
      });

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      this.recordMetric({
        name: `${name}_error`,
        value: duration,
        unit: 'ms',
        tags: { ...tags, error: 'true' },
      });

      throw error;
    }
  }

  private async sendErrorToAnalytics(logEntry: any) {
    try {
      // This would send to your analytics backend
      await fetch('/api/analytics/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logEntry),
      });
    } catch (e) {
      // Fail silently to avoid infinite loops
      console.error('Failed to send error to analytics', e);
    }
  }

  // Get aggregated metrics
  getMetricsSummary() {
    const summary: Record<string, {
      count: number;
      avg: number;
      min: number;
      max: number;
      p95: number;
      p99: number;
    }> = {};

    const metricsByName = this.metrics.reduce((acc, metric) => {
      if (!acc[metric.name]) {
        acc[metric.name] = [];
      }
      acc[metric.name].push(metric.value);
      return acc;
    }, {} as Record<string, number[]>);

    Object.entries(metricsByName).forEach(([name, values]) => {
      const sorted = [...values].sort((a, b) => a - b);
      const sum = values.reduce((a, b) => a + b, 0);
      
      summary[name] = {
        count: values.length,
        avg: sum / values.length,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        p95: sorted[Math.floor(sorted.length * 0.95)],
        p99: sorted[Math.floor(sorted.length * 0.99)],
      };
    });

    return summary;
  }
}

export const observability = new ObservabilityService();
