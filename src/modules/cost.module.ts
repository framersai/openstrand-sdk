/**
 * Cost Estimation Module
 * 
 * Provides dry-run cost estimates for all AI operations.
 * 
 * @module modules/cost
 * @author Framers <team@frame.dev>
 * @since 1.4.0
 * @license MIT
 * 
 * @example
 * ```typescript
 * import { OpenStrandSDK } from '@framers/openstrand-sdk';
 * 
 * const sdk = new OpenStrandSDK({ baseUrl: 'http://localhost:8000' });
 * 
 * // Estimate RAG query
 * const estimate = await sdk.cost.estimateRagQuery({
 *   question: 'What is quantum computing?',
 *   retrievedChunks: 5,
 *   avgChunkTokens: 400,
 *   llmModel: 'gpt-4o-mini',
 *   embeddingModel: 'text-embedding-3-small'
 * });
 * 
 * console.log(`Est. cost: $${estimate.cost.total.estimate.toFixed(4)}`);
 * ```
 */

import type { OpenStrandSDK } from '../client';

/**
 * Cost estimate response
 */
export interface CostEstimate {
  inputTokens: number;
  outputTokens: {
    low: number;
    estimate: number;
    high: number;
  };
  embeddingTokens?: number;
  cost: {
    input: number;
    output: {
      low: number;
      estimate: number;
      high: number;
    };
    embedding?: number;
    total: {
      low: number;
      estimate: number;
      high: number;
    };
  };
  model: string;
  provider: string;
  notes?: string[];
}

/**
 * Model pricing info
 */
export interface ModelPricing {
  model: string;
  provider: string;
  inputCostPer1k: number;
  outputCostPer1k: number;
  embeddingCostPer1k?: number;
  typicalCompletionRatio: number;
}

/**
 * Cost Module
 * 
 * Provides cost estimation for all AI operations.
 * 
 * @public
 */
export class CostModule {
  constructor(private sdk: OpenStrandSDK) {}

  /**
   * Estimate text generation cost
   * 
   * @param input - Text generation parameters
   * @returns Cost estimate
   * 
   * @example
   * ```typescript
   * const estimate = await sdk.cost.estimateText({
   *   prompt: 'Explain quantum computing',
   *   model: 'gpt-4',
   *   maxTokens: 500
   * });
   * 
   * console.log(`Low: $${estimate.cost.total.low.toFixed(4)}`);
   * console.log(`Est: $${estimate.cost.total.estimate.toFixed(4)}`);
   * console.log(`High: $${estimate.cost.total.high.toFixed(4)}`);
   * ```
   * 
   * @public
   */
  async estimateText(input: {
    prompt: string;
    model: string;
    maxTokens?: number;
    systemMessage?: string;
  }): Promise<CostEstimate> {
    return this.sdk.request('POST', '/api/v1/cost/estimate/text', {
      body: input,
    });
  }

  /**
   * Estimate embedding cost
   * 
   * @param input - Embedding parameters
   * @returns Cost estimate
   * 
   * @example
   * ```typescript
   * const estimate = await sdk.cost.estimateEmbedding({
   *   texts: ['Hello', 'World'],
   *   model: 'text-embedding-3-small'
   * });
   * ```
   * 
   * @public
   */
  async estimateEmbedding(input: {
    texts: string[];
    model: string;
  }): Promise<CostEstimate> {
    return this.sdk.request('POST', '/api/v1/cost/estimate/embedding', {
      body: input,
    });
  }

  /**
   * Estimate RAG query cost
   * 
   * @param input - RAG query parameters
   * @returns Cost estimate
   * 
   * @example
   * ```typescript
   * const estimate = await sdk.cost.estimateRagQuery({
   *   question: 'What is quantum computing?',
   *   retrievedChunks: 5,
   *   avgChunkTokens: 400,
   *   llmModel: 'gpt-4o-mini',
   *   embeddingModel: 'text-embedding-3-small'
   * });
   * ```
   * 
   * @public
   */
  async estimateRagQuery(input: {
    question: string;
    retrievedChunks: number;
    avgChunkTokens: number;
    llmModel: string;
    embeddingModel: string;
    maxTokens?: number;
  }): Promise<CostEstimate> {
    return this.sdk.request('POST', '/api/v1/cost/estimate/rag-query', {
      body: input,
    });
  }

  /**
   * Estimate strand embedding cost
   * 
   * @param input - Strand embedding parameters
   * @returns Cost estimate with chunk count
   * 
   * @example
   * ```typescript
   * const estimate = await sdk.cost.estimateStrandEmbedding({
   *   textLength: 5000,
   *   chunkSize: 512,
   *   chunkOverlap: 50,
   *   model: 'text-embedding-3-small'
   * });
   * 
   * console.log(`${estimate.chunks} chunks`);
   * console.log(`Est. cost: $${estimate.cost.total.estimate.toFixed(4)}`);
   * ```
   * 
   * @public
   */
  async estimateStrandEmbedding(input: {
    textLength: number;
    chunkSize?: number;
    chunkOverlap?: number;
    model: string;
  }): Promise<CostEstimate & { chunks: number }> {
    return this.sdk.request('POST', '/api/v1/cost/estimate/strand-embedding', {
      body: input,
    });
  }

  /**
   * Get model pricing information
   * 
   * @param provider - Optional provider filter
   * @returns Array of model pricing
   * 
   * @example
   * ```typescript
   * const pricing = await sdk.cost.getPricing('openai');
   * pricing.forEach(p => {
   *   console.log(`${p.model}: $${p.inputCostPer1k}/1k input`);
   * });
   * ```
   * 
   * @public
   */
  async getPricing(provider?: 'openai' | 'anthropic' | 'ollama'): Promise<ModelPricing[]> {
    return this.sdk.request('GET', '/api/v1/cost/pricing', {
      query: provider ? { provider } : undefined,
    });
  }
}

