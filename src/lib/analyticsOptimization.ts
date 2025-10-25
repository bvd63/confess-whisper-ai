/**
 * Analytics optimization utilities
 * Batch and throttle analytics events to reduce network calls
 */

interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp: number;
}

class AnalyticsOptimizer {
  private queue: AnalyticsEvent[] = [];
  private flushTimeout: NodeJS.Timeout | null = null;
  private readonly maxBatchSize = 10;
  private readonly flushInterval = 5000; // 5 seconds

  /**
   * Add event to queue and schedule flush
   */
  track(eventName: string, properties?: Record<string, any>) {
    this.queue.push({
      name: eventName,
      properties,
      timestamp: Date.now(),
    });

    // Auto-flush if batch size reached
    if (this.queue.length >= this.maxBatchSize) {
      this.flush();
    } else {
      this.scheduleFlush();
    }
  }

  /**
   * Schedule automatic flush
   */
  private scheduleFlush() {
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
    }

    this.flushTimeout = setTimeout(() => {
      this.flush();
    }, this.flushInterval);
  }

  /**
   * Send all queued events to analytics endpoint
   */
  private async flush() {
    if (this.queue.length === 0) return;

    const events = [...this.queue];
    this.queue = [];

    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }

    try {
      // Send batched events
      // In production, replace with actual analytics endpoint
      if (import.meta.env.DEV) {
        console.log('📊 Analytics batch:', events.length, 'events');
      }

      // Example: Send to your analytics service
      // await fetch('/api/analytics/batch', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ events }),
      // });
    } catch (error) {
      console.error('Failed to send analytics batch:', error);
      // Re-queue failed events
      this.queue.unshift(...events);
    }
  }

  /**
   * Force flush all pending events
   */
  forceFlush() {
    this.flush();
  }
}

// Singleton instance
export const analyticsOptimizer = new AnalyticsOptimizer();

/**
 * Optimized track function - batches events automatically
 */
export const trackOptimized = (eventName: string, properties?: Record<string, any>) => {
  analyticsOptimizer.track(eventName, properties);
};

/**
 * Flush analytics before page unload
 */
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    analyticsOptimizer.forceFlush();
  });

  // Also flush when page becomes hidden
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      analyticsOptimizer.forceFlush();
    }
  });
}
