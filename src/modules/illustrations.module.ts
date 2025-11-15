/**
 * Illustrations Module
 *
 * Client wrapper around the `/api/v1/illustrations/...` endpoints.
 * Supports per-strand illustration generation, batch jobs, cost estimates,
 * and previews with optional RAG/contextual prompts.
 *
 * @module modules/illustrations
 * @author Framers
 * @since 1.5.0
 * @license MIT
 *
 * @example
 * ```typescript
 * import { OpenStrandSDK } from '@framers/openstrand-sdk';
 *
 * const sdk = new OpenStrandSDK({ baseUrl: 'http://localhost:8000', token: '...' });
 *
 * // Generate a single illustration for a strand
 * const result = await sdk.illustrations.generateForStrand({
 *   strandId: 'strand-123',
 *   summary: 'A short conceptual description of the page.',
 *   stylePreset: 'flat_pastel',
 *   useContext: true,
 * });
 *
 * console.log(result.images[0].url);
 * ```
 */

import type { OpenStrandSDK } from '../client';

/**
 * Illustration style presets. These map directly to the presets supported by
 * the backend IllustrationService.
 */
export type IllustrationStylePreset =
  | 'minimal_vector'
  | 'flat_pastel'
  | 'watercolor_soft'
  | 'pencil_sketch'
  | 'comic_lineart'
  | 'realistic_soft'
  | 'chalkboard'
  | 'blueprint'
  | 'retro_comic'
  | 'noir_mono'
  | 'digital_paint'
  | 'custom';

/**
 * Safety level for illustrations.
 */
export type IllustrationSafetyLevel =
  | 'default'
  | 'censored'
  | 'uncensored'
  | 'strict';

/**
 * Image generation options (subset of the backend AIImageOptions).
 */
export interface IllustrationImageOptions {
  size?: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792';
  quality?: 'standard' | 'hd';
  style?: 'natural' | 'vivid';
  n?: number;
  responseFormat?: 'url' | 'b64_json';
  seed?: number;
}

/**
 * Single illustration image payload.
 */
export interface IllustrationImage {
  url?: string;
  b64_json?: string;
  revised_prompt?: string;
}

/**
 * Request payload for generating a strand illustration.
 */
export interface GenerateIllustrationRequest {
  strandId: string;
  title?: string;
  summary: string;
  stylePreset?: IllustrationStylePreset;
  customStylePrompt?: string;
  safetyLevel?: IllustrationSafetyLevel;
  imageOptions?: IllustrationImageOptions;
  /**
   * Whether to enrich prompts with Loom/Weave visual language + tiny RAG window.
   */
  useContext?: boolean;
  loomId?: string;
  weaveId?: string;
}

export interface GenerateIllustrationResponse {
  images: IllustrationImage[];
  prompt: string;
}

/**
 * Page summary used for batch operations (e.g., PDF/EPUB per-page artwork).
 */
export interface IllustrationPageSummary {
  pageNumber: number;
  title?: string;
  summary: string;
  textLength?: number;
}

export interface BatchEstimateResponse {
  strandId: string;
  pageCount: number;
  totalCost: number;
  costPerPage: number;
  breakdown: {
    images: number;
    textGeneration: number;
  };
  notes: string[];
}

export interface PreviewIllustration {
  pageNumber: number;
  image: IllustrationImage;
  cost: number;
}

export interface PreviewResponse {
  previews: PreviewIllustration[];
  totalCost: number;
  count: number;
}

export interface BatchJobStatus {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: {
    completed: number;
    total: number;
    current?: number;
  };
  results: Array<{
    pageNumber: number;
    imageUrl?: string;
    error?: string;
    cost?: number;
  }>;
  totalCost: number;
  estimatedCost: number;
  startedAt: string;
  completedAt?: string;
}

/**
 * Illustrations Module
 *
 * Provides a typed, ergonomic wrapper over the illustration generation API.
 *
 * @public
 */
export class IllustrationsModule {
  constructor(private sdk: OpenStrandSDK) {}

  /**
   * Generate one or more illustrations for a strand (or a specific page/section).
   *
   * @param request - Illustration generation request
   * @returns Generated images and the effective prompt
   */
  async generateForStrand(
    request: GenerateIllustrationRequest
  ): Promise<GenerateIllustrationResponse> {
    const res = await this.sdk.request<{
      success: boolean;
      data: { images: IllustrationImage[]; prompt: string };
    }>('POST', '/api/v1/illustrations/strand', {
      body: request,
    });

    return res.data;
  }

  /**
   * Get a cost estimate for batch illustration generation (no images created).
   *
   * @param input - Estimate parameters
   * @returns Cost estimate for the batch
   */
  async estimateBatch(input: {
    strandId: string;
    pages: IllustrationPageSummary[];
    stylePreset?: IllustrationStylePreset;
    customStylePrompt?: string;
    safetyLevel?: IllustrationSafetyLevel;
    imageOptions?: IllustrationImageOptions;
    useContext?: boolean;
    loomId?: string;
    weaveId?: string;
  }): Promise<BatchEstimateResponse> {
    const res = await this.sdk.request<{
      success: boolean;
      data: BatchEstimateResponse;
    }>('POST', '/api/v1/illustrations/estimate', {
      body: input,
    });
    return res.data;
  }

  /**
   * Generate preview illustrations for the first N pages, to confirm style before
   * running a full batch.
   *
   * @param input - Preview parameters
   * @returns Preview images + cost
   */
  async preview(input: {
    strandId: string;
    pages: IllustrationPageSummary[];
    previewCount?: number;
    stylePreset?: IllustrationStylePreset;
    customStylePrompt?: string;
    safetyLevel?: IllustrationSafetyLevel;
    imageOptions?: IllustrationImageOptions;
    useContext?: boolean;
    loomId?: string;
    weaveId?: string;
  }): Promise<PreviewResponse> {
    const res = await this.sdk.request<{
      success: boolean;
      data: PreviewResponse;
    }>('POST', '/api/v1/illustrations/preview', {
      body: input,
    });
    return res.data;
  }

  /**
   * Start a background batch illustration job.
   *
   * @param input - Batch parameters
   * @returns Initial job status with jobId for tracking
   */
  async startBatch(input: {
    strandId: string;
    pages: IllustrationPageSummary[];
    stylePreset?: IllustrationStylePreset;
    customStylePrompt?: string;
    safetyLevel?: IllustrationSafetyLevel;
    imageOptions?: IllustrationImageOptions;
    useContext?: boolean;
    loomId?: string;
    weaveId?: string;
  }): Promise<{ jobId: string; status: string; message: string }> {
    const res = await this.sdk.request<{
      success: boolean;
      data: { jobId: string; status: string; message: string };
    }>('POST', '/api/v1/illustrations/batch', {
      body: input,
    });
    return res.data;
  }

  /**
   * Get batch illustration job progress.
   *
   * @param jobId - Job identifier returned from `startBatch`
   * @returns Current batch job status
   */
  async getBatch(jobId: string): Promise<BatchJobStatus> {
    const res = await this.sdk.request<{
      success: boolean;
      data: BatchJobStatus;
    }>('GET', `/api/v1/illustrations/batch/${jobId}`);
    return res.data;
  }

  /**
   * Cancel a running batch illustration job.
   *
   * @param jobId - Job identifier
   */
  async cancelBatch(jobId: string): Promise<void> {
    await this.sdk.request('DELETE', `/api/v1/illustrations/batch/${jobId}`);
  }
}


