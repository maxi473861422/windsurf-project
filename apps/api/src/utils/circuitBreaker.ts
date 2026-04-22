/**
 * Circuit Breaker Pattern for Redis
 * Prevents cascading failures when Redis is unavailable
 */

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerConfig {
  failureThreshold: number;      // Number of failures before opening
  successThreshold: number;       // Number of successes before closing
  timeout: number;                // Time in ms to wait before trying again
  monitoringPeriod: number;      // Time in ms to monitor for failures
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number = 0;
  private nextAttemptTime: number = 0;
  private config: CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig = {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 60000,        // 1 minute
    monitoringPeriod: 10000, // 10 seconds
  }) {
    this.config = config;
  }

  private reset(): void {
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
  }

  private canAttempt(): boolean {
    const now = Date.now();
    return now >= this.nextAttemptTime;
  }

  private recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = Date.now() + this.config.timeout;
      console.warn(`Circuit breaker opened after ${this.failureCount} failures`);
    }
  }

  private recordSuccess(): void {
    this.successCount++;

    if (this.state === CircuitState.HALF_OPEN) {
      if (this.successCount >= this.config.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.reset();
        console.info('Circuit breaker closed after recovery');
      }
    } else if (this.state === CircuitState.CLOSED) {
      this.failureCount = 0; // Reset on success in closed state
    }
  }

  getState(): CircuitState {
    // Auto-transition from OPEN to HALF_OPEN when timeout expires
    if (this.state === CircuitState.OPEN && this.canAttempt()) {
      this.state = CircuitState.HALF_OPEN;
      this.successCount = 0;
      console.info('Circuit breaker moved to HALF_OPEN state');
    }

    return this.state;
  }

  async execute<T>(operation: () => Promise<T>, fallback?: () => Promise<T>): Promise<T> {
    const currentState = this.getState();

    if (currentState === CircuitState.OPEN && !this.canAttempt()) {
      if (fallback) {
        console.warn('Circuit breaker OPEN, using fallback');
        return fallback();
      }
      throw new Error('Circuit breaker is OPEN');
    }

    try {
      const result = await operation();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();

      if (currentState === CircuitState.HALF_OPEN) {
        // Back to OPEN if fails in HALF_OPEN
        this.state = CircuitState.OPEN;
        this.nextAttemptTime = Date.now() + this.config.timeout;
        console.warn('Circuit breaker returned to OPEN state after failure in HALF_OPEN');
      }

      if (fallback) {
        console.warn('Operation failed, using fallback');
        return fallback();
      }

      throw error;
    }
  }

  getStats() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
    };
  }

  resetCircuit(): void {
    this.state = CircuitState.CLOSED;
    this.reset();
    console.info('Circuit breaker manually reset to CLOSED');
  }
}

// Singleton instance for Redis
export const redisCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  successThreshold: 3,
  timeout: 60000,        // 1 minute
  monitoringPeriod: 10000, // 10 seconds
});
