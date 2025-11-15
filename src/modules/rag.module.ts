/**
 * RAG (Retrieval-Augmented Generation) Module
 * 
 * Client wrapper for semantic search and question answering.
 * Supports both remote (backend API) and local (browser-based) retrieval.
 * 
 * @module modules/rag
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
 * // Embed a strand
 * await sdk.rag.embedStrand({ strandId: 'strand-123', loomId: 'loom-456' });
 * 
 * // Search
 * const results = await sdk.rag.search({
 *   query: 'quantum computing',
 *   loomId: 'loom-456'
 * });
 * 
 * // Ask question
 * const answer = await sdk.rag.query({
 *   question: 'What is quantum computing?',
 *   loomId: 'loom-456'
 * });
 * 
 * console.log(answer.answer);
 * console.log(answer.citations);
 * ```
 */

import type { OpenStrandSDK } from '../client';
import type { SearchResult } from '../types';

/**
 * RAG search result chunk
 */
export interface RagSearchChunk {
  id: string;
  text: string;
  strandId?: string;
  score: number;
  position: number;
}

/**
 * RAG query response
 */
export interface RagQueryResponse {
  chatId: string;
  answer: string;
  citations: Array<{
    strandId?: string;
    chunkId: string;
    score: number;
    text: string;
  }>;
  durationMs: number;
  cost?: number;
}

/**
 * Chat message
 */
export interface ChatMessage {
  id: string;
  question: string;
  answer: string | null;
  status: string;
  createdAt: string;
}

/**
 * Embed strand request
 */
export interface EmbedStrandRequest {
  strandId: string;
  loomId: string;
  force?: boolean;
}

/**
 * Search request
 */
export interface SearchRequest {
  query: string;
  loomId: string;
  k?: number;
  minScore?: number;
  strandIds?: string[];
}

/**
 * RAG query request
 */
export interface RagQueryRequest {
  question: string;
  loomId: string;
  searchOptions?: {
    k?: number;
    minScore?: number;
    strandIds?: string[];
  };
  chatOptions?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };
}

/**
 * RAG Module
 * 
 * Provides semantic search and question answering capabilities.
 * 
 * @public
 */
export class RagModule {
  constructor(private sdk: OpenStrandSDK) {}

  /**
   * Embed a strand for semantic search.
   * 
   * Generates embeddings for the strand's content and stores them for later retrieval.
   * 
   * @param request - Embed request
   * @returns Embedding result
   * 
   * @example
   * ```typescript
   * const result = await sdk.rag.embedStrand({
   *   strandId: 'strand-123',
   *   loomId: 'loom-456',
   *   force: false
   * });
   * 
   * console.log(`Embedded ${result.chunks} chunks`);
   * ```
   * 
   * @public
   */
  async embedStrand(request: EmbedStrandRequest): Promise<{
    success: boolean;
    chunks: number;
    message: string;
  }> {
    return this.sdk.request('POST', '/api/v1/rag/embed', {
      body: request,
    });
  }

  /**
   * Search for relevant chunks using semantic similarity.
   * 
   * Uses vector embeddings to find the most relevant content chunks
   * for a given query.
   * 
   * @param request - Search request
   * @returns Array of scored chunks
   * 
   * @example
   * ```typescript
   * const results = await sdk.rag.search({
   *   query: 'quantum computing applications',
   *   loomId: 'loom-456',
   *   k: 5,
   *   minScore: 0.7
   * });
   * 
   * results.results.forEach(chunk => {
   *   console.log(`Score: ${chunk.score} - ${chunk.text.slice(0, 100)}...`);
   * });
   * ```
   * 
   * @public
   */
  async search(request: SearchRequest): Promise<{ results: SearchResult[] }> {
    return this.sdk.request('POST', '/api/v1/rag/search', {
      body: request,
    });
  }

  /**
   * Ask a question using RAG (Retrieval-Augmented Generation).
   * 
   * Searches for relevant context and generates an answer using LLM.
   * Returns the answer with citations to source material.
   * 
   * @param request - Query request
   * @returns Answer with citations
   * 
   * @example
   * ```typescript
   * const response = await sdk.rag.query({
   *   question: 'What are the main themes in my research notes?',
   *   loomId: 'loom-456',
   *   chatOptions: {
   *     model: 'gpt-4',
   *     temperature: 0.7
   *   }
   * });
   * 
   * console.log('Answer:', response.answer);
   * console.log('Sources:', response.citations.length);
   * 
   * response.citations.forEach((citation, i) => {
   *   console.log(`[${i+1}] ${citation.text.slice(0, 100)}... (score: ${citation.score})`);
   * });
   * ```
   * 
   * @public
   */
  async query(request: RagQueryRequest): Promise<RagQueryResponse> {
    return this.sdk.request('POST', '/api/v1/rag/query', {
      body: request,
    });
  }

  /**
   * Get a chat by ID.
   * 
   * @param chatId - Chat ID
   * @returns Chat message
   * 
   * @example
   * ```typescript
   * const chat = await sdk.rag.getChat('chat-123');
   * console.log(chat.question);
   * console.log(chat.answer);
   * ```
   * 
   * @public
   */
  async getChat(chatId: string): Promise<ChatMessage> {
    return this.sdk.request('GET', `/api/v1/rag/chats/${chatId}`);
  }

  /**
   * List user's chat history.
   * 
   * @param options - List options
   * @returns Array of chat messages
   * 
   * @example
   * ```typescript
   * const chats = await sdk.rag.listChats({ loomId: 'loom-456', limit: 10 });
   * chats.forEach(chat => {
   *   console.log(`Q: ${chat.question}`);
   *   console.log(`A: ${chat.answer}`);
   * });
   * ```
   * 
   * @public
   */
  async listChats(options?: {
    loomId?: string;
    limit?: number;
  }): Promise<ChatMessage[]> {
    return this.sdk.request('GET', '/api/v1/rag/chats', {
      query: options as any,
    });
  }
}

