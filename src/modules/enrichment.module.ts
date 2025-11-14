/**
 * Enrichment Module
 * 
 * Client wrapper for /api/enrichment endpoints
 * 
 * @module modules/enrichment
 * 
 * @example
 * ```typescript
 * // Enrich single domain
 * const data = await sdk.enrichment.enrichDomain('google.com');
 * console.log(data.logoUrl);
 * 
 * // Batch enrich
 * const results = await sdk.enrichment.enrichBatch(['google.com', 'microsoft.com']);
 * 
 * // Clear cache
 * await sdk.enrichment.clearCache('google.com');
 * ```
 */

import type { OpenStrandSDK } from '../client';

/**
 * Enriched company data
 */
export interface EnrichedCompanyData {
  /** Domain name */
  domain: string;
  /** Company name */
  name?: string;
  /** Logo URL */
  logoUrl?: string;
  /** Favicon URL */
  faviconUrl?: string;
  /** Company description */
  description?: string;
  /** Industry */
  industry?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Data source (unavatar, duckduckgo, etc.) */
  source: string;
  /** Whether data came from cache */
  cached: boolean;
}

/**
 * Batch enrichment result
 */
export interface BatchEnrichmentResult {
  /** Enriched company data */
  results: EnrichedCompanyData[];
  /** Number of successful enrichments */
  processed: number;
  /** Number of failed enrichments */
  failed: number;
}

/**
 * Enrichment Module
 * 
 * Provides methods for company data enrichment (logos, metadata)
 * using multiple data sources with caching.
 */
export class EnrichmentModule {
  /**
   * Creates an EnrichmentModule instance
   * 
   * @param sdk - OpenStrand SDK instance
   */
  constructor(private sdk: OpenStrandSDK) {}

  /**
   * Enrich a domain with company data
   * 
   * @param domain - Domain to enrich (e.g., 'google.com')
   * @param skipCache - Skip cache and force fresh fetch
   * @returns Enriched company data
   * 
   * @example
   * ```typescript
   * const data = await sdk.enrichment.enrichDomain('google.com');
   * console.log(data.logoUrl); // 'https://unavatar.io/google.com'
   * console.log(data.cached); // true (if from cache)
   * ```
   */
  async enrichDomain(domain: string, skipCache = false): Promise<EnrichedCompanyData> {
    const query: Record<string, string> = {};
    if (skipCache) {
      query.skipCache = 'true';
    }

    return this.sdk.request('GET', `/api/enrichment/domain/${domain}`, { query });
  }

  /**
   * Batch enrich multiple domains
   * 
   * @param domains - Array of domains to enrich
   * @returns Batch enrichment results
   * 
   * @example
   * ```typescript
   * const results = await sdk.enrichment.enrichBatch([
   *   'google.com',
   *   'microsoft.com',
   *   'apple.com',
   * ]);
   * 
   * console.log(`Processed: ${results.processed}, Failed: ${results.failed}`);
   * results.results.forEach(data => {
   *   console.log(`${data.name}: ${data.logoUrl}`);
   * });
   * ```
   */
  async enrichBatch(domains: string[]): Promise<BatchEnrichmentResult> {
    return this.sdk.request('POST', '/api/enrichment/batch', {
      body: { domains },
    });
  }

  /**
   * Clear cache for a domain
   * 
   * Requires admin privileges.
   * 
   * @param domain - Domain to clear cache for
   * @returns Success message
   * 
   * @example
   * ```typescript
   * await sdk.enrichment.clearCache('google.com');
   * console.log('Cache cleared');
   * ```
   */
  async clearCache(domain: string): Promise<{ message: string }> {
    return this.sdk.request('DELETE', `/api/enrichment/cache/${domain}`);
  }

  /**
   * Clear expired cache entries
   * 
   * Requires admin privileges.
   * 
   * @returns Number of deleted entries
   * 
   * @example
   * ```typescript
   * const result = await sdk.enrichment.clearExpiredCache();
   * console.log(`Cleared ${result.deleted} expired entries`);
   * ```
   */
  async clearExpiredCache(): Promise<{ deleted: number; message: string }> {
    return this.sdk.request('POST', '/api/enrichment/cache/cleanup');
  }
}

