/**
 * Enrichment Module Tests
 * 
 * @module modules/enrichment.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenStrandSDK } from '../client';
import { EnrichmentModule } from './enrichment.module';

describe('EnrichmentModule', () => {
  let sdk: OpenStrandSDK;
  let enrichmentModule: EnrichmentModule;

  beforeEach(() => {
    sdk = new OpenStrandSDK({
      baseUrl: 'http://localhost:8000',
      token: 'test-token',
    });
    enrichmentModule = sdk.enrichment;

    global.fetch = vi.fn();
  });

  describe('enrichDomain', () => {
    it('should enrich domain', async () => {
      const mockData = {
        domain: 'google.com',
        name: 'Google',
        logoUrl: 'https://unavatar.io/google.com',
        faviconUrl: 'https://www.google.com/favicon.ico',
        description: 'Search engine',
        source: 'unavatar',
        cached: false,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await enrichmentModule.enrichDomain('google.com');

      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/enrichment/domain/google.com',
        expect.any(Object)
      );
    });

    it('should skip cache when requested', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ domain: 'google.com', source: 'unavatar', cached: false }),
      });

      await enrichmentModule.enrichDomain('google.com', true);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('skipCache=true'),
        expect.any(Object)
      );
    });
  });

  describe('enrichBatch', () => {
    it('should enrich multiple domains', async () => {
      const mockResult = {
        results: [
          { domain: 'google.com', name: 'Google', source: 'unavatar', cached: false },
          { domain: 'microsoft.com', name: 'Microsoft', source: 'unavatar', cached: false },
        ],
        processed: 2,
        failed: 0,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResult,
      });

      const result = await enrichmentModule.enrichBatch(['google.com', 'microsoft.com']);

      expect(result).toEqual(mockResult);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/enrichment/batch',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ domains: ['google.com', 'microsoft.com'] }),
        })
      );
    });

    it('should report partial failures', async () => {
      const mockResult = {
        results: [
          { domain: 'google.com', name: 'Google', source: 'unavatar', cached: false },
        ],
        processed: 1,
        failed: 1,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResult,
      });

      const result = await enrichmentModule.enrichBatch(['google.com', 'bad-domain.com']);

      expect(result.failed).toBe(1);
      expect(result.processed).toBe(1);
    });
  });

  describe('clearCache', () => {
    it('should clear cache for domain', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Cache cleared successfully' }),
      });

      const result = await enrichmentModule.clearCache('google.com');

      expect(result.message).toBe('Cache cleared successfully');
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/enrichment/cache/google.com',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  describe('clearExpiredCache', () => {
    it('should clear expired cache entries', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ deleted: 42, message: 'Cleared 42 expired cache entries' }),
      });

      const result = await enrichmentModule.clearExpiredCache();

      expect(result.deleted).toBe(42);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/enrichment/cache/cleanup',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });
});

