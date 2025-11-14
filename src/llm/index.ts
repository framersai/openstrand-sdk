/**
 * LLM Provider Abstraction
 * @module llm
 * 
 * Unified interface for multiple LLM providers with:
 * - Structured JSON input/output with Zod validation
 * - Automatic retry with exponential backoff
 * - Circuit breaker protection
 * - Token budget tracking
 * - Cost estimation
 * 
 * @example
 * ```typescript
 * import { LLMService, ProviderRegistry } from '@framers/openstrand-sdk/llm';
 * import { OpenAIProvider } from './providers/openai';
 * 
 * const registry = new ProviderRegistry();
 * registry.register(new OpenAIProvider({ apiKey: 'sk-...' }));
 * 
 * const llm = new LLMService({ registry, defaultProvider: 'openai' });
 * 
 * const response = await llm.complete('What is 2+2?');
 * console.log(response.content); // "4"
 * ```
 */

export * from './types';
export * from './provider';
export * from './service';
export * from './retry';

// Re-export commonly used classes
export { LLMService, MODEL_COSTS, estimateCost } from './service';
export { AbstractLLMProvider, ProviderRegistry } from './provider';
export { LLMError } from './types';
export { CircuitBreaker, withRetry, withTimeout } from './retry';

