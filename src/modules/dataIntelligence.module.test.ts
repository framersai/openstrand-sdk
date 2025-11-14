import { describe, it, expect } from 'vitest';
import {
  buildVocabularySummary,
  VocabularyDocument,
} from './dataIntelligence.module';

describe('DataIntelligenceModule', () => {
  const documents: VocabularyDocument[] = [
    {
      id: 'strand-1',
      title: 'Civic Data Atlas',
      text: 'The Civic Data Atlas catalogues city energy usage and water quality projects.',
      tags: ['civic', 'data'],
    },
    {
      id: 'strand-2',
      title: 'City Energy Projects',
      text: 'Energy projects in Austin leverage OpenStrand pipelines for statistical review.',
      tags: ['energy'],
    },
  ];

  it('builds vocabulary summary with TF/IDF scoring', () => {
    const summary = buildVocabularySummary(documents, { maxTerms: 5 });

    expect(summary.metadata.totalDocuments).toBe(2);
    expect(summary.terms.length).toBeGreaterThan(0);

    const civicTerm = summary.terms.find((term) => term.term === 'civic');
    expect(civicTerm).toBeDefined();
    expect(civicTerm?.count).toBeGreaterThan(0);
    expect(civicTerm?.score).toBeGreaterThan(0);

    expect(summary.bigrams.length).toBeGreaterThan(0);
    expect(summary.entities.length).toBeGreaterThan(0);
  });

  it('allows custom stop words and limits bigrams', () => {
    const summary = buildVocabularySummary(documents, {
      stopWords: ['energy'],
      maxBigrams: 3,
    });

    expect(summary.bigrams.length).toBeLessThanOrEqual(3);
    const energyTerm = summary.terms.find((term) => term.term === 'energy');
    expect(energyTerm).toBeUndefined();
  });

  it('throws when no documents are provided', () => {
    expect(() => buildVocabularySummary([], {})).toThrow();
  });
});

