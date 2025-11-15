/**
 * Analytics Module Tests
 *
 * @module modules/analytics.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OpenStrandSDK } from '../client';
import { AnalyticsModule } from './analytics.module';

describe('AnalyticsModule', () => {
  let sdk: OpenStrandSDK;
  let analytics: AnalyticsModule;

  beforeEach(() => {
    sdk = new OpenStrandSDK({
      baseUrl: 'http://localhost:8000',
      token: 'test-token',
    });
    analytics = sdk.analytics;
    // Mock global fetch
    global.fetch = vi.fn();
  });

  it('calls strand analytics endpoint with optional fresh flag', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        type: 'strand',
        id: 's1',
        strandType: 'document',
        workspaceKey: 'community',
        metrics: {
          tokenCount: 10,
          wordCount: 5,
          readingTimeMinutes: 1,
          chunkCount: 1,
          keywords: [],
          bigrams: [],
          entityHistogram: [],
          posDistribution: {},
          sentiment: { positive: 0, negative: 0, neutral: 1, compound: 0 },
          readability: { fleschKincaid: 0, colemanLiau: 0 },
        },
        ratings: { counts: {} },
        metadata: { updatedAt: new Date().toISOString() },
        updatedAt: new Date().toISOString(),
      }),
    });

    await analytics.getStrandSummary('s1', { fresh: true });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/analytics/strands/s1'),
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      }),
    );
    expect((global.fetch as any).mock.calls[0][0]).toContain('fresh=true');
  });
});


