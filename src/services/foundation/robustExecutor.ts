/**
 * Comprehensive Error Handling System for LOS Agent
 * Provides standardized error handling, retry logic, and circuit breaker patterns
 */

export class StandardizedError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: any,
    public retryable: boolean = true
  ) {
    super(message);
    this.name = 'StandardizedError';
  }
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
}

export class RobustAgentExecutor {
  private retryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    retryableErrors: ['NETWORK_ERROR', 'TIMEOUT', 'RATE_LIMIT', 'TEMPORARY_FAILURE']
  };

  private circuitBreakerConfig: CircuitBreakerConfig = {
    failureThreshold: 5,
    recoveryTimeout: 30000,
    monitoringPeriod: 60000
  };

  private circuitBreakerState: Map<string, {
    failures: number;
    lastFailure: number;
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  }> = new Map();

  /**
   * Execute operation with comprehensive error handling and retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    customRetryConfig?: Partial<RetryConfig>
  ): Promise<T> {
    const config = { ...this.retryConfig, ...customRetryConfig };
    
    // Check circuit breaker
    if (!this.isCircuitBreakerOpen(operationName)) {
      throw new StandardizedError(
        `Circuit breaker is OPEN for ${operationName}`,
        'CIRCUIT_BREAKER_OPEN',
        { operationName },
        false
      );
    }

    let lastError: Error;
    
    for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
      try {
        const result = await operation();
        
        // Reset circuit breaker on success
        this.resetCircuitBreaker(operationName);
        
        return result;
      } catch (error) {
        lastError = error;
        
        // Check if error is retryable
        if (!this.isRetryableError(error, config.retryableErrors)) {
          this.recordCircuitBreakerFailure(operationName);
          throw this.standardizeError(error, operationName, attempt);
        }
        
        // If this is the last attempt, don't wait
        if (attempt === config.maxRetries) {
          this.recordCircuitBreakerFailure(operationName);
          throw this.standardizeError(error, operationName, attempt);
        }
        
        // Calculate delay with exponential backoff
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
          config.maxDelay
        );
        
        console.warn(`Attempt ${attempt} failed for ${operationName}, retrying in ${delay}ms:`, error);
        await this.sleep(delay);
      }
    }
    
    this.recordCircuitBreakerFailure(operationName);
    throw this.standardizeError(lastError!, operationName, config.maxRetries);
  }

  /**
   * Execute multiple operations in parallel with individual error handling
   */
  async executeParallel<T>(
    operations: Array<{
      operation: () => Promise<T>;
      name: string;
      retryConfig?: Partial<RetryConfig>;
    }>
  ): Promise<Array<{ success: boolean; result?: T; error?: StandardizedError; name: string }>> {
    const promises = operations.map(async ({ operation, name, retryConfig }) => {
      try {
        const result = await this.executeWithRetry(operation, name, retryConfig);
        return { success: true, result, name };
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof StandardizedError ? error : this.standardizeError(error, name, 1),
          name 
        };
      }
    });

    return Promise.all(promises);
  }

  /**
   * Circuit breaker implementation
   */
  private isCircuitBreakerOpen(operationName: string): boolean {
    const state = this.circuitBreakerState.get(operationName);
    if (!state) return true; // First time, allow operation

    if (state.state === 'OPEN') {
      // Check if recovery timeout has passed
      if (Date.now() - state.lastFailure > this.circuitBreakerConfig.recoveryTimeout) {
        state.state = 'HALF_OPEN';
        return true;
      }
      return false;
    }

    return true;
  }

  private recordCircuitBreakerFailure(operationName: string): void {
    const state = this.circuitBreakerState.get(operationName) || {
      failures: 0,
      lastFailure: 0,
      state: 'CLOSED' as const
    };

    state.failures++;
    state.lastFailure = Date.now();

    if (state.failures >= this.circuitBreakerConfig.failureThreshold) {
      state.state = 'OPEN';
      console.error(`Circuit breaker OPENED for ${operationName} after ${state.failures} failures`);
    }

    this.circuitBreakerState.set(operationName, state);
  }

  private resetCircuitBreaker(operationName: string): void {
    const state = this.circuitBreakerState.get(operationName);
    if (state) {
      state.failures = 0;
      state.state = 'CLOSED';
      this.circuitBreakerState.set(operationName, state);
    }
  }

  /**
   * Error classification and standardization
   */
  private isRetryableError(error: any, retryableErrors: string[]): boolean {
    if (error instanceof StandardizedError) {
      return error.retryable && retryableErrors.includes(error.code);
    }

    // Check for common retryable error patterns
    const errorMessage = error?.message?.toLowerCase() || '';
    const errorCode = error?.code?.toUpperCase() || '';
    
    return retryableErrors.some(retryableError => 
      errorCode.includes(retryableError) || 
      errorMessage.includes(retryableError.toLowerCase())
    );
  }

  private standardizeError(error: any, operationName: string, attempt: number): StandardizedError {
    if (error instanceof StandardizedError) {
      return error;
    }

    // Classify error type
    let code = 'UNKNOWN_ERROR';
    let retryable = true;

    if (error?.message?.includes('fetch')) {
      code = 'NETWORK_ERROR';
    } else if (error?.message?.includes('timeout')) {
      code = 'TIMEOUT';
    } else if (error?.message?.includes('rate limit')) {
      code = 'RATE_LIMIT';
    } else if (error?.message?.includes('unauthorized')) {
      code = 'AUTH_ERROR';
      retryable = false;
    } else if (error?.message?.includes('not found')) {
      code = 'NOT_FOUND';
      retryable = false;
    }

    return new StandardizedError(
      `${operationName} failed after ${attempt} attempts: ${error?.message || 'Unknown error'}`,
      code,
      { 
        operationName, 
        attempt, 
        originalError: error,
        timestamp: new Date().toISOString()
      },
      retryable
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get circuit breaker status for monitoring
   */
  getCircuitBreakerStatus(): Record<string, any> {
    const status: Record<string, any> = {};
    
    for (const [operationName, state] of this.circuitBreakerState.entries()) {
      status[operationName] = {
        state: state.state,
        failures: state.failures,
        lastFailure: new Date(state.lastFailure).toISOString(),
        isOpen: state.state === 'OPEN'
      };
    }
    
    return status;
  }

  /**
   * Reset all circuit breakers (for testing or manual recovery)
   */
  resetAllCircuitBreakers(): void {
    this.circuitBreakerState.clear();}
}

// Global instance for use throughout the application
export const robustExecutor = new RobustAgentExecutor();
