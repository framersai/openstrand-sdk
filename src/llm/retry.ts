/**
 * Retry Logic with Exponential Backoff
 * @module llm/retry
 */

import type { RetryConfig } from './types';
import { LLMError } from './types';

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialBackoffMs: 1000,
  maxBackoffMs: 60000,
  backoffMultiplier: 2,
  jitter: 0.1,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

/**
 * Calculate backoff delay with jitter
 * 
 * @param attempt - Current attempt number (0-indexed)
 * @param config - Retry configuration
 * @returns Delay in milliseconds
 */
export function calculateBackoff(attempt: number, config: RetryConfig): number {
  const exponentialDelay = config.initialBackoffMs * Math.pow(config.backoffMultiplier, attempt);
  const cappedDelay = Math.min(exponentialDelay, config.maxBackoffMs);
  const jitterRange = cappedDelay * config.jitter;
  const jitter = Math.random() * jitterRange - jitterRange / 2;
  return Math.max(0, cappedDelay + jitter);
}

/**
 * Check if error is retryable
 * 
 * @param error - Error to check
 * @param config - Retry configuration
 * @returns True if retryable
 */
export function isRetryableError(error: unknown, config: RetryConfig): boolean {
  if (error instanceof LLMError) {
    if (!error.retryable) return false;
    if (error.statusCode && config.retryableStatuses.includes(error.statusCode)) {
      return true;
    }
  }
  
  // Network errors are retryable
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (
      message.includes('timeout') ||
      message.includes('econnreset') ||
      message.includes('enotfound') ||
      message.includes('network')
    ) {
      return true;
    }
  }
  
  return false;
}

/**
 * Sleep for specified milliseconds
 * 
 * @param ms - Milliseconds to sleep
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 * 
 * @param fn - Function to retry
 * @param config - Retry configuration
 * @param onRetry - Callback on retry
 * @returns Function result
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  onRetry?: (attempt: number, error: Error) => void
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on last attempt
      if (attempt === config.maxRetries) {
        break;
      }
      
      // Check if retryable
      if (!isRetryableError(error, config)) {
        throw error;
      }
      
      // Calculate backoff
      const delayMs = calculateBackoff(attempt, config);
      
      // Notify callback
      if (onRetry) {
        onRetry(attempt + 1, lastError);
      }
      
      // Wait before retry
      await sleep(delayMs);
    }
  }
  
  // All retries exhausted
  throw new LLMError(
    `Failed after ${config.maxRetries + 1} attempts: ${lastError?.message}`,
    'openai', // Default provider
    undefined,
    false,
    lastError
  );
}

/**
 * Wrap a promise with timeout
 * 
 * @param promise - Promise to wrap
 * @param timeoutMs - Timeout in milliseconds
 * @param errorMessage - Error message on timeout
 * @returns Promise with timeout
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = 'Operation timed out'
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new LLMError(errorMessage, 'openai', 408, true));
    }, timeoutMs);
  });
  
  return Promise.race([promise, timeoutPromise]);
}

/**
 * Circuit breaker state
 */
interface CircuitBreakerState {
  failureCount: number;
  lastFailureTime: number;
  state: 'closed' | 'open' | 'half-open';
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeoutMs: number;
  halfOpenMaxAttempts: number;
}

/**
 * Circuit breaker for LLM requests
 * Prevents cascading failures by opening circuit after threshold
 */
export class CircuitBreaker {
  private state: CircuitBreakerState = {
    failureCount: 0,
    lastFailureTime: 0,
    state: 'closed',
  };
  
  constructor(
    private config: CircuitBreakerConfig = {
      failureThreshold: 5,
      resetTimeoutMs: 60000,
      halfOpenMaxAttempts: 3,
    }
  ) {}
  
  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check circuit state
    this.checkState();
    
    if (this.state.state === 'open') {
      throw new LLMError(
        'Circuit breaker is open (too many recent failures)',
        'openai',
        503,
        false
      );
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  /**
   * Check and update circuit state
   */
  private checkState(): void {
    const now = Date.now();
    const timeSinceLastFailure = now - this.state.lastFailureTime;
    
    if (this.state.state === 'open' && timeSinceLastFailure >= this.config.resetTimeoutMs) {
      this.state.state = 'half-open';
      this.state.failureCount = 0;
    }
  }
  
  /**
   * Handle successful request
   */
  private onSuccess(): void {
    if (this.state.state === 'half-open') {
      this.state.state = 'closed';
    }
    this.state.failureCount = 0;
  }
  
  /**
   * Handle failed request
   */
  private onFailure(): void {
    this.state.failureCount++;
    this.state.lastFailureTime = Date.now();
    
    if (this.state.failureCount >= this.config.failureThreshold) {
      this.state.state = 'open';
    }
  }
  
  /**
   * Get current circuit state
   */
  getState(): CircuitBreakerState['state'] {
    return this.state.state;
  }
  
  /**
   * Reset circuit breaker
   */
  reset(): void {
    this.state = {
      failureCount: 0,
      lastFailureTime: 0,
      state: 'closed',
    };
  }
}

