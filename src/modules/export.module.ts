/**
 * Export Module
 * 
 * Client wrapper for universal export functionality.
 * 
 * @module modules/export
 * @author OpenStrand
 * @since 1.4.0
 * @license MIT
 * 
 * @example
 * ```typescript
 * import { OpenStrandSDK } from '@framers/openstrand-sdk';
 * 
 * const sdk = new OpenStrandSDK({ baseUrl: 'http://localhost:8000' });
 * 
 * // Export flashcard deck to Anki
 * const buffer = await sdk.export.flashcardDeck('Biology', {
 *   format: 'anki',
 *   includeImages: true
 * });
 * 
 * // Save to file
 * await fs.writeFile('biology.apkg', buffer);
 * ```
 */

import type { OpenStrandSDK } from '../client';

export type ExportFormat = 'pdf' | 'docx' | 'markdown' | 'html' | 'text' | 'json' | 'csv' | 'png' | 'anki' | 'zip';

export interface ExportOptions {
  format: ExportFormat;
  includeMetadata?: boolean;
  includeAttachments?: boolean;
  includeAnswers?: boolean;
  markdownFlavor?: 'github' | 'commonmark' | 'obsidian';
}

/**
 * Export Module
 * 
 * Provides methods for exporting content to various formats.
 * 
 * @public
 */
export class ExportModule {
  constructor(private sdk: OpenStrandSDK) {}

  /**
   * Export flashcard deck
   * 
   * @param deckName - Deck name
   * @param options - Export options
   * @returns File buffer
   * 
   * @example
   * ```typescript
   * const buffer = await sdk.export.flashcardDeck('Physics', {
   *   format: 'pdf',
   *   includeMetadata: true
   * });
   * ```
   * 
   * @public
   */
  async flashcardDeck(deckName: string, options: ExportOptions): Promise<Buffer> {
    const response = await this.sdk.requestRaw('POST', `/api/v1/export/flashcards/${deckName}`, {
      body: options,
    });

    return Buffer.from(await response.arrayBuffer());
  }

  /**
   * Export quiz
   * 
   * @param quizId - Quiz ID
   * @param options - Export options
   * @returns File buffer
   * 
   * @example
   * ```typescript
   * const buffer = await sdk.export.quiz('quiz-123', {
   *   format: 'pdf',
   *   includeAnswers: true
   * });
   * ```
   * 
   * @public
   */
  async quiz(quizId: string, options: ExportOptions): Promise<Buffer> {
    const response = await this.sdk.requestRaw('POST', `/api/v1/export/quizzes/${quizId}`, {
      body: options,
    });

    return Buffer.from(await response.arrayBuffer());
  }

  /**
   * Export journal entries
   * 
   * @param startDate - Start date
   * @param endDate - End date
   * @param options - Export options
   * @returns File buffer
   * 
   * @example
   * ```typescript
   * const buffer = await sdk.export.journal(
   *   '2024-01-01',
   *   '2024-12-31',
   *   { format: 'markdown' }
   * );
   * ```
   * 
   * @public
   */
  async journal(startDate: string, endDate: string, options: ExportOptions): Promise<Buffer> {
    const response = await this.sdk.requestRaw('POST', '/api/v1/export/journal', {
      body: { startDate, endDate, ...options },
    });

    return Buffer.from(await response.arrayBuffer());
  }

  /**
   * Export strand
   * 
   * @param strandId - Strand ID
   * @param options - Export options
   * @returns File buffer
   * 
   * @example
   * ```typescript
   * const buffer = await sdk.export.strand('strand-123', {
   *   format: 'docx',
   *   includeRelationships: true
   * });
   * ```
   * 
   * @public
   */
  async strand(strandId: string, options: ExportOptions): Promise<Buffer> {
    const response = await this.sdk.requestRaw('POST', `/api/v1/export/strand/${strandId}`, {
      body: options,
    });

    return Buffer.from(await response.arrayBuffer());
  }
}

