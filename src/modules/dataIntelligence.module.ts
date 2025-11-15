/**
 * Data Intelligence Module
 *
 * Deterministic vocabulary + entity extraction helpers shared between
 * the backend and SDK. Everything runs locally—no LLM dependency required.
 *
 * @module modules/data-intelligence
 * @author Framers <team@frame.dev>
 * @since 1.3.0
 * @license MIT
 * 
 * @example
 * ```typescript
 * import { OpenStrandSDK } from '@framers/openstrand-sdk';
 * 
 * const sdk = new OpenStrandSDK({ baseUrl: 'http://localhost:8000' });
 * 
 * // Local analysis (instant, offline)
 * const vocab = sdk.dataIntelligence.summarizeLocal([
 *   { id: '1', text: 'OpenStrand enables civic research.' },
 *   { id: '2', text: 'Researchers build vocabularies with OpenStrand.' }
 * ]);
 * 
 * console.log(vocab.terms); // [{ term: 'openstrand', count: 2, score: 1.23 }, ...]
 * 
 * // Remote analysis (with caching + optional LLM verification)
 * const vocabRemote = await sdk.dataIntelligence.summarizeRemote({
 *   documents: [...],
 *   options: { maxTerms: 100 }
 * });
 * ```
 */

import type { OpenStrandSDK } from '../client';

export interface VocabularyDocument {
  id: string;
  text: string;
  title?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface VocabularyTerm {
  term: string;
  count: number;
  documentCount: number;
  score: number;
}

export interface EntityCandidate {
  value: string;
  type: 'person' | 'organization' | 'location' | 'acronym' | 'keyword';
  count: number;
  confidence: number;
}

export interface VocabularySummary {
  terms: VocabularyTerm[];
  bigrams: VocabularyTerm[];
  entities: EntityCandidate[];
  metadata: {
    totalDocuments: number;
    totalTokens: number;
    stopWords: number;
    generatedAt: string;
  };
}

export interface VocabularyOptions {
  minTermLength?: number;
  maxTerms?: number;
  maxBigrams?: number;
  stopWords?: string[];
}

export interface SchemaAnalysis {
  columns: Array<Record<string, unknown>>;
  relationships: Array<Record<string, unknown>>;
  quality: Record<string, unknown>;
  suggestions: Record<string, unknown>;
  metadata: {
    method: 'heuristic' | 'ai' | 'combined';
    confidence: number;
    processingTime: number;
    rowCount: number;
    columnCount: number;
    cost?: number;
  };
}

export interface SchemaAnalysisOptions {
  useHeuristics?: boolean;
  useAI?: boolean;
  userId?: string;
  userEditable?: boolean;
}

export interface DatasetAnalysisRequest {
  rows: Record<string, unknown>[];
  options?: SchemaAnalysisOptions;
}

export interface DatasetAnalysisResult {
  heuristic?: SchemaAnalysis;
  ai?: SchemaAnalysis;
  combined?: SchemaAnalysis;
  cost: number;
  duration: {
    heuristic?: number;
    ai?: number;
    total: number;
  };
}

const DEFAULT_STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by',
  'for', 'from', 'has', 'have', 'in', 'is', 'it', 'its',
  'of', 'on', 'or', 'that', 'the', 'to', 'was', 'were', 'will', 'with',
  'this', 'these', 'those', 'there', 'their', 'about', 'into', 'over',
  'after', 'before', 'during', 'between', 'within', 'also', 'can',
]);

const ENTITY_PATTERN = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g;
const ACRONYM_PATTERN = /\b([A-Z]{2,})\b/g;

/**
 * Build deterministic vocabulary summary for a set of documents.
 * 
 * Uses TF/IDF scoring to rank terms by importance, extracts bigrams (two-word phrases),
 * and identifies entities via regex patterns. Runs entirely offline with zero LLM dependency.
 * 
 * @param documents - Array of documents to analyze
 * @param options - Configuration options (term limits, stop words, etc.)
 * @returns Vocabulary summary with ranked terms, bigrams, and entities
 * @throws {Error} If documents array is empty
 * 
 * @example
 * ```typescript
 * const summary = buildVocabularySummary([
 *   { id: 'doc1', text: 'OpenStrand enables research teams.' },
 *   { id: 'doc2', text: 'Research teams build vocabularies.' }
 * ], {
 *   maxTerms: 50,
 *   maxBigrams: 25,
 *   minTermLength: 3
 * });
 * 
 * console.log(summary.terms[0]); // { term: 'research', count: 2, score: 1.45 }
 * console.log(summary.entities[0]); // { value: 'OpenStrand', type: 'organization', confidence: 0.7 }
 * ```
 * 
 * @public
 */
export function buildVocabularySummary(
  documents: VocabularyDocument[],
  options: VocabularyOptions = {}
): VocabularySummary {
  if (!documents?.length) {
    throw new Error('No documents provided for vocabulary analysis');
  }

  const {
    minTermLength = 3,
    maxTerms = 50,
    maxBigrams = 25,
    stopWords = [],
  } = options;

  const stopWordSet = mergeStopWords(stopWords);
  const termStats = new Map<string, { count: number; docCount: number }>();
  const bigramStats = new Map<string, { count: number; docCount: number }>();
  const docCount = documents.length;

  let totalTokens = 0;
  let stopWordHits = 0;

  const entityAccumulator = new Map<string, EntityCandidate>();

  documents.forEach((doc) => {
    const text = [doc.title, doc.text, doc.tags?.join(' ')].filter(Boolean).join('\n');
    const tokens = tokenize(text, stopWordSet, minTermLength);
    const seenTerms = new Set<string>();
    const seenBigrams = new Set<string>();
    const bigrams = buildBigrams(tokens);

    totalTokens += tokens.length;

    tokens.forEach((token) => {
      if (stopWordSet.has(token)) {
        stopWordHits += 1;
        return;
      }

      const current = termStats.get(token) ?? { count: 0, docCount: 0 };
      current.count += 1;
      if (!seenTerms.has(token)) {
        current.docCount += 1;
        seenTerms.add(token);
      }
      termStats.set(token, current);
    });

    bigrams.forEach((bigram) => {
      if (stopWordSet.has(bigram)) {
        return;
      }
      const current = bigramStats.get(bigram) ?? { count: 0, docCount: 0 };
      current.count += 1;
      if (!seenBigrams.has(bigram)) {
        current.docCount += 1;
        seenBigrams.add(bigram);
      }
      bigramStats.set(bigram, current);
    });

    extractEntities(doc.text || '', stopWordSet).forEach((entity) => {
      const existing = entityAccumulator.get(entity.value);
      if (existing) {
        existing.count += entity.count;
        existing.confidence = Math.min(1, existing.confidence + entity.confidence / 2);
      } else {
        entityAccumulator.set(entity.value, { ...entity });
      }
    });
  });

  const terms = normalizeTermStats(termStats, docCount, maxTerms);
  const bigrams = normalizeTermStats(bigramStats, docCount, maxBigrams);
  const entities = Array.from(entityAccumulator.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, maxTerms);

  return {
    terms,
    bigrams,
    entities,
    metadata: {
      totalDocuments: docCount,
      totalTokens,
      stopWords: stopWordHits,
      generatedAt: new Date().toISOString(),
    },
  };
}

function mergeStopWords(extra: string[]): Set<string> {
  const merged = new Set(DEFAULT_STOP_WORDS);
  extra.forEach((word) => {
    if (word) merged.add(word.toLowerCase());
  });
  return merged;
}

function tokenize(
  text: string,
  stopWords: Set<string>,
  minLength: number
): string[] {
  if (!text) return [];
  return text
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= minLength && !stopWords.has(token));
}

function buildBigrams(tokens: string[]): string[] {
  const results: string[] = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    results.push(`${tokens[i]} ${tokens[i + 1]}`);
  }
  return results;
}

function normalizeTermStats(
  stats: Map<string, { count: number; docCount: number }>,
  totalDocs: number,
  limit: number
): VocabularyTerm[] {
  return Array.from(stats.entries())
    .map(([term, value]) => ({
      term,
      count: value.count,
      documentCount: value.docCount,
      score: tfIdf(value.count, value.docCount, totalDocs),
    }))
    .sort((a, b) => b.score - a.score || b.count - a.count)
    .slice(0, limit);
}

function tfIdf(termCount: number, docCount: number, totalDocs: number): number {
  const tf = termCount;
  const idf = Math.log((totalDocs + 1) / (docCount + 1)) + 1;
  return parseFloat((tf * idf).toFixed(4));
}

/**
 * Extract entities from text using production NER.
 * 
 * Attempts to use wink-nlp for high-quality extraction, falls back to regex if unavailable.
 * 
 * @param text - Text to analyze
 * @param stopWords - Stop words to filter out
 * @returns Array of entity candidates
 * @private
 */
function extractEntities(text: string, stopWords: Set<string>): EntityCandidate[] {
  if (!text) return [];

  try {
    // Try wink-nlp (Node.js/backend). Use runtime require to avoid bundling in browser builds.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { extractEntities: extractWithNER } = require('./ner');
    const entities = extractWithNER(text, { minConfidence: 0.6 });
    
    // Convert to EntityCandidate format
    return entities
      .filter((e: any) => !stopWords.has(e.value.toLowerCase()))
      .map((e: any) => ({
        value: e.value,
        type: e.type,
        count: e.count,
        confidence: e.confidence,
      }));
  } catch {
    // Fallback to regex-based extraction
    return extractEntitiesRegex(text, stopWords);
  }
}

/**
 * Regex-based entity extraction (fallback for browser/lightweight environments).
 * 
 * @private
 */
function extractEntitiesRegex(text: string, stopWords: Set<string>): EntityCandidate[] {
  const entities: EntityCandidate[] = [];

  const titleCaseMatches = text.matchAll(ENTITY_PATTERN);
  for (const match of titleCaseMatches) {
    const value = match[1]?.trim();
    if (!value || value.length < 3) continue;
    const lower = value.toLowerCase();
    if (stopWords.has(lower)) continue;
    entities.push({
      value,
      type: inferEntityType(value),
      count: 1,
      confidence: 0.7,
    });
  }

  const acronymMatches = text.matchAll(ACRONYM_PATTERN);
  for (const match of acronymMatches) {
    const value = match[1]?.trim();
    if (!value || value.length < 2) continue;
    entities.push({
      value,
      type: 'acronym',
      count: 1,
      confidence: 0.8,
    });
  }

  return entities;
}

/**
 * Infer entity type from text using heuristics.
 * 
 * @private
 */
function inferEntityType(value: string): EntityCandidate['type'] {
  if (/\b(Inc|Corp|LLC|Ltd)\b/.test(value)) return 'organization';
  if (/\b(University|College|Institute)\b/.test(value)) return 'organization';
  if (/\b(Street|Avenue|City|County|State|Province)\b/.test(value)) return 'location';
  if (/\s/.test(value)) return 'person';
  return 'keyword';
}

/**
 * Client wrapper that exposes both local (deterministic) helpers and
 * the remote `/api/v1/intelligence/*` endpoints.
 * 
 * @public
 */
export class DataIntelligenceModule {
  constructor(private sdk: OpenStrandSDK) {}

  /**
   * Run vocabulary analysis locally (shared logic with backend service).
   * 
   * This method executes instantly and works offline. Perfect for Community Edition
   * or when you want immediate results without backend round-trip.
   * 
   * @param documents - Documents to analyze
   * @param options - Analysis options
   * @returns Vocabulary summary with terms, bigrams, and entities
   * 
   * @example
   * ```typescript
   * const vocab = sdk.dataIntelligence.summarizeLocal([
   *   { id: '1', text: 'Machine learning research notes' }
   * ]);
   * ```
   * 
   * @public
   */
  summarizeLocal(
    documents: VocabularyDocument[],
    options?: VocabularyOptions
  ): VocabularySummary {
    return buildVocabularySummary(documents, options);
  }

  /**
   * Request vocabulary analysis from the backend (RBAC + persistence).
   * 
   * Backend caches results and supports LLM verification (Teams Edition).
   * Use this when you need team-wide summaries or want to enable optional AI enrichment.
   * 
   * @param payload - Request payload with documents and options
   * @returns Promise resolving to vocabulary summary
   * 
   * @example
   * ```typescript
   * const vocab = await sdk.dataIntelligence.summarizeRemote({
   *   documents: [...],
   *   options: { maxTerms: 100, enableLLMVerification: true }
   * });
   * ```
   * 
   * @public
   */
  async summarizeRemote(payload: {
    documents: VocabularyDocument[];
    options?: VocabularyOptions;
  }): Promise<VocabularySummary> {
    return this.sdk.request('POST', '/api/v1/intelligence/vocabulary', {
      body: payload,
    });
  }

  /**
   * Ask the backend to run schema analysis on a dataset (heuristics + optional AI).
   * 
   * Analyzes CSV/JSON data to infer column types, detect relationships, suggest visualizations,
   * and compute quality scores. Supports dual-mode analysis (fast heuristics + optional LLM).
   * 
   * @param payload - Dataset rows and analysis options
   * @returns Promise resolving to analysis results (heuristic, AI, and combined)
   * 
   * @example
   * ```typescript
   * const analysis = await sdk.dataIntelligence.analyzeDataset({
   *   rows: csvData,
   *   options: { useHeuristics: true, useAI: false }
   * });
   * 
   * console.log(analysis.heuristic.columns); // Column type inference
   * console.log(analysis.heuristic.suggestions.visualizations); // Chart recommendations
   * ```
   * 
   * @public
   */
  async analyzeDataset(
    payload: DatasetAnalysisRequest
  ): Promise<DatasetAnalysisResult> {
    return this.sdk.request('POST', '/api/v1/intelligence/datasets/analyze', {
      body: payload,
    });
  }
}

