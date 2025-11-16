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

  // ============================================================================
  // V1.3 FLASHCARD METHODS
  // ============================================================================

  /**
   * Create a new flashcard
   * 
   * @param data - Flashcard data
   * @returns Created flashcard
   * 
   * @example
   * ```typescript
   * const card = await sdk.learning.createFlashcard({
   *   front: { text: 'What is a qubit?' },
   *   back: { text: 'A quantum bit' },
   *   deck: 'Quantum Computing',
   *   tags: ['quantum', 'physics']
   * });
   * ```
   * 
   * @public
   * @since 1.3.0
   */
  async createFlashcard(data: {
    strandId?: string;
    front: FlashcardContent;
    back: FlashcardContent;
    hints?: FlashcardContent[];
    deck?: string;
    tags?: string[];
    category?: string;
    visibility?: 'private' | 'team' | 'public';
  }): Promise<Flashcard> {
    return this.sdk.request('POST', '/api/v1/flashcards', { body: data });
  }

  /**
   * Update a flashcard
   * 
   * @param id - Flashcard ID
   * @param data - Updated data
   * @returns Updated flashcard
   * 
   * @example
   * ```typescript
   * const updated = await sdk.learning.updateFlashcard('card-123', {
   *   tags: ['quantum', 'updated']
   * });
   * ```
   * 
   * @public
   * @since 1.3.0
   */
  async updateFlashcard(id: string, data: Partial<{
    front: FlashcardContent;
    back: FlashcardContent;
    hints: FlashcardContent[];
    deck: string;
    tags: string[];
  }>): Promise<Flashcard> {
    return this.sdk.request('PATCH', `/api/v1/flashcards/${id}`, { body: data });
  }

  /**
   * Delete a flashcard
   * 
   * @param id - Flashcard ID
   * 
   * @example
   * ```typescript
   * await sdk.learning.deleteFlashcard('card-123');
   * ```
   * 
   * @public
   * @since 1.3.0
   */
  async deleteFlashcard(id: string): Promise<void> {
    await this.sdk.request('DELETE', `/api/v1/flashcards/${id}`);
  }

  /**
   * Get due flashcards for study
   * 
   * @param options - Filter options
   * @returns Array of due flashcards
   * 
   * @example
   * ```typescript
   * const dueCards = await sdk.learning.getDueFlashcards({
   *   deck: 'Biology',
   *   limit: 20
   * });
   * ```
   * 
   * @public
   * @since 1.3.0
   */
  async getDueFlashcards(options?: {
    deck?: string;
    limit?: number;
  }): Promise<Flashcard[]> {
    const query: Record<string, string> = {};
    if (options?.deck) query.deck = options.deck;
    if (options?.limit) query.limit = String(options.limit);

    return this.sdk.request('GET', '/api/v1/flashcards/due/study', { query });
  }

  /**
   * Record flashcard study result (updates spaced repetition)
   * 
   * @param data - Study result
   * @returns Updated flashcard
   * 
   * @example
   * ```typescript
   * const updated = await sdk.learning.recordStudy({
   *   flashcardId: 'card-123',
   *   rating: 'good',
   *   timeSpentMs: 5000
   * });
   * 
   * console.log(`Next review in ${updated.interval} days`);
   * ```
   * 
   * @public
   * @since 1.3.0
   */
  async recordStudy(data: {
    flashcardId: string;
    rating: 'again' | 'hard' | 'good' | 'easy';
    timeSpentMs: number;
  }): Promise<Flashcard> {
    return this.sdk.request('POST', '/api/v1/flashcards/study', { body: data });
  }

  /**
   * Get user's flashcard decks with statistics
   * 
   * @returns Array of decks
   * 
   * @example
   * ```typescript
   * const decks = await sdk.learning.getUserDecks();
   * decks.forEach(deck => {
   *   console.log(`${deck.name}: ${deck.due} cards due`);
   * });
   * ```
   * 
   * @public
   * @since 1.3.0
   */
  async getUserDecks(): Promise<Array<{
    name: string;
    total: number;
    due: number;
    new: number;
  }>> {
    return this.sdk.request('GET', '/api/v1/flashcards/decks/list');
  }

  /**
   * Generate flashcards from strand (with templates)
   * 
   * @param strandId - Strand ID
   * @param options - Generation options
   * @returns Array of generated flashcards
   * 
   * @example
   * ```typescript
   * const cards = await sdk.learning.generateFlashcards('strand-123', {
   *   count: 10,
   *   template: 'cloze',
   *   complexity: 3,
   *   allowImages: true
   * });
   * ```
   * 
   * @public
   * @since 1.3.0
   */
  async generateFlashcards(strandId: string, options?: {
    count?: number;
    difficulty?: string;
    includeHints?: boolean;
    deck?: string;
    template?: 'definition' | 'cloze' | 'qa' | 'image_recall' | 'dataset_numeric' | 'minimal' | 'auto';
    complexity?: 1 | 2 | 3 | 4 | 5;
    allowImages?: boolean;
  }): Promise<Flashcard[]> {
    return this.sdk.request('POST', `/api/v1/flashcards/generate/${strandId}`, {
      body: options || {},
    });
  }

  // ============================================================================
  // V1.3 QUIZ METHODS
  // ============================================================================

  /**
   * Create a new quiz
   * 
   * @param data - Quiz data
   * @returns Created quiz
   * 
   * @example
   * ```typescript
   * const quiz = await sdk.learning.createQuiz({
   *   title: 'Biology Quiz',
   *   questions: [...],
   *   passingScore: 70
   * });
   * ```
   * 
   * @public
   * @since 1.3.0
   */
  async createQuiz(data: {
    title: string;
    description?: string;
    questions: any[];
    strandIds?: string[];
    difficulty?: string;
    category?: string;
    visibility?: 'private' | 'team' | 'public';
    timeLimit?: number;
    passingScore?: number;
  }): Promise<Quiz> {
    return this.sdk.request('POST', '/api/v1/quizzes', { body: data });
  }

  /**
   * Generate quiz from strands (with templates)
   * 
   * @param strandIds - Strand IDs
   * @param options - Generation options
   * @returns Generated quiz
   * 
   * @example
   * ```typescript
   * const quiz = await sdk.learning.generateQuiz(['strand-1', 'strand-2'], {
   *   questionCount: 10,
   *   template: 'mixed_depth',
   *   complexity: 3
   * });
   * ```
   * 
   * @public
   * @since 1.3.0
   */
  async generateQuiz(strandIds: string[], options?: {
    questionCount?: number;
    types?: string[];
    difficulty?: string;
    timeLimit?: number;
    template?: 'mcq_overview' | 'mixed_depth' | 'concept_check' | 'practical_code' | 'dataset_analysis' | 'minimal' | 'auto';
    complexity?: 1 | 2 | 3 | 4 | 5;
    allowImages?: boolean;
  }): Promise<Quiz> {
    return this.sdk.request('POST', '/api/v1/quizzes/generate', {
      body: { strandIds, ...options },
    });
  }

  /**
   * Start quiz attempt
   * 
   * @param quizId - Quiz ID
   * @returns Attempt data with questions
   * 
   * @example
   * ```typescript
   * const attempt = await sdk.learning.startQuizAttempt('quiz-123');
   * console.log(`Attempt ID: ${attempt.attemptId}`);
   * // Answer questions...
   * ```
   * 
   * @public
   * @since 1.3.0
   */
  async startQuizAttempt(quizId: string): Promise<{
    attemptId: string;
    questionsToAnswer: any[];
  }> {
    return this.sdk.request('POST', `/api/v1/quizzes/${quizId}/start`);
  }

  /**
   * Submit quiz answers
   * 
   * @param attemptId - Attempt ID
   * @param answers - User answers
   * @returns Quiz results
   * 
   * @example
   * ```typescript
   * const results = await sdk.learning.submitQuizAttempt('attempt-123', [
   *   { questionId: 'q1', answer: 'A', timeSpentMs: 5000 },
   *   { questionId: 'q2', answer: 'true', timeSpentMs: 3000 }
   * ]);
   * 
   * console.log(`Score: ${results.score}%`);
   * console.log(`Passed: ${results.passed}`);
   * ```
   * 
   * @public
   * @since 1.3.0
   */
  async submitQuizAttempt(attemptId: string, answers: Array<{
    questionId: string;
    answer: string | string[];
    timeSpentMs: number;
  }>): Promise<{
    score: number;
    passed: boolean;
    results: any[];
  }> {
    return this.sdk.request('POST', `/api/v1/quizzes/attempts/${attemptId}/submit`, {
      body: { answers },
    });
  }

  /**
   * Get user's quiz attempts
   * 
   * @param quizId - Optional quiz ID to filter
   * @returns Array of attempts
   * 
   * @example
   * ```typescript
   * const attempts = await sdk.learning.getQuizAttempts('quiz-123');
   * ```
   * 
   * @public
   * @since 1.3.0
   */
  async getQuizAttempts(quizId?: string): Promise<any[]> {
    const query: Record<string, string> = {};
    if (quizId) query.quizId = quizId;

    return this.sdk.request('GET', '/api/v1/quizzes/attempts/me', { query });
  }

  // ============================================================================
  // V1.3 GALLERY METHODS
  // ============================================================================

  /**
   * Browse public gallery
   * 
   * @param options - Filter options
   * @returns Gallery items
   * 
   * @example
   * ```typescript
   * const gallery = await sdk.learning.browseGallery({
   *   type: 'flashcard',
   *   sortBy: 'top',
   *   limit: 20
   * });
   * ```
   * 
   * @public
   * @since 1.3.0
   */
  async browseGallery(options?: {
    type?: 'flashcard' | 'quiz';
    sortBy?: 'top' | 'trending' | 'newest';
    difficulty?: string;
    limit?: number;
  }): Promise<any[]> {
    const query: Record<string, string> = {};
    if (options?.type) query.type = options.type;
    if (options?.sortBy) query.sortBy = options.sortBy;
    if (options?.difficulty) query.difficulty = options.difficulty;
    if (options?.limit) query.limit = String(options.limit);

    return this.sdk.request('GET', '/api/v1/gallery', { query });
  }

  /**
   * Vote on gallery content
   * 
   * @param data - Vote data
   * @returns Updated vote counts
   * 
   * @example
   * ```typescript
   * await sdk.learning.voteGallery({
   *   contentType: 'flashcard',
   *   contentId: 'card-123',
   *   value: 1 // thumbs up
   * });
   * ```
   * 
   * @public
   * @since 1.3.0
   */
  async voteGallery(data: {
    contentType: 'flashcard' | 'quiz';
    contentId: string;
    value: 1 | -1;
  }): Promise<{ upvotes: number; downvotes: number }> {
    return this.sdk.request('POST', '/api/v1/gallery/vote', { body: data });
  }

  // ============================================================================
  // V1.4 ADAPTIVE QUIZ METHODS
  // ============================================================================

  /**
   * Start adaptive quiz session (Leitner system)
   * 
   * @param quizId - Quiz ID
   * @returns Session data with first question
   * 
   * @example
   * ```typescript
   * const session = await sdk.learning.startAdaptiveSession('quiz-123');
   * console.log('First question:', session.firstQuestion);
   * console.log('Progress:', session.progress);
   * ```
   * 
   * @public
   * @since 1.4.0
   */
  async startAdaptiveSession(quizId: string): Promise<{
    sessionId: string;
    firstQuestion: any;
    progress: Record<string, number>;
  }> {
    return this.sdk.request('POST', `/api/v1/quizzes/adaptive/${quizId}/start`);
  }

  /**
   * Record adaptive quiz answer (updates Leitner buckets)
   * 
   * @param quizId - Quiz ID
   * @param data - Answer data
   * @returns Next question and bucket info
   * 
   * @example
   * ```typescript
   * const result = await sdk.learning.recordAdaptiveAnswer('quiz-123', {
   *   questionId: 'q1',
   *   isCorrect: true,
   *   timeSpentMs: 5000
   * });
   * 
   * console.log(`Moved to bucket ${result.newBucket}`);
   * console.log('Next question:', result.nextQuestion);
   * ```
   * 
   * @public
   * @since 1.4.0
   */
  async recordAdaptiveAnswer(quizId: string, data: {
    questionId: string;
    isCorrect: boolean;
    timeSpentMs: number;
  }): Promise<{
    newBucket: number;
    nextQuestion: any | null;
  }> {
    return this.sdk.request('POST', `/api/v1/quizzes/adaptive/${quizId}/answer`, {
      body: data,
    });
  }

  /**
   * Get "Explain why" tutoring for incorrect answer
   * 
   * @param quizId - Quiz ID
   * @param data - Explanation request
   * @returns AI-generated explanation
   * 
   * @example
   * ```typescript
   * const explanation = await sdk.learning.explainAnswer('quiz-123', {
   *   questionId: 'q1',
   *   userAnswer: 'B',
   *   mode: 'socratic'
   * });
   * 
   * console.log(explanation.explanation);
   * console.log(`Cost: $${explanation.cost}`);
   * ```
   * 
   * @public
   * @since 1.4.0
   */
  async explainAnswer(quizId: string, data: {
    questionId: string;
    userAnswer: string;
    mode?: 'concise' | 'detailed' | 'socratic';
  }): Promise<{
    explanation: string;
    cost: number;
  }> {
    return this.sdk.request('POST', `/api/v1/quizzes/adaptive/${quizId}/explain`, {
      body: data,
    });
  }

  /**
   * Get adaptive quiz progress
   * 
   * @param quizId - Quiz ID
   * @returns Progress data
   * 
   * @example
   * ```typescript
   * const progress = await sdk.learning.getAdaptiveProgress('quiz-123');
   * console.log(`Mastered: ${progress.mastered} questions`);
   * console.log(`Average accuracy: ${progress.avgAccuracy}%`);
   * ```
   * 
   * @public
   * @since 1.4.0
   */
  async getAdaptiveProgress(quizId: string): Promise<{
    distribution: Record<string, number>;
    mastered: number;
    learning: number;
    new: number;
    totalQuestions: number;
    avgAccuracy: number;
    sessionsCompleted: number;
  }> {
    return this.sdk.request('GET', `/api/v1/quizzes/adaptive/${quizId}/progress`);
  }

  /**
   * Reset adaptive quiz progress (start fresh)
   * 
   * @param quizId - Quiz ID
   * 
   * @example
   * ```typescript
   * await sdk.learning.resetAdaptiveProgress('quiz-123');
   * ```
   * 
   * @public
   * @since 1.4.0
   */
  async resetAdaptiveProgress(quizId: string): Promise<void> {
    await this.sdk.request('DELETE', `/api/v1/quizzes/adaptive/${quizId}/reset`);
  }

  // ============================================================================
  // V1.4 SOCRATIC INSIGHTS METHODS
  // ============================================================================

  /**
   * Generate Socratic insights for content
   * 
   * @param data - Insight request
   * @returns Socratic questions and prompts
   * 
   * @example
   * ```typescript
   * const insights = await sdk.learning.generateSocraticInsights({
   *   contentId: 'strand-123',
   *   contentType: 'strand',
   *   depth: 'deep',
   *   focusArea: 'causality',
   *   maxQuestions: 7
   * });
   * 
   * console.log('Questions:', insights.questions);
   * console.log('Reflection prompts:', insights.reflectionPrompts);
   * ```
   * 
   * @public
   * @since 1.4.0
   */
  async generateSocraticInsights(data: {
    contentId: string;
    contentType: 'flashcard' | 'quiz' | 'strand' | 'loom' | 'weave';
    depth?: 'quick' | 'medium' | 'deep';
    focusArea?: string;
    includeReferences?: boolean;
    maxQuestions?: number;
  }): Promise<{
    questions: string[];
    reflectionPrompts: string[];
    connections?: string[];
    deeperTopics?: string[];
    cost: number;
  }> {
    return this.sdk.request('POST', '/api/v1/socratic/insights', { body: data });
  }
}


