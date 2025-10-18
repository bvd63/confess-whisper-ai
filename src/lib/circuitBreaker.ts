import { observability } from './observability';

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerOptions {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  resetTimeout: number;
  name: string;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private nextAttempt = Date.now();
  private readonly options: CircuitBreakerOptions;

  constructor(options: Partial<CircuitBreakerOptions> = {}) {
    this.options = {
      failureThreshold: options.failureThreshold || 5,
      successThreshold: options.successThreshold || 2,
      timeout: options.timeout || 60000, // 1 minute
      resetTimeout: options.resetTimeout || 30000, // 30 seconds
      name: options.name || 'circuit-breaker',
    };

    observability.info(`Circuit breaker initialized: ${this.options.name}`, {
      metadata: { options: this.options },
    });
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        const error = new Error(`Circuit breaker is OPEN for ${this.options.name}`);
        observability.warn('Circuit breaker blocked request', {
          metadata: {
            name: this.options.name,
            state: this.state,
            nextAttempt: new Date(this.nextAttempt).toISOString(),
          },
        });
        throw error;
      }
      this.state = CircuitState.HALF_OPEN;
      this.successCount = 0;
      observability.info(`Circuit breaker transitioning to HALF_OPEN: ${this.options.name}`);
    }

    try {
      const result = await Promise.race([
        fn(),
        this.timeout(),
      ]);

      this.onSuccess();
      return result as T;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private timeout(): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Circuit breaker timeout after ${this.options.timeout}ms`));
      }, this.options.timeout);
    });
  }

  private onSuccess() {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      
      if (this.successCount >= this.options.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
        observability.info(`Circuit breaker CLOSED: ${this.options.name}`);
      }
    }

    observability.recordMetric({
      name: `circuit_breaker_${this.options.name}_success`,
      value: 1,
      unit: 'count',
      tags: { state: this.state },
    });
  }

  private onFailure() {
    this.failureCount++;
    
    observability.recordMetric({
      name: `circuit_breaker_${this.options.name}_failure`,
      value: 1,
      unit: 'count',
      tags: { state: this.state },
    });

    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
      this.nextAttempt = Date.now() + this.options.resetTimeout;
      observability.warn(`Circuit breaker OPEN (from HALF_OPEN): ${this.options.name}`, {
        metadata: { nextAttempt: new Date(this.nextAttempt).toISOString() },
      });
      return;
    }

    if (this.failureCount >= this.options.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.nextAttempt = Date.now() + this.options.resetTimeout;
      observability.error(`Circuit breaker OPEN: ${this.options.name}`, undefined, {
        metadata: {
          failureCount: this.failureCount,
          threshold: this.options.failureThreshold,
          nextAttempt: new Date(this.nextAttempt).toISOString(),
        },
      });
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  getStats() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      nextAttempt: new Date(this.nextAttempt).toISOString(),
    };
  }

  reset() {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = Date.now();
    observability.info(`Circuit breaker manually reset: ${this.options.name}`);
  }
}

// Pre-configured circuit breakers for common services
export const circuitBreakers = {
  supabase: new CircuitBreaker({
    name: 'supabase',
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 10000,
    resetTimeout: 30000,
  }),
  
  ai: new CircuitBreaker({
    name: 'ai-service',
    failureThreshold: 3,
    successThreshold: 2,
    timeout: 30000,
    resetTimeout: 60000,
  }),
  
  storage: new CircuitBreaker({
    name: 'storage',
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 15000,
    resetTimeout: 30000,
  }),
};
