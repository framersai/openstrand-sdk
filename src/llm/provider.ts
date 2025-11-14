/**
 * Abstract LLM Provider Interface
 * @module llm/provider
 */

import type { LLMProvider, LLMRequestOptions, LLMResponse, LLMProviderConfig } from './types';

/**
 * Abstract LLM provider interface
 * All provider implementations must extend this class
 */
export abstract class AbstractLLMProvider {
  protected config: LLMProviderConfig;
  
  constructor(
    public readonly name: LLMProvider,
    config: LLMProviderConfig = {}
  ) {
    this.config = {
      timeout: 30000,
      maxRetries: 3,
      ...config,
    };
  }
  
  /**
   * Generate completion
   * 
   * @param options - Request options
   * @returns LLM response
   */
  abstract generate<TInput = string, TOutput = string>(
    options: LLMRequestOptions<TInput>
  ): Promise<LLMResponse<TOutput>>;
  
  /**
   * Check if model is available
   * 
   * @param model - Model name
   * @returns True if available
   */
  abstract isModelAvailable(model: string): Promise<boolean>;
  
  /**
   * List available models
   * 
   * @returns Array of model names
   */
  abstract listModels(): Promise<string[]>;
  
  /**
   * Estimate cost for a request
   * 
   * @param model - Model name
   * @param inputTokens - Input token count
   * @param outputTokens - Output token count
   * @returns Estimated cost in USD
   */
  abstract estimateCost(model: string, inputTokens: number, outputTokens: number): number;
  
  /**
   * Get provider configuration
   */
  getConfig(): LLMProviderConfig {
    return { ...this.config };
  }
  
  /**
   * Update provider configuration
   */
  updateConfig(config: Partial<LLMProviderConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * Provider registry
 */
export class ProviderRegistry {
  private providers = new Map<LLMProvider, AbstractLLMProvider>();
  
  /**
   * Register a provider
   */
  register(provider: AbstractLLMProvider): void {
    this.providers.set(provider.name, provider);
  }
  
  /**
   * Unregister a provider
   */
  unregister(name: LLMProvider): void {
    this.providers.delete(name);
  }
  
  /**
   * Get a provider
   */
  get(name: LLMProvider): AbstractLLMProvider | undefined {
    return this.providers.get(name);
  }
  
  /**
   * Check if provider is registered
   */
  has(name: LLMProvider): boolean {
    return this.providers.has(name);
  }
  
  /**
   * List all registered providers
   */
  list(): LLMProvider[] {
    return Array.from(this.providers.keys());
  }
  
  /**
   * Get default provider
   */
  getDefault(): AbstractLLMProvider | undefined {
    // Try OpenRouter first, then OpenAI, then first available
    return (
      this.providers.get('openrouter') ||
      this.providers.get('openai') ||
      this.providers.values().next().value
    );
  }
}

