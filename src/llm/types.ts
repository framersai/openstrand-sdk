/**
 * LLM Provider Abstraction Types
 * @module llm/types
 */

import type { z } from 'zod';

/**
 * Supported LLM providers
 */
export type LLMProvider = 
  | 'openai'
  | 'anthropic'
  | 'groq'
  | 'openrouter'
  | 'ollama'
  | 'azure'
  | 'vllm';

/**
 * LLM request options
 */
export interface LLMRequestOptions<TInput = unknown> {
  /** Model name (e.g., gpt-4, claude-3-sonnet) */
  model: string;
  
  /** Input prompt or structured data */
  input: TInput;
  
  /** System prompt */
  systemPrompt?: string;
  
  /** Temperature (0-2) */
  temperature?: number;
  
  /** Max tokens to generate */
  maxTokens?: number;
  
  /** Top P sampling */
  topP?: number;
  
  /** Frequency penalty */
  frequencyPenalty?: number;
  
  /** Presence penalty */
  presencePenalty?: number;
  
  /** Stop sequences */
  stop?: string[];
  
  /** JSON mode (force JSON output) */
  json?: boolean;
  
  /** Streaming callback */
  onStream?: (chunk: string) => void;
  
  /** Request timeout (ms) */
  timeout?: number;
  
  /** Metadata */
  metadata?: Record<string, unknown>;
}

/**
 * LLM response
 */
export interface LLMResponse<TOutput = unknown> {
  /** Generated content */
  content: TOutput;
  
  /** Provider that handled the request */
  provider: LLMProvider;
  
  /** Model used */
  model: string;
  
  /** Token usage */
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  
  /** Latency in ms */
  latencyMs: number;
  
  /** Estimated cost in USD */
  costUsd?: number;
  
  /** Finish reason */
  finishReason?: 'stop' | 'length' | 'content_filter' | 'error';
  
  /** Metadata */
  metadata?: Record<string, unknown>;
}

/**
 * LLM provider configuration
 */
export interface LLMProviderConfig {
  /** API key or credentials */
  apiKey?: string;
  
  /** Base URL (for custom deployments) */
  baseUrl?: string;
  
  /** Organization ID (OpenAI) */
  organization?: string;
  
  /** Default model */
  defaultModel?: string;
  
  /** Request timeout (ms) */
  timeout?: number;
  
  /** Max retries */
  maxRetries?: number;
  
  /** Additional headers */
  headers?: Record<string, string>;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  /** Max retry attempts */
  maxRetries: number;
  
  /** Initial backoff (ms) */
  initialBackoffMs: number;
  
  /** Max backoff (ms) */
  maxBackoffMs: number;
  
  /** Backoff multiplier */
  backoffMultiplier: number;
  
  /** Jitter (0-1) */
  jitter: number;
  
  /** Retry on these status codes */
  retryableStatuses: number[];
}

/**
 * Structured LLM request with Zod schemas
 */
export interface StructuredLLMRequest<TInput extends z.ZodType, TOutput extends z.ZodType> {
  /** Input schema */
  inputSchema: TInput;
  
  /** Output schema */
  outputSchema: TOutput;
  
  /** Input data */
  input: z.infer<TInput>;
  
  /** System prompt template */
  systemPrompt?: string | ((input: z.infer<TInput>) => string);
  
  /** User prompt template */
  userPrompt: string | ((input: z.infer<TInput>) => string);
  
  /** Model */
  model?: string;
  
  /** Options */
  options?: Partial<LLMRequestOptions>;
}

/**
 * Token budget tracker
 */
export interface TokenBudget {
  /** Daily token limit */
  dailyLimit: number;
  
  /** Current daily usage */
  dailyUsage: number;
  
  /** Monthly token limit */
  monthlyLimit: number;
  
  /** Current monthly usage */
  monthlyUsage: number;
  
  /** Reset timestamp */
  resetsAt: Date;
}

/**
 * LLM error
 */
export class LLMError extends Error {
  constructor(
    message: string,
    public readonly provider: LLMProvider,
    public readonly statusCode?: number,
    public readonly retryable: boolean = false,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'LLMError';
  }
}

/**
 * Cost estimate per model
 */
export interface ModelCostConfig {
  provider: LLMProvider;
  model: string;
  costPerInputToken: number; // USD
  costPerOutputToken: number; // USD
}

