/**
 * Learning Module
 * 
 * Client wrapper for learning features: flashcards, quizzes, and analytics-to-study generation.
 * 
 * @module modules/learning
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
 * // Generate flashcards from strand analytics
 * const result = await sdk.learning.generateFromStrand({
 *   strandId: 'strand-123',
 *   type: 'flashcards',
 *   count: 10,
 *   difficulty: 'intermediate',
 *   focusAreas: ['entities', 'keywords']
 * });
 * 
 * console.log(`Created ${result.flashcards.length} flashcards`);
 * ```
 */

import type { OpenStrandSDK } from '../client';

/**
 * Focus areas for study generation
 */
export type StudyFocusArea = 'entities' | 'keywords' | 'concepts' | 'relationships' | 'topics';

/**
 * Study material type
 */
export type StudyMaterialType = 'flashcards' | 'quiz' | 'both';

/**
 * Difficulty level
 */
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

/**
 * Flashcard content structure
 */
export interface FlashcardContent {
  text: string;
  images?: string[];
  latex?: string;
  audio?: string;
}

/**
 * Flashcard entity
 */
export interface Flashcard {
  id: string;
  strandId?: string;
  front: FlashcardContent;
  back: FlashcardContent;
  hints?: FlashcardContent[];
  deck: string;
  tags: string[];
  category?: string;
  subCategory?: string;
  visibility: 'private' | 'team' | 'public';
  ease: number;
  interval: number;
  reviews: number;
  lapses: number;
  due: string;
  lastReview?: string;
  created: string;
  updated: string;
}

/**
 * Quiz entity
 */
export interface Quiz {
  id: string;
  strandId?: string;
  title: string;
  description?: string;
  questions: any[];
  timeLimit?: number;
  passingScore: number;
  visibility: 'private' | 'team' | 'public';
  created: string;
  updated: string;
}

/**
 * Analytics study generation request
 */
export interface GenerateFromStrandRequest {
  strandId: string;
  type: StudyMaterialType;
  count?: number;
  difficulty?: DifficultyLevel;
  focusAreas?: StudyFocusArea[];
  deck?: string;
}

/**
 * Loom study generation request
 */
export interface GenerateFromLoomRequest {
  loomId: string;
  type: StudyMaterialType;
  count?: number;
  difficulty?: DifficultyLevel;
  focusAreas?: StudyFocusArea[];
  deck?: string;
}

/**
 * Analytics study generation result
 */
export interface AnalyticsStudyResult {
  flashcards?: Flashcard[];
  quiz?: Quiz;
  metadata: {
    sourceType: 'strand' | 'loom';
    sourceId: string;
    focusAreas: string[];
    entitiesUsed: number;
    keywordsUsed: number;
    generatedAt: string;
  };
}

/**
 * Learning Module
 * 
 * Provides methods for generating and managing study materials.
 * 
 * @public
 */
export class LearningModule {
  constructor(private sdk: OpenStrandSDK) {}

  /**
   * Generate study materials from a strand's analytics data.
   * 
   * Uses the strand's entity histogram, keywords, and other analytics
   * to create targeted flashcards and/or quizzes.
   * 
   * @param request - Generation request
   * @returns Generated flashcards and/or quiz
   * 
   * @example
   * ```typescript
   * const result = await sdk.learning.generateFromStrand({
   *   strandId: 'strand-123',
   *   type: 'flashcards',
   *   count: 10,
   *   difficulty: 'intermediate',
   *   focusAreas: ['entities', 'keywords']
   * });
   * 
   * console.log(`Created ${result.flashcards.length} flashcards`);
   * result.flashcards.forEach(card => {
   *   console.log(`Q: ${card.front.text}`);
   *   console.log(`A: ${card.back.text}`);
   * });
   * ```
   * 
   * @public
   */
  async generateFromStrand(request: GenerateFromStrandRequest): Promise<AnalyticsStudyResult> {
    return this.sdk.request('POST', '/api/v1/analytics/study/strand', {
      body: request,
    });
  }

  /**
   * Generate study materials from a loom's aggregated analytics.
   * 
   * Uses the loom's topic distribution, vocabulary, and entity timelines
   * to create comprehensive study materials covering the entire project scope.
   * 
   * @param request - Generation request
   * @returns Generated flashcards and/or quiz
   * 
   * @example
   * ```typescript
   * const result = await sdk.learning.generateFromLoom({
   *   loomId: 'loom-456',
   *   type: 'both',
   *   count: 20,
   *   difficulty: 'advanced',
   *   focusAreas: ['topics', 'entities', 'relationships']
   * });
   * 
   * console.log(`Created ${result.flashcards.length} flashcards`);
   * console.log(`Created quiz: ${result.quiz.title}`);
   * ```
   * 
   * @public
   */
  async generateFromLoom(request: GenerateFromLoomRequest): Promise<AnalyticsStudyResult> {
    return this.sdk.request('POST', '/api/v1/analytics/study/loom', {
      body: request,
    });
  }

  /**
   * Get flashcard by ID.
   * 
   * @param flashcardId - Flashcard ID
   * @returns Flashcard
   * 
   * @example
   * ```typescript
   * const card = await sdk.learning.getFlashcard('card-123');
   * console.log(card.front.text);
   * ```
   * 
   * @public
   */
  async getFlashcard(flashcardId: string): Promise<Flashcard> {
    return this.sdk.request('GET', `/api/v1/flashcards/${flashcardId}`);
  }

  /**
   * Get quiz by ID.
   * 
   * @param quizId - Quiz ID
   * @returns Quiz
   * 
   * @example
   * ```typescript
   * const quiz = await sdk.learning.getQuiz('quiz-123');
   * console.log(quiz.title);
   * console.log(`${quiz.questions.length} questions`);
   * ```
   * 
   * @public
   */
  async getQuiz(quizId: string): Promise<Quiz> {
    return this.sdk.request('GET', `/api/v1/quizzes/${quizId}`);
  }

  /**
   * List user's flashcards.
   * 
   * @param options - List options
   * @returns Array of flashcards
   * 
   * @example
   * ```typescript
   * const cards = await sdk.learning.listFlashcards({
   *   deck: 'Biology',
   *   take: 20
   * });
   * ```
   * 
   * @public
   */
  async listFlashcards(options?: {
    deck?: string;
    tags?: string[];
    skip?: number;
    take?: number;
  }): Promise<Flashcard[]> {
    const query: Record<string, string> = {};
    if (options?.deck) query.deck = options.deck;
    if (options?.tags) query.tags = options.tags.join(',');
    if (options?.skip) query.skip = String(options.skip);
    if (options?.take) query.take = String(options.take);

    return this.sdk.request('GET', '/api/v1/flashcards', { query });
  }

  /**
   * List user's quizzes.
   * 
   * @param options - List options
   * @returns Array of quizzes
   * 
   * @example
   * ```typescript
   * const quizzes = await sdk.learning.listQuizzes({ take: 10 });
   * ```
   * 
   * @public
   */
  async listQuizzes(options?: {
    skip?: number;
    take?: number;
  }): Promise<Quiz[]> {
    const query: Record<string, string> = {};
    if (options?.skip) query.skip = String(options.skip);
    if (options?.take) query.take = String(options.take);

    return this.sdk.request('GET', '/api/v1/quizzes', { query });
  }
}

