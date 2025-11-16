/**
 * LLM Service - Main orchestrator for LLM requests
 * @module llm/service
 */

import type { z } from 'zod';
import type {
  LLMProvider,
  LLMRequestOptions,
  LLMResponse,
  StructuredLLMRequest,
  TokenBudget,
  RetryConfig,
} from './types';
import { LLMError, type ModelCostConfig } from './types';
import { AbstractLLMProvider, ProviderRegistry } from './provider';
import { withRetry, withTimeout, CircuitBreaker, DEFAULT_RETRY_CONFIG } from './retry';

/**
 * LLM Service configuration
 */
export interface LLMServiceConfig {
  /** Provider registry */
  registry: ProviderRegistry;
  
  /** Default provider */
  defaultProvider?: LLMProvider;
  
  /** Enable retry logic */
  enableRetry?: boolean;
  
  /** Retry configuration */
  retryConfig?: Partial<RetryConfig>;
  
  /** Enable circuit breaker */
  enableCircuitBreaker?: boolean;
  
  /** Token budget tracking */
  tokenBudget?: TokenBudget;
  
  /** Cost tracking callback */
  onCost?: (cost: number, model: string, provider: LLMProvider) => void;
  
  /** Request logging callback */
  onRequest?: (provider: LLMProvider, model: string, latencyMs: number) => void;
}

/**
 * Main LLM service for making typed, retryable requests
 */
export class LLMService {
  private registry: ProviderRegistry;
  private defaultProvider?: LLMProvider;
  private retryConfig: RetryConfig;
  private circuitBreakers = new Map<LLMProvider, CircuitBreaker>();
  private enableRetry: boolean;
  private enableCircuitBreaker: boolean;
  private tokenBudget?: TokenBudget;
  private onCost?: LLMServiceConfig['onCost'];
  private onRequest?: LLMServiceConfig['onRequest'];
  
  constructor(config: LLMServiceConfig) {
    this.registry = config.registry;
    this.defaultProvider = config.defaultProvider;
    this.enableRetry = config.enableRetry ?? true;
    this.enableCircuitBreaker = config.enableCircuitBreaker ?? true;
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config.retryConfig };
    this.tokenBudget = config.tokenBudget;
    this.onCost = config.onCost;
    this.onRequest = config.onRequest;
  }
  
  /**
   * Make a simple text completion request
   * 
   * @param prompt - Input prompt
   * @param options - Request options
   * @param provider - Provider to use (defaults to default provider)
   * @returns LLM response
   */
  async complete(
    prompt: string,
    options: Partial<LLMRequestOptions<string>> = {},
    provider?: LLMProvider
  ): Promise<LLMResponse<string>> {
    const selectedProvider = this.getProvider(provider);
    
    const requestOptions: LLMRequestOptions<string> = {
      input: prompt,
      model: options.model || selectedProvider.getConfig().defaultModel || 'gpt-3.5-turbo',
      ...options,
    };
    
    return this.executeRequest(selectedProvider, requestOptions);
  }
  
  /**
   * Make a structured request with typed input/output
   * 
   * @param request - Structured request
   * @param provider - Provider to use
   * @returns Validated LLM response
   */
  async ask<TInput extends z.ZodType, TOutput extends z.ZodType>(
    request: StructuredLLMRequest<TInput, TOutput>,
    provider?: LLMProvider
  ): Promise<LLMResponse<z.infer<TOutput>>> {
    const selectedProvider = this.getProvider(provider);
    
    // Validate input
    const validatedInput = request.inputSchema.parse(request.input);
    
    // Build prompts
    const systemPrompt: string | undefined =
      typeof request.systemPrompt === 'function'
        ? request.systemPrompt(validatedInput)
        : request.systemPrompt;

    const userPrompt: string =
      typeof request.userPrompt === 'function'
        ? request.userPrompt(validatedInput)
        : request.userPrompt;
    
    // Construct request
    const requestOptions: LLMRequestOptions<string> = {
      input: userPrompt as string,
      systemPrompt,
      model: request.model || selectedProvider.getConfig().defaultModel || 'gpt-3.5-turbo',
      json: true, // Force JSON mode
      ...request.options,
    };
    
    // Execute request
    const response = await this.executeRequest<string, string>(selectedProvider, requestOptions);
    
    // Parse and validate output
    try {
      const parsedContent =
        typeof response.content === 'string' ? JSON.parse(response.content) : response.content;
      const validatedOutput = request.outputSchema.parse(parsedContent);
      
      return {
        ...response,
        content: validatedOutput,
      };
    } catch (error) {
      throw new LLMError(
        `Failed to parse LLM output: ${(error as Error).message}`,
        selectedProvider.name,
        undefined,
        false,
        error as Error
      );
    }
  }
  
  /**
   * Execute a request with retry and circuit breaker protection
   * 
   * @param provider - Provider to use
   * @param options - Request options
   * @returns LLM response
   */
  private async executeRequest<TInput, TOutput>(
    provider: AbstractLLMProvider,
    options: LLMRequestOptions<TInput>
  ): Promise<LLMResponse<TOutput>> {
    // Check token budget
    if (this.tokenBudget) {
      this.checkTokenBudget();
    }
    
    const startTime = Date.now();
    
    // Get or create circuit breaker
    let circuitBreaker: CircuitBreaker | undefined;
    if (this.enableCircuitBreaker) {
      if (!this.circuitBreakers.has(provider.name)) {
        this.circuitBreakers.set(provider.name, new CircuitBreaker());
      }
      circuitBreaker = this.circuitBreakers.get(provider.name);
    }
    
    // Execution function
    const executeFn = async () => {
      const timeout = options.timeout || provider.getConfig().timeout || 30000;
      return withTimeout(
        provider.generate<TInput, TOutput>(options),
        timeout,
        `Request to ${provider.name} timed out after ${timeout}ms`
      );
    };
    
    // Execute with circuit breaker and retry
    let response: LLMResponse<TOutput>;
    
    if (circuitBreaker && this.enableRetry) {
      response = await circuitBreaker.execute(() =>
        withRetry(executeFn, this.retryConfig, (attempt, error) => {
          console.warn(`Retry attempt ${attempt} for ${provider.name}:`, error.message);
        })
      );
    } else if (circuitBreaker) {
      response = await circuitBreaker.execute(executeFn);
    } else if (this.enableRetry) {
      response = await withRetry(executeFn, this.retryConfig);
    } else {
      response = await executeFn();
    }
    
    // Track cost
    if (response.costUsd && this.onCost) {
      this.onCost(response.costUsd, options.model, provider.name);
    }
    
    // Track request
    if (this.onRequest) {
      const latencyMs = Date.now() - startTime;
      this.onRequest(provider.name, options.model, latencyMs);
    }
    
    // Update token budget
    if (this.tokenBudget) {
      this.tokenBudget.dailyUsage += response.usage.totalTokens;
      this.tokenBudget.monthlyUsage += response.usage.totalTokens;
    }
    
    return response;
  }
  
  /**
   * Get provider by name or default
   * 
   * @param provider - Provider name
   * @returns Provider instance
   */
  private getProvider(provider?: LLMProvider): AbstractLLMProvider {
    if (provider) {
      const p = this.registry.get(provider);
      if (!p) {
        throw new LLMError(`Provider ${provider} not registered`, provider, undefined, false);
      }
      return p;
    }
    
    if (this.defaultProvider) {
      const p = this.registry.get(this.defaultProvider);
      if (p) return p;
    }
    
    const defaultP = this.registry.getDefault();
    if (!defaultP) {
      throw new LLMError('No LLM providers registered', 'openai', undefined, false);
    }
    
    return defaultP;
  }
  
  /**
   * Check token budget before request
   */
  private checkTokenBudget(): void {
    if (!this.tokenBudget) return;
    
    const now = new Date();
    if (now > this.tokenBudget.resetsAt) {
      // Reset budget
      this.tokenBudget.dailyUsage = 0;
      if (now.getMonth() !== this.tokenBudget.resetsAt.getMonth()) {
        this.tokenBudget.monthlyUsage = 0;
      }
      this.tokenBudget.resetsAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
    
    if (this.tokenBudget.dailyUsage >= this.tokenBudget.dailyLimit) {
      throw new LLMError(
        'Daily token budget exceeded',
        this.defaultProvider || 'openai',
        429,
        false
      );
    }
    
    if (this.tokenBudget.monthlyUsage >= this.tokenBudget.monthlyLimit) {
      throw new LLMError(
        'Monthly token budget exceeded',
        this.defaultProvider || 'openai',
        429,
        false
      );
    }
  }
  
  /**
   * Get token budget status
   */
  getTokenBudget(): TokenBudget | undefined {
    return this.tokenBudget ? { ...this.tokenBudget } : undefined;
  }
  
  /**
   * Reset circuit breakers
   */
  resetCircuitBreakers(): void {
    this.circuitBreakers.forEach((cb) => cb.reset());
  }
  
  /**
   * Get circuit breaker state for a provider
   */
  getCircuitBreakerState(provider: LLMProvider): string {
    return this.circuitBreakers.get(provider)?.getState() || 'unknown';
  }
}

/**
 * Model cost database
 */
export const MODEL_COSTS: ModelCostConfig[] = [
  // OpenAI
  { provider: 'openai', model: 'gpt-4', costPerInputToken: 0.03 / 1000, costPerOutputToken: 0.06 / 1000 },
  { provider: 'openai', model: 'gpt-4-turbo', costPerInputToken: 0.01 / 1000, costPerOutputToken: 0.03 / 1000 },
  { provider: 'openai', model: 'gpt-3.5-turbo', costPerInputToken: 0.0015 / 1000, costPerOutputToken: 0.002 / 1000 },
  
  // Anthropic
  { provider: 'anthropic', model: 'claude-3-opus', costPerInputToken: 0.015 / 1000, costPerOutputToken: 0.075 / 1000 },
  { provider: 'anthropic', model: 'claude-3-sonnet', costPerInputToken: 0.003 / 1000, costPerOutputToken: 0.015 / 1000 },
  { provider: 'anthropic', model: 'claude-3-haiku', costPerInputToken: 0.00025 / 1000, costPerOutputToken: 0.00125 / 1000 },
  
  // Groq (free tier, but set nominal costs)
  { provider: 'groq', model: 'mixtral-8x7b', costPerInputToken: 0.0005 / 1000, costPerOutputToken: 0.001 / 1000 },
  { provider: 'groq', model: 'llama2-70b', costPerInputToken: 0.0007 / 1000, costPerOutputToken: 0.0014 / 1000 },
];

/**
 * Estimate cost for a request
 * 
 * @param provider - Provider
 * @param model - Model
 * @param inputTokens - Input tokens
 * @param outputTokens - Output tokens
 * @returns Estimated cost in USD
 */
export function estimateCost(
  provider: LLMProvider,
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const costConfig = MODEL_COSTS.find((c) => c.provider === provider && c.model === model);
  if (!costConfig) {
    // Default fallback cost
    return (inputTokens * 0.001 + outputTokens * 0.002) / 1000;
  }
  
  return inputTokens * costConfig.costPerInputToken + outputTokens * costConfig.costPerOutputToken;
}

