/**
 * Extractive Summarization Module
 * 
 * Implements TextRank algorithm for extractive summarization.
 * Selects the most important sentences from the original text without rewriting.
 * 
 * This is the **default** summarization method for OpenStrand because it:
 * - Works offline (zero LLM dependency)
 * - Preserves original phrasing (no hallucination risk)
 * - Runs in <200ms for typical documents
 * - Produces consistent results
 * 
 * @module modules/summarization
 * @author Framers <team@frame.dev>
 * @since 1.3.0
 * @license MIT
 * 
 * @example
 * ```typescript
 * import { extractiveSummarize } from '@framers/openstrand-sdk/modules/summarization';
 * 
 * const result = extractiveSummarize(longDocument, {
 *   maxSentences: 5,
 *   minSentenceLength: 10
 * });
 * 
 * console.log(result.summary); // Top 5 sentences in original order
 * console.log(result.sentences[0].score); // Importance score
 * ```
 */

/**
 * Extractive summary options
 */
export interface ExtractiveSummaryOptions {
  /** Maximum number of sentences to include (default: 5) */
  maxSentences?: number;
  
  /** Minimum words per sentence to consider (default: 10) */
  minSentenceLength?: number;
  
  /** Diversity penalty to avoid similar sentences (0.0–1.0, default: 0.3) */
  diversityPenalty?: number;
  
  /** Stop words to filter (default: English stop words) */
  stopWords?: string[];
}

/**
 * Ranked sentence with metadata
 */
export interface RankedSentence {
  /** Sentence text */
  text: string;
  
  /** TextRank importance score */
  score: number;
  
  /** Original position in document (0-indexed) */
  position: number;
  
  /** Word count */
  wordCount: number;
}

/**
 * Extractive summary result
 */
export interface ExtractiveSummaryResult {
  /** Summary text (top sentences in original order) */
  summary: string;
  
  /** All ranked sentences */
  sentences: RankedSentence[];
  
  /** Summarization method */
  method: 'textrank';
  
  /** Processing time in milliseconds */
  processingTimeMs: number;
  
  /** Compression ratio (summary length / original length) */
  compressionRatio: number;
}

const DEFAULT_STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by',
  'for', 'from', 'has', 'have', 'in', 'is', 'it', 'its',
  'of', 'on', 'or', 'that', 'the', 'to', 'was', 'were', 'will', 'with',
  'this', 'these', 'those', 'there', 'their', 'about', 'into', 'over',
  'after', 'before', 'during', 'between', 'within', 'also', 'can',
]);

/**
 * Generate extractive summary using TextRank algorithm.
 * 
 * TextRank is a graph-based ranking algorithm inspired by PageRank.
 * It builds a similarity graph of sentences and ranks them by centrality.
 * 
 * **Algorithm steps:**
 * 1. Split text into sentences
 * 2. Represent each sentence as a TF/IDF vector
 * 3. Build similarity graph (cosine similarity between sentences)
 * 4. Run iterative PageRank to score sentences
 * 5. Select top N sentences and return in original order
 * 
 * @param text - Input text to summarize
 * @param options - Summarization options
 * @returns Extractive summary with ranked sentences
 * @throws {Error} If text is empty or too short
 * 
 * @example
 * ```typescript
 * const summary = extractiveSummarize(
 *   'Long document text here...',
 *   { maxSentences: 3, minSentenceLength: 15 }
 * );
 * 
 * console.log(summary.summary);
 * console.log(`Compression: ${(summary.compressionRatio * 100).toFixed(1)}%`);
 * ```
 * 
 * @public
 */
export function extractiveSummarize(
  text: string,
  options: ExtractiveSummaryOptions = {}
): ExtractiveSummaryResult {
  const startTime = Date.now();
  
  const {
    maxSentences = 5,
    minSentenceLength = 10,
    diversityPenalty = 0.3,
    stopWords = [],
  } = options;

  if (!text || text.trim().length === 0) {
    throw new Error('Cannot summarize empty text');
  }

  // Merge stop words
  const stopWordSet = new Set([...DEFAULT_STOP_WORDS, ...stopWords.map(w => w.toLowerCase())]);

  // Step 1: Split into sentences
  const sentences = splitSentences(text);
  
  if (sentences.length === 0) {
    throw new Error('No sentences found in text');
  }

  // Filter short sentences
  const validSentences = sentences.filter(s => {
    const wordCount = s.text.split(/\s+/).length;
    return wordCount >= minSentenceLength;
  });

  if (validSentences.length === 0) {
    throw new Error('No valid sentences found (all too short)');
  }

  // If document is already short, return as-is
  if (validSentences.length <= maxSentences) {
    const processingTimeMs = Date.now() - startTime;
    return {
      summary: validSentences.map(s => s.text).join(' '),
      sentences: validSentences.map((s, i) => ({
        ...s,
        score: 1.0,
        position: i,
      })),
      method: 'textrank',
      processingTimeMs,
      compressionRatio: 1.0,
    };
  }

  // Step 2: Build TF/IDF vectors for each sentence
  const vectors = validSentences.map(s => buildTFIDFVector(s.text, stopWordSet));

  // Step 3: Build similarity matrix
  const similarityMatrix = buildSimilarityMatrix(vectors);

  // Step 4: Run TextRank (PageRank on similarity graph)
  const scores = textRank(similarityMatrix, { iterations: 30, dampingFactor: 0.85 });

  // Step 5: Rank sentences by score
  const rankedSentences: RankedSentence[] = validSentences.map((s, i) => ({
    text: s.text,
    score: scores[i],
    position: s.position,
    wordCount: s.wordCount,
  }));

  // Sort by score (descending)
  rankedSentences.sort((a, b) => b.score - a.score);

  // Apply diversity penalty (penalize sentences too similar to already-selected ones)
  const selected: RankedSentence[] = [];
  for (const candidate of rankedSentences) {
    if (selected.length >= maxSentences) break;

    // Check similarity to already-selected sentences
    const tooSimilar = selected.some(sel => {
      const similarity = cosineSimilarity(
        buildTFIDFVector(candidate.text, stopWordSet),
        buildTFIDFVector(sel.text, stopWordSet)
      );
      return similarity > (1 - diversityPenalty);
    });

    if (!tooSimilar) {
      selected.push(candidate);
    }
  }

  // Sort selected sentences by original position
  selected.sort((a, b) => a.position - b.position);

  const summary = selected.map(s => s.text).join(' ');
  const processingTimeMs = Date.now() - startTime;
  const compressionRatio = summary.length / text.length;

  return {
    summary,
    sentences: rankedSentences,
    method: 'textrank',
    processingTimeMs,
    compressionRatio,
  };
}

/**
 * Split text into sentences.
 * 
 * Uses simple regex-based splitting. For production, consider wink-nlp's sentence tokenizer.
 * 
 * @private
 */
function splitSentences(text: string): Array<{ text: string; position: number; wordCount: number }> {
  // Split on sentence boundaries
  const sentencePattern = /[.!?]+\s+/g;
  const parts: string[] = [];
  let lastIndex = 0;
  let match;

  while ((match = sentencePattern.exec(text)) !== null) {
    const sentence = text.slice(lastIndex, match.index + match[0].length).trim();
    if (sentence) parts.push(sentence);
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  const remaining = text.slice(lastIndex).trim();
  if (remaining) parts.push(remaining);

  return parts.map((text, position) => ({
    text,
    position,
    wordCount: text.split(/\s+/).length,
  }));
}

/**
 * Build TF/IDF vector for a sentence.
 * 
 * @private
 */
function buildTFIDFVector(sentence: string, stopWords: Set<string>): Map<string, number> {
  const vector = new Map<string, number>();
  
  const tokens = sentence
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .split(/\s+/)
    .filter(token => token.length > 2 && !stopWords.has(token));

  for (const token of tokens) {
    vector.set(token, (vector.get(token) ?? 0) + 1);
  }

  // Normalize by sentence length
  const magnitude = Math.sqrt(Array.from(vector.values()).reduce((sum, v) => sum + v * v, 0));
  if (magnitude > 0) {
    for (const [token, count] of vector.entries()) {
      vector.set(token, count / magnitude);
    }
  }

  return vector;
}

/**
 * Build similarity matrix between sentence vectors.
 * 
 * @private
 */
function buildSimilarityMatrix(vectors: Map<string, number>[]): number[][] {
  const n = vectors.length;
  const matrix: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const similarity = cosineSimilarity(vectors[i], vectors[j]);
      matrix[i][j] = similarity;
      matrix[j][i] = similarity;
    }
  }

  return matrix;
}

/**
 * Compute cosine similarity between two vectors.
 * 
 * @private
 */
function cosineSimilarity(vecA: Map<string, number>, vecB: Map<string, number>): number {
  let dotProduct = 0;
  let magA = 0;
  let magB = 0;

  const allKeys = new Set([...vecA.keys(), ...vecB.keys()]);

  for (const key of allKeys) {
    const a = vecA.get(key) ?? 0;
    const b = vecB.get(key) ?? 0;
    dotProduct += a * b;
    magA += a * a;
    magB += b * b;
  }

  const denominator = Math.sqrt(magA) * Math.sqrt(magB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

/**
 * Run TextRank (PageRank) on similarity matrix.
 * 
 * @private
 */
function textRank(
  similarityMatrix: number[][],
  options: { iterations: number; dampingFactor: number }
): number[] {
  const n = similarityMatrix.length;
  const { iterations, dampingFactor } = options;

  // Initialize scores uniformly
  let scores = Array(n).fill(1.0 / n);

  // Iterative update
  for (let iter = 0; iter < iterations; iter++) {
    const newScores = Array(n).fill(0);

    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        
        // Weighted vote from sentence j to sentence i
        const weight = similarityMatrix[i][j];
        const outDegree = similarityMatrix[j].reduce((acc, val, idx) => 
          idx === j ? acc : acc + val, 0
        );
        
        if (outDegree > 0) {
          sum += (weight / outDegree) * scores[j];
        }
      }

      newScores[i] = (1 - dampingFactor) / n + dampingFactor * sum;
    }

    scores = newScores;
  }

  return scores;
}

