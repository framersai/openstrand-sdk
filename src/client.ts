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
import { CostModule } from './modules/cost.module';
import { AnalyticsModule } from './modules/analytics.module';
import { IllustrationsModule } from './modules/illustrations.module';
import { LearningModule } from './modules/learning.module';
import { PomodoroModule } from './modules/pomodoro.module';
import { ProductivityModule } from './modules/productivity.module';
import { GamificationModule } from './modules/gamification.module';
import { ExportModule } from './modules/export.module';

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
  public cost: CostModule;
  /**
   * Strand → Loom → Weave analytics helper.
   */
  public analytics: AnalyticsModule;
  /**
   * Illustration generation and batch workflows.
   */
  public illustrations: IllustrationsModule;
  /**
   * Learning materials: flashcards, quizzes, analytics-to-study generation.
   */
  public learning: LearningModule;
  /**
   * Pomodoro timer sessions and tracking (v1.3)
   */
  public pomodoro: PomodoroModule;
  /**
   * Productivity analytics and insights (v1.3)
   */
  public productivity: ProductivityModule;
  /**
   * Gamification: badges, leaderboards, sharing (v1.4)
   */
  public gamification: GamificationModule;
  /**
   * Universal export functionality (v1.4)
   */
  public export: ExportModule;

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
    this.cost = new CostModule(this);
    this.analytics = new AnalyticsModule(this);
    this.illustrations = new IllustrationsModule(this);
    this.learning = new LearningModule(this);
    this.pomodoro = new PomodoroModule(this);
    this.productivity = new ProductivityModule(this);
    this.gamification = new GamificationModule(this);
    this.export = new ExportModule(this);
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

    const fetchPromise = fetch(url.toString(), {
      method,
      headers,
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new OpenStrandSDKError('Request timed out', 408)),
        this.timeout,
      );
    });

    const response = await Promise.race([fetchPromise, timeoutPromise]);

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

  /**
   * Make raw HTTP request (for binary responses like file downloads)
   * 
   * @internal
   */
  async requestRaw(
    method: string,
    path: string,
    options?: {
      body?: unknown;
      query?: Record<string, string>;
      headers?: Record<string, string>;
    }
  ): Promise<Response> {
    const url = new URL(`${this.baseUrl}${path}`);

    if (options?.query) {
      Object.entries(options.query).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options?.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url.toString(), {
      method,
      headers,
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new OpenStrandSDKError(
        error.message || `HTTP ${response.status}`,
        response.status,
        error
      );
    }

    return response;
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
