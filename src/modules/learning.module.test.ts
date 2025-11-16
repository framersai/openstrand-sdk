/**
 * @fileoverview Tests for LearningModule
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OpenStrandSDK } from '../client';
import { LearningModule } from './learning.module';

describe('LearningModule', () => {
  let sdk: OpenStrandSDK;
  let learning: LearningModule;

  beforeEach(() => {
    sdk = new OpenStrandSDK({
      baseUrl: 'http://localhost:8000',
      token: 'test-token',
    });
    learning = sdk.learning;

    // Mock fetch
    global.fetch = vi.fn();
  });

  describe('Flashcard Methods', () => {
    it('should create flashcard', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'card-123',
          front: { text: 'Q' },
          back: { text: 'A' },
        }),
      });

      const card = await learning.createFlashcard({
        front: { text: 'Q' },
        back: { text: 'A' },
        deck: 'Test',
      });

      expect(card.id).toBe('card-123');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/flashcards'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should get due flashcards', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { id: 'card-1', due: '2024-01-01' },
          { id: 'card-2', due: '2024-01-01' },
        ],
      });

      const cards = await learning.getDueFlashcards({ limit: 10 });

      expect(cards).toHaveLength(2);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/flashcards/due/study'),
        expect.anything()
      );
    });

    it('should record study result', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'card-1',
          interval: 6,
          ease: 2.5,
        }),
      });

      const result = await learning.recordStudy({
        flashcardId: 'card-1',
        rating: 'good',
        timeSpentMs: 5000,
      });

      expect(result.interval).toBe(6);
    });

    it('should generate flashcards with templates', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { id: 'card-1', front: { text: 'Q1' } },
          { id: 'card-2', front: { text: 'Q2' } },
        ],
      });

      const cards = await learning.generateFlashcards('strand-123', {
        count: 2,
        template: 'cloze',
        complexity: 3,
      });

      expect(cards).toHaveLength(2);
    });
  });

  describe('Quiz Methods', () => {
    it('should start quiz attempt', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          attemptId: 'attempt-123',
          questionsToAnswer: [{ id: 'q1' }],
        }),
      });

      const attempt = await learning.startQuizAttempt('quiz-123');

      expect(attempt.attemptId).toBe('attempt-123');
    });

    it('should submit quiz attempt', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          score: 85,
          passed: true,
          results: [],
        }),
      });

      const results = await learning.submitQuizAttempt('attempt-123', [
        { questionId: 'q1', answer: 'A', timeSpentMs: 5000 },
      ]);

      expect(results.score).toBe(85);
      expect(results.passed).toBe(true);
    });
  });

  describe('Adaptive Quiz Methods', () => {
    it('should start adaptive session', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sessionId: 'session-123',
          firstQuestion: { id: 'q1' },
          progress: { bucket0: 5, bucket1: 3 },
        }),
      });

      const session = await learning.startAdaptiveSession('quiz-123');

      expect(session.sessionId).toBe('session-123');
      expect(session.progress.bucket0).toBe(5);
    });

    it('should record adaptive answer', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          newBucket: 2,
          nextQuestion: { id: 'q2' },
        }),
      });

      const result = await learning.recordAdaptiveAnswer('quiz-123', {
        questionId: 'q1',
        isCorrect: true,
        timeSpentMs: 3000,
      });

      expect(result.newBucket).toBe(2);
      expect(result.nextQuestion.id).toBe('q2');
    });

    it('should explain answer', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          explanation: 'The correct answer is...',
          cost: 0.005,
        }),
      });

      const explanation = await learning.explainAnswer('quiz-123', {
        questionId: 'q1',
        userAnswer: 'B',
        mode: 'concise',
      });

      expect(explanation.explanation).toContain('correct');
      expect(explanation.cost).toBeGreaterThan(0);
    });
  });

  describe('Socratic Insights Methods', () => {
    it('should generate socratic insights', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          questions: ['Why?', 'How?', 'What if?'],
          reflectionPrompts: ['Consider...'],
          cost: 0.01,
        }),
      });

      const insights = await learning.generateSocraticInsights({
        contentId: 'strand-123',
        contentType: 'strand',
        depth: 'medium',
      });

      expect(insights.questions).toHaveLength(3);
      expect(insights.cost).toBeGreaterThan(0);
    });
  });

  describe('Gallery Methods', () => {
    it('should browse gallery', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { id: 'item-1', type: 'flashcard' },
          { id: 'item-2', type: 'quiz' },
        ],
      });

      const items = await learning.browseGallery({
        type: 'flashcard',
        sortBy: 'top',
      });

      expect(items).toHaveLength(2);
    });

    it('should vote on content', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          upvotes: 5,
          downvotes: 1,
        }),
      });

      const result = await learning.voteGallery({
        contentType: 'flashcard',
        contentId: 'card-123',
        value: 1,
      });

      expect(result.upvotes).toBe(5);
    });
  });
});

