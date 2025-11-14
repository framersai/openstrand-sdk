/**
 * OpenStrand SDK Client
 * 
 * Thin wrapper around OpenStrand REST APIs. Provides typed methods for all
 * OpenStrand backend endpoints (templates, fact-checking, enrichment, plugins, wizard).
 * 
 * The SDK is a **client library only** - all business logic, LLM providers, and
 * external integrations live in the backend services.
 * 
 * @module client
 * 
 * @example
 * ```typescript
 * import { OpenStrandSDK } from '@framers/openstrand-sdk';
 * 
 * // Initialize SDK
 * const sdk = new OpenStrandSDK({
 *   baseUrl: 'http://localhost:8000',
 *   token: 'your-jwt-token',
 * });
 * 
 * // Use modules
 * const templates = await sdk.templates.list({ category: 'STORYTELLING' });
 * const job = await sdk.factCheck.start('Is the sky blue?');
 * const companyData = await sdk.enrichment.enrichDomain('google.com');
 * ```
 */

import { TemplatesModule } from './modules/templates.module';
import { FactCheckModule } from './modules/factCheck.module';
import { EnrichmentModule } from './modules/enrichment.module';
import { PluginsModule } from './modules/plugins.module';
import { WizardModule } from './modules/wizard.module';
import { RagModule } from './modules/rag.module';
import { DataIntelligenceModule } from './modules/dataIntelligence.module';

/**
 * OpenStrand SDK configuration
 */
export interface OpenStrandSDKConfig {
  /** Base URL of OpenStrand backend (e.g., 'http://localhost:8000') */
  baseUrl: string;
  /** JWT authentication token (optional for public endpoints) */
  token?: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
}

/**
 * Main OpenStrand SDK Client
 * 
 * @example
 * ```typescript
 * const sdk = new OpenStrandSDK({
 *   baseUrl: 'http://localhost:8000',
 *   token: 'your-jwt-token'
 * });
 * 
 * // Use modules
 * const templates = await sdk.templates.list();
 * const job = await sdk.factCheck.start('Is the sky blue?');
 * ```
 */
export class OpenStrandSDK {
  private baseUrl: string;
  private token?: string;
  private timeout: number;

  // Module instances
  public templates: TemplatesModule;
  public factCheck: FactCheckModule;
  public enrichment: EnrichmentModule;
  public plugins: PluginsModule;
  public wizard: WizardModule;
  public dataIntelligence: DataIntelligenceModule;
  public rag: RagModule;

  constructor(config: OpenStrandSDKConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.token = config.token;
    this.timeout = config.timeout || 30000;

    // Initialize modules
    this.templates = new TemplatesModule(this);
    this.factCheck = new FactCheckModule(this);
    this.enrichment = new EnrichmentModule(this);
    this.plugins = new PluginsModule(this);
    this.wizard = new WizardModule(this);
    this.dataIntelligence = new DataIntelligenceModule(this);
    this.rag = new RagModule(this);
  }

  /**
   * Make HTTP request to API
   */
  async request<T = unknown>(
    method: string,
    path: string,
    options?: {
      body?: unknown;
      query?: Record<string, string>;
      headers?: Record<string, string>;
    }
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);

    // Add query params
    if (options?.query) {
      Object.entries(options.query).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options?.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    // Make request
    const response = await fetch(url.toString(), {
      method,
      headers,
      body: options?.body ? JSON.stringify(options.body) : undefined,
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new OpenStrandSDKError(
        error.message || `HTTP ${response.status}`,
        response.status,
        error
      );
    }

    return response.json();
  }

  /**
   * Update authentication token
   */
  setToken(token: string): void {
    this.token = token;
  }

  /**
   * Get current configuration
   */
  getConfig(): OpenStrandSDKConfig {
    return {
      baseUrl: this.baseUrl,
      token: this.token,
      timeout: this.timeout,
    };
  }
}

/**
 * SDK Error
 */
export class OpenStrandSDKError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'OpenStrandSDKError';
  }
}
