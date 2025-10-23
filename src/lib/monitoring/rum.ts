/**
 * Real User Monitoring (RUM) system
 * Tracks Web Vitals, user journey, errors, and API performance
 */

interface WebVital {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
}

interface UserJourneyEvent {
  type: 'click' | 'navigation' | 'scroll' | 'form_submit';
  target: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface APIPerformance {
  endpoint: string;
  method: string;
  duration: number;
  status: number;
  timestamp: number;
}

interface ErrorEvent {
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: number;
  url: string;
  userAgent: string;
}

class RealUserMonitoring {
  private webVitals: WebVital[] = [];
  private userJourney: UserJourneyEvent[] = [];
  private apiPerformance: APIPerformance[] = [];
  private errors: ErrorEvent[] = [];
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.init();
  }

  /**
   * Initialize RUM tracking
   */
  private init() {
    if (typeof window === 'undefined') return;

    // Track Web Vitals
    this.trackWebVitals();

    // Track user journey
    this.trackUserJourney();

    // Track errors
    this.trackErrors();

    // Track API performance
    this.trackAPIPerformance();

    // Send data periodically
    this.startPeriodicSync();
  }

  /**
   * Track Core Web Vitals (LCP, FID, CLS, TTFB)
   */
  private trackWebVitals() {
    if ('PerformanceObserver' in window) {
      // Largest Contentful Paint
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          
          this.recordWebVital({
            name: 'LCP',
            value: lastEntry.renderTime || lastEntry.loadTime,
            rating: this.getRating('LCP', lastEntry.renderTime || lastEntry.loadTime),
            timestamp: Date.now(),
          });
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {
        console.warn('LCP tracking failed:', e);
      }

      // First Input Delay
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            this.recordWebVital({
              name: 'FID',
              value: entry.processingStart - entry.startTime,
              rating: this.getRating('FID', entry.processingStart - entry.startTime),
              timestamp: Date.now(),
            });
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
      } catch (e) {
        console.warn('FID tracking failed:', e);
      }

      // Cumulative Layout Shift
      try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          
          this.recordWebVital({
            name: 'CLS',
            value: clsValue,
            rating: this.getRating('CLS', clsValue),
            timestamp: Date.now(),
          });
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (e) {
        console.warn('CLS tracking failed:', e);
      }
    }

    // Time to First Byte
    if ('performance' in window && 'timing' in window.performance) {
      const timing = window.performance.timing as any;
      const ttfb = timing.responseStart - timing.requestStart;
      
      this.recordWebVital({
        name: 'TTFB',
        value: ttfb,
        rating: this.getRating('TTFB', ttfb),
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Track user journey (clicks, navigation, scrolls)
   */
  private trackUserJourney() {
    // Track clicks
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      this.recordJourneyEvent({
        type: 'click',
        target: this.getElementSelector(target),
        timestamp: Date.now(),
        metadata: {
          x: e.clientX,
          y: e.clientY,
        },
      });
    });

    // Track navigation
    window.addEventListener('popstate', () => {
      this.recordJourneyEvent({
        type: 'navigation',
        target: window.location.pathname,
        timestamp: Date.now(),
      });
    });

    // Track scroll depth
    let maxScrollDepth = 0;
    window.addEventListener('scroll', () => {
      const scrollDepth = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
      if (scrollDepth > maxScrollDepth) {
        maxScrollDepth = scrollDepth;
        this.recordJourneyEvent({
          type: 'scroll',
          target: 'page',
          timestamp: Date.now(),
          metadata: {
            depth: Math.round(scrollDepth),
          },
        });
      }
    });
  }

  /**
   * Track JavaScript errors
   */
  private trackErrors() {
    window.addEventListener('error', (event) => {
      this.recordError({
        message: event.message,
        stack: event.error?.stack,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.recordError({
        message: `Unhandled Promise Rejection: ${event.reason}`,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      });
    });
  }

  /**
   * Track API performance using PerformanceObserver
   */
  private trackAPIPerformance() {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (entry.initiatorType === 'fetch' || entry.initiatorType === 'xmlhttprequest') {
              this.recordAPIPerformance({
                endpoint: entry.name,
                method: 'GET', // Default, can be enhanced
                duration: entry.duration,
                status: 200, // Default, can be enhanced
                timestamp: Date.now(),
              });
            }
          });
        });
        observer.observe({ entryTypes: ['resource'] });
      } catch (e) {
        console.warn('API performance tracking failed:', e);
      }
    }
  }

  /**
   * Get performance rating based on thresholds
   */
  private getRating(metric: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    const thresholds: Record<string, { good: number; poor: number }> = {
      LCP: { good: 2500, poor: 4000 },
      FID: { good: 100, poor: 300 },
      CLS: { good: 0.1, poor: 0.25 },
      TTFB: { good: 800, poor: 1800 },
    };

    const threshold = thresholds[metric];
    if (!threshold) return 'good';

    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  }

  /**
   * Helper to get element selector
   */
  private getElementSelector(element: HTMLElement): string {
    if (element.id) return `#${element.id}`;
    if (element.className) return `.${element.className.split(' ')[0]}`;
    return element.tagName.toLowerCase();
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Record methods
   */
  private recordWebVital(vital: WebVital) {
    this.webVitals.push(vital);
  }

  private recordJourneyEvent(event: UserJourneyEvent) {
    // Limit to last 100 events
    if (this.userJourney.length >= 100) {
      this.userJourney.shift();
    }
    this.userJourney.push(event);
  }

  private recordAPIPerformance(perf: APIPerformance) {
    // Limit to last 50 API calls
    if (this.apiPerformance.length >= 50) {
      this.apiPerformance.shift();
    }
    this.apiPerformance.push(perf);
  }

  private recordError(error: ErrorEvent) {
    this.errors.push(error);
  }

  /**
   * Send data to backend periodically
   */
  private startPeriodicSync() {
    setInterval(() => {
      this.sendData();
    }, 60000); // Every minute
  }

  /**
   * Send RUM data to backend
   */
  private async sendData() {
    if (this.webVitals.length === 0 && this.errors.length === 0) return;

    const data = {
      sessionId: this.sessionId,
      webVitals: this.webVitals,
      userJourney: this.userJourney.slice(-20), // Last 20 events
      apiPerformance: this.apiPerformance,
      errors: this.errors,
      timestamp: Date.now(),
    };

    try {
      // Send to analytics endpoint (implement this in your backend)
      await fetch('/api/rum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      // Clear sent data
      this.webVitals = [];
      this.errors = [];
    } catch (error) {
      console.error('Failed to send RUM data:', error);
    }
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return {
      sessionId: this.sessionId,
      webVitals: this.webVitals,
      userJourney: this.userJourney,
      apiPerformance: this.apiPerformance,
      errors: this.errors,
    };
  }
}

export const rum = new RealUserMonitoring();
