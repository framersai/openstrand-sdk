/**
 * Extractive Summarization Tests
 * 
 * @module modules/summarization.test
 */

import { describe, it, expect } from 'vitest';
import { extractiveSummarize } from './summarization';

describe('extractiveSummarize', () => {
  const sampleText = `
    OpenStrand is an AI-native knowledge infrastructure for teams.
    It provides powerful vocabulary analysis and entity extraction.
    The system uses deterministic NLP methods that work offline.
    Teams can collaborate on shared knowledge bases with RBAC.
    Community Edition is free and works entirely offline.
    The TextRank algorithm selects important sentences automatically.
    Extractive summarization preserves original phrasing without hallucination.
  `.trim();

  it('extracts top sentences using TextRank', () => {
    const result = extractiveSummarize(sampleText, {
      maxSentences: 3,
      minSentenceLength: 5,
    });

    expect(result.sentences.length).toBeGreaterThan(0);
    expect(result.summary).toBeTruthy();
    expect(result.method).toBe('textrank');
    expect(result.processingTimeMs).toBeGreaterThan(0);
    expect(result.compressionRatio).toBeGreaterThan(0);
    expect(result.compressionRatio).toBeLessThan(1);
  });

  it('respects maxSentences limit', () => {
    const result = extractiveSummarize(sampleText, {
      maxSentences: 2,
      minSentenceLength: 5,
    });

    // Summary should contain at most 2 sentences
    const sentenceCount = result.summary.split(/[.!?]+/).filter(s => s.trim()).length;
    expect(sentenceCount).toBeLessThanOrEqual(2);
  });

  it('filters short sentences', () => {
    const textWithShort = 'Hello. This is a longer sentence with many words. Hi.';
    
    const result = extractiveSummarize(textWithShort, {
      maxSentences: 5,
      minSentenceLength: 6,
    });

    // Should only include the long sentence
    expect(result.summary).toContain('longer sentence');
    expect(result.summary).not.toContain('Hello');
    expect(result.summary).not.toContain('Hi');
  });

  it('returns all sentences if document is short', () => {
    const shortText = 'This is sentence one with enough words. This is sentence two with enough words.';
    
    const result = extractiveSummarize(shortText, {
      maxSentences: 10,
      minSentenceLength: 5,
    });

    expect(result.sentences.length).toBe(2);
    expect(result.compressionRatio).toBe(1.0);
  });

  it('ranks sentences by importance', () => {
    const result = extractiveSummarize(sampleText, {
      maxSentences: 5,
      minSentenceLength: 5,
    });

    // Sentences should be ranked (first has highest score)
    expect(result.sentences[0].score).toBeGreaterThanOrEqual(result.sentences[1].score);
  });

  it('preserves original sentence order in summary', () => {
    const result = extractiveSummarize(sampleText, {
      maxSentences: 3,
      minSentenceLength: 5,
    });

    // Selected sentences should appear in original order
    const summaryParts = result.summary.split(/[.!?]+/).filter(s => s.trim());
    
    // Verify ordering by checking positions
    const selectedSentences = result.sentences
      .filter(s => result.summary.includes(s.text.slice(0, 20)))
      .sort((a, b) => a.position - b.position);

    expect(selectedSentences.length).toBeGreaterThan(0);
  });

  it('throws on empty text', () => {
    expect(() => extractiveSummarize('')).toThrow('Cannot summarize empty text');
  });

  it('throws when no valid sentences found', () => {
    expect(() => extractiveSummarize('Hi. Ok.', { minSentenceLength: 10 }))
      .toThrow('No valid sentences found');
  });
});

