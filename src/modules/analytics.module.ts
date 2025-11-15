/**
 * Analytics Module
 *
 * High-level client wrapper for Strand → Loom → Weave analytics.
 * Mirrors the `/api/v1/analytics/...` endpoints used by the PKMS dashboards.
 *
 * @module modules/analytics
 * @author Framers
 * @since 1.5.0
 * @license MIT
 *
 * @example
 * ```typescript
 * import { OpenStrandSDK } from '@framers/openstrand-sdk';
 *
 * const sdk = new OpenStrandSDK({ baseUrl: 'http://localhost:8000', token: '...'});
 *
 * // Fetch strand-level analytics
 * const strand = await sdk.analytics.getStrandSummary('strand-123');
 *
 * // Fetch loom-level analytics (project scope)
 * const loom = await sdk.analytics.getLoomSummary('scope-abc');
 *
 * // Fetch weave-level analytics (workspace)
 * const weave = await sdk.analytics.getWeaveSummary('team:my-team-id');
 * ```
 */

import type { OpenStrandSDK } from '../client';

/**
 * Strand-level analytics summary.
 *
 * This shape matches the backend `StrandAnalyticsSummary` used by the PKMS
 * dashboards. It is intentionally minimal and chart-focused.
 */
export interface StrandAnalyticsSummary {
  type: 'strand';
  id: string;
  strandType: string;
  scopeId?: string | null;
  teamId?: string | null;
  workspaceKey: string;
  metrics: {
    tokenCount: number;
    wordCount: number;
    readingTimeMinutes: number;
    chunkCount: number;
    keywords: Array<{ term: string; score: number; count: number }>;
    bigrams: Array<{ term: string; score: number; count: number }>;
    entityHistogram: Array<{ type: string; count: number }>;
    posDistribution: Record<string, number>;
    sentiment: {
      positive: number;
      negative: number;
      neutral: number;
      compound: number;
    };
    readability: {
      fleschKincaid: number;
      colemanLiau: number;
    };
  };
  ratings: {
    llm?: number | null;
    humanAverage?: number | null;
    userRating?: number | null;
    counts: Record<string, number>;
  };
  metadata: {
    mime?: string | null;
    sizeBytes?: number | null;
    language?: string | null;
    ingestDate?: string;
    lastEmbeddedAt?: string | null;
    updatedAt: string;
  };
  updatedAt: string;
}

/**
 * Loom-level analytics summary (project scope).
 */
export interface LoomAnalyticsSummary {
  type: 'loom';
  id: string;
  name: string;
  metrics: {
    totalStrands: number;
    totalTokens: number;
    averageTokensPerStrand: number;
    topicDistribution: Array<{ label: string; value: number }>;
    vocabularyGrowth: Array<{ date: string; tokens: number }>;
    entityTimeline: Array<{ date: string; [key: string]: number | string }>;
    embeddingCoverage: {
      embedded: number;
      pending: number;
      percent: number;
    };
    ratings: {
      humanAverage: number;
      llmAverage: number;
      counts: Record<string, number>;
    };
  };
  updatedAt: string;
}

/**
 * Weave-level analytics summary (workspace).
 */
export interface WeaveAnalyticsSummary {
  type: 'weave';
  workspaceKey: string;
  teamId?: string | null;
  metrics: {
    totalLooms: number;
    totalStrands: number;
    totalTokens: number;
    storageFootprintBytes: number;
    cost: {
      totalUsd: number;
      byProvider: Array<{ provider: string; amount: number }>;
    };
    usageByHour: Array<{ hour: number; count: number }>;
    embeddingCoverage: {
      embedded: number;
      pending: number;
      percent: number;
    };
    ratings: {
      humanAverage: number;
      counts: Record<string, number>;
    };
  };
  updatedAt: string;
}

/**
 * Analytics Module
 *
 * Provides typed helpers for Strand → Loom → Weave analytics endpoints.
 *
 * @public
 */
export class AnalyticsModule {
  constructor(private sdk: OpenStrandSDK) {}

  /**
   * Fetch analytics summary for a single strand.
   *
   * @param strandId - Strand identifier
   * @param options - Optional flags (fresh to bypass cache)
   * @returns Strand analytics summary
   *
   * @example
   * ```typescript
   * const strand = await sdk.analytics.getStrandSummary('strand-123', { fresh: true });
   * console.log(strand.metrics.tokenCount);
   * ```
   */
  async getStrandSummary(
    strandId: string,
    options?: { fresh?: boolean }
  ): Promise<StrandAnalyticsSummary> {
    const query: Record<string, string> = {};
    if (options?.fresh) {
      query.fresh = 'true';
    }

    return this.sdk.request<StrandAnalyticsSummary>(
      'GET',
      `/api/v1/analytics/strands/${strandId}`,
      Object.keys(query).length ? { query } : undefined,
    );
  }

  /**
   * Fetch analytics summary for a Loom / project scope.
   *
   * @param scopeId - Strand scope identifier
   * @param options - Optional flags (fresh to bypass cache)
   * @returns Loom analytics summary
   */
  async getLoomSummary(
    scopeId: string,
    options?: { fresh?: boolean }
  ): Promise<LoomAnalyticsSummary> {
    const query: Record<string, string> = {};
    if (options?.fresh) {
      query.fresh = 'true';
    }

    return this.sdk.request<LoomAnalyticsSummary>(
      'GET',
      `/api/v1/analytics/looms/${scopeId}`,
      Object.keys(query).length ? { query } : undefined,
    );
  }

  /**
   * Fetch analytics summary for a Weave / workspace.
   *
   * @param workspaceKey - Either `'community'` or `team:ID`
   * @param options - Optional flags (fresh to bypass cache)
   * @returns Weave analytics summary
   */
  async getWeaveSummary(
    workspaceKey: string,
    options?: { fresh?: boolean }
  ): Promise<WeaveAnalyticsSummary> {
    const query: Record<string, string> = {};
    if (options?.fresh) {
      query.fresh = 'true';
    }

    return this.sdk.request<WeaveAnalyticsSummary>(
      'GET',
      `/api/v1/analytics/weaves/${workspaceKey}`,
      Object.keys(query).length ? { query } : undefined,
    );
  }
}


