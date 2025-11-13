
/**
 * @fileoverview OpenStrand SDK Main Client
 * @module @framers/openstrand-sdk/client
 * @description
 * Main SDK client class providing access to all OpenStrand API endpoints.
 * 
 * @author Framers <team@frame.dev>
 * @license MIT
 */

import type {
  SDKConfig,
  ApiResponse,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  MagicLinkRequest,
  User,
  Strand,
  CreateStrandRequest,
  UpdateStrandRequest,
  Collection,
  CreateCollectionRequest,
  Weave,
  WeaveEdge,
  Visualization,
  CreateVisualizationRequest,
  VisualizationExportFormat,
  VisualizationTierInfo,
  ImportResult,
  ExportOptions,
  SearchResponse,
  PaginatedResponse,
  PaginationOptions,
  Visibility,
  StrandRelationship,
  StrandStructureRequest,
  StructureRequestPayload,
  StructureRequestStatus,
  LeaderboardEntry,
  DatasetSummary,
  DatasetPreview,
  DatasetSchema,
} from './types';

import {
  OpenStrandError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ValidationError,
  NetworkError,
} from './errors';

/**
 * OpenStrand SDK Client
 * 
 * @remarks
 * Provides type-safe access to OpenStrand backend APIs.
 * Supports both Community Edition and Team Edition backends.
 * 
 * @example
 * ```typescript
 * const sdk = new OpenStrandSDK({
 *   apiUrl: 'http://localhost:8000'
 * });
 * 
 * // Login
 * const { user, token } = await sdk.auth.login({
 *   username: 'demo',
 *   password: 'pass'
 * });
 * 
 * sdk.setToken(token);
 * 
 * // Create strand
 * const strand = await sdk.strands.create({
 *   type: 'document',
 *   title: 'My Document'
 * });
 * ```
 */
export class OpenStrandSDK {
  private config: Required<SDKConfig>;
  private token?: string;
  private apiKey?: string;
  private _capabilities?: any;

  /**
   * Create new SDK instance
   * 
   * @param config - SDK configuration
   */
  constructor(config: SDKConfig) {
    this.config = {
      apiUrl: config.apiUrl,
      token: config.token ?? '',
      apiKey: config.apiKey ?? '',
      timeout: config.timeout || 30000,
      headers: config.headers || {},
      debug: config.debug || false,
      retry: {
        enabled: config.retry?.enabled ?? true,
        maxRetries: config.retry?.maxRetries || 3,
        retryDelay: config.retry?.retryDelay || 1000,
      },
    };

    this.token = config.token;
    this.apiKey = config.apiKey;

    if (this.config.debug) {
      console.log('[OpenStrandSDK] Initialized with config:', {
        apiUrl: this.config.apiUrl,
        hasToken: !!this.token,
        hasApiKey: !!this.apiKey,
      });
    }
  }

  /**
   * Set authentication token
   * 
   * @param token - JWT token
   * 
   * @example
   * ```typescript
   * const { token } = await sdk.auth.login({ ... });
   * sdk.setToken(token);
   * ```
   */
  setToken(token: string): void {
    this.token = token;
    if (this.config.debug) {
      console.log('[OpenStrandSDK] Token set');
    }
  }

  /**
   * Set API key (x-api-key). Takes precedence over bearer token.
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    if (this.config.debug) {
      console.log('[OpenStrandSDK] API key set');
    }
  }

  /**
   * Clear authentication token
   */
  clearToken(): void {
    this.token = undefined;
    if (this.config.debug) {
      console.log('[OpenStrandSDK] Token cleared');
    }
  }

  /**
   * Make HTTP request to backend
   * @private
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.config.apiUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.config.headers,
      ...((options.headers as Record<string, string>) || {}),
    };

    // Precedence: API key over bearer token
    if (this.apiKey) {
      headers['x-api-key'] = this.apiKey;
      delete headers['Authorization'];
    } else if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    // If body is FormData, let the browser/node set Content-Type (boundary)
    const isFormDataBody =
      typeof FormData !== 'undefined' && options.body instanceof FormData;
    if (isFormDataBody) {
      delete headers['Content-Type'];
    }

    const requestOptions: RequestInit = {
      ...options,
      headers,
    };

    if (this.config.debug) {
      console.log(`[OpenStrandSDK] ${options.method || 'GET'} ${url}`);
    }

    try {
      const response = await fetch(url, requestOptions);
      
      if (!response.ok) {
        await this.handleError(response);
      }

      const data: ApiResponse<T> = await response.json();

      if (!data.success) {
        throw new OpenStrandError(
          data.error || 'Request failed',
          (data as any).code,
          response.status
        );
      }

      return data.data;
    } catch (error) {
      if (error instanceof OpenStrandError) {
        throw error;
      }
      throw new NetworkError((error as Error).message);
    }
  }

  /**
   * Perform a raw HTTP request (no JSON envelope processing).
   * Useful for binary/file responses.
   * @private
   */
  private async requestRaw(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const url = `${this.config.apiUrl}${endpoint}`;

    const headers: Record<string, string> = {
      ...this.config.headers,
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.apiKey) {
      headers['x-api-key'] = this.apiKey;
      delete headers['Authorization'];
    } else if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    // Respect FormData bodies
    const isFormDataBody =
      typeof FormData !== 'undefined' && options.body instanceof FormData;
    if (!isFormDataBody && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    } else if (isFormDataBody) {
      delete headers['Content-Type'];
    }

    const requestOptions: RequestInit = {
      ...options,
      headers,
    };

    if (this.config.debug) {
      console.log(`[OpenStrandSDK] RAW ${options.method || 'GET'} ${url}`);
    }

    const response = await fetch(url, requestOptions);
    if (!response.ok) {
      await this.handleError(response);
    }
    return response;
  }

  /**
   * Meta API
   */
  meta = {
    /**
     * Get developer links and metadata
     */
    developer: (): Promise<{
      swaggerUrl: string;
      apiBaseUrl: string;
      sdkDocsUrl: string;
      frameSiteUrl: string;
      teamPortalUrl: string;
    }> => this.request('/api/v1/meta/developer'),

    /**
     * Get server configuration summary
     */
    config: (): Promise<Record<string, unknown>> => this.request('/api/v1/meta/config'),

    /**
     * Get version banner
     */
    version: (): Promise<{ version: string; api: string; backend: string; features: string[] }> =>
      this.request('/api/v1/meta/version'),

    /**
     * Get system diagnostics (cache/queue)
     */
    system: (): Promise<Record<string, unknown>> => this.request('/api/v1/meta/system'),
  };

  /**
   * Teams & Domains API
   */
  teams = {
    /**
     * Team API tokens (admin scope)
     */
    tokens: {
      list: (): Promise<{ tokens: Array<Record<string, unknown>>; teams: Array<Record<string, unknown>> }> =>
        this.request('/api/v1/team-tokens'),
      create: (payload: { teamId: string; name: string; description?: string; scopes?: string[]; expiresAt?: string }): Promise<{
        token: Record<string, unknown>;
        plaintext: string;
      }> =>
        this.request('/api/v1/team-tokens', {
          method: 'POST',
          body: JSON.stringify(payload),
        }),
      revoke: (tokenId: string): Promise<Record<string, unknown>> =>
        this.request(`/api/v1/team-tokens/${tokenId}`, { method: 'DELETE' }),
    },

    /**
     * Custom domains (Team+)
     */
    domains: {
      add: (payload: { teamId: string; domain: string; type?: 'subdomain' | 'custom' }): Promise<Record<string, unknown>> =>
        this.request('/api/v1/domains', {
          method: 'POST',
          body: JSON.stringify(payload),
        }),
      verify: (id: string): Promise<{ verified: boolean }> =>
        this.request(`/api/v1/domains/${id}/verify`, { method: 'POST' }),
      setupSSL: (id: string): Promise<{ configured: boolean }> =>
        this.request(`/api/v1/domains/${id}/ssl`, { method: 'POST' }),
      nginxConfig: async (id: string): Promise<string> => {
        const res = await this.requestRaw(`/api/v1/domains/${id}/nginx`, { method: 'GET' });
        return res.text();
      },
    },
  };

  /**
   * Weave Advanced API
   */
  weaveAdvanced = {
    /**
     * Get a filtered graph segment for a weave
     */
    graph: (
      weaveId: string,
      options?: { types?: string[]; cluster?: boolean; limit?: number; depth?: number; bounds?: { center: { x: number; y: number; z?: number }; radius: number } },
    ): Promise<Record<string, unknown>> => {
      const params = new URLSearchParams();
      if (options?.types?.length) params.set('types', options.types.join(','));
      if (options?.cluster) params.set('cluster', 'true');
      if (typeof options?.limit === 'number') params.set('limit', String(options.limit));
      if (typeof options?.depth === 'number') params.set('depth', String(options.depth));
      if (options?.bounds) {
        params.set('cx', String(options.bounds.center.x));
        params.set('cy', String(options.bounds.center.y));
        if (typeof options.bounds.center.z === 'number') params.set('cz', String(options.bounds.center.z));
        params.set('radius', String(options.bounds.radius));
      }
      return this.request(`/api/v1/weaves/${weaveId}/graph?${params.toString()}`);
    },

    /**
     * Find paths between two nodes
     */
    findPaths: (weaveId: string, from: string, to: string, maxDepth?: number): Promise<Record<string, unknown>> => {
      const params = new URLSearchParams({ from, to });
      if (typeof maxDepth === 'number') params.set('maxDepth', String(maxDepth));
      return this.request(`/api/v1/weaves/${weaveId}/paths?${params.toString()}`);
    },

    /**
     * Detect clusters in a weave
     */
    clusters: (weaveId: string): Promise<string[][]> => this.request(`/api/v1/weaves/${weaveId}/clusters`),

    /**
     * Apply layout algorithm
     */
    applyLayout: (
      weaveId: string,
      algorithm: 'force' | 'circular' | 'hierarchical',
      options?: Record<string, unknown>,
    ): Promise<Record<string, unknown>> =>
      this.request(`/api/v1/weaves/${weaveId}/layout`, {
        method: 'POST',
        body: JSON.stringify({ algorithm, options }),
      }),

    /**
     * Node operations
     */
    nodes: {
      create: (weaveId: string, payload: Record<string, unknown>): Promise<Record<string, unknown>> =>
        this.request(`/api/v1/weaves/${weaveId}/nodes`, { method: 'POST', body: JSON.stringify(payload) }),
      update: (weaveId: string, nodeId: string, payload: Record<string, unknown>): Promise<Record<string, unknown>> =>
        this.request(`/api/v1/weaves/${weaveId}/nodes/${nodeId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
      delete: (weaveId: string, nodeId: string): Promise<Record<string, unknown>> =>
        this.request(`/api/v1/weaves/${weaveId}/nodes/${nodeId}`, { method: 'DELETE' }),
    },

    /**
     * Edge operations
     */
    edges: {
      create: (weaveId: string, payload: Record<string, unknown>): Promise<Record<string, unknown>> =>
        this.request(`/api/v1/weaves/${weaveId}/edges`, { method: 'POST', body: JSON.stringify(payload) }),
      update: (weaveId: string, edgeId: string, payload: Record<string, unknown>): Promise<Record<string, unknown>> =>
        this.request(`/api/v1/weaves/${weaveId}/edges/${edgeId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
      delete: (weaveId: string, edgeId: string): Promise<Record<string, unknown>> =>
        this.request(`/api/v1/weaves/${weaveId}/edges/${edgeId}`, { method: 'DELETE' }),
    },
  };

  /**
   * Load and cache backend capabilities
   */
  async getCapabilities(): Promise<any> {
    if (this._capabilities) return this._capabilities;
    try {
      const caps = await this.request<any>('/api/v1/meta/capabilities');
      this._capabilities = caps;
      return caps;
    } catch (e) {
      if (this.config.debug) {
        console.warn('[OpenStrandSDK] Failed to load capabilities', (e as Error).message);
      }
      return null;
    }
  }

  /**
   * Handle HTTP errors
   * @private
   */
  private async handleError(response: Response): Promise<never> {
    const data = await response.json().catch(() => ({}));
    const message = data.error || response.statusText;

    switch (response.status) {
      case 401:
        throw new AuthenticationError(message);
      case 403:
        throw new AuthorizationError(message);
      case 404:
        throw new NotFoundError(data.resource || 'Resource');
      case 400:
        throw new ValidationError(message, data.errors);
      default:
        throw new OpenStrandError(message, data.code, response.status);
    }
  }

  /**
   * Authentication API
   */
  auth = {
    /**
     * Login with username/email and password
     * 
     * @param credentials - Login credentials
     * @returns User and token
     * 
     * @example
     * ```typescript
     * const { user, token } = await sdk.auth.login({
     *   username: 'demo_user',
     *   password: 'Demo123!'
     * });
     * sdk.setToken(token);
     * ```
     */
    login: (credentials: LoginRequest): Promise<AuthResponse> => {
      return this.request('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
    },

    /**
     * Register new user account
     * 
     * @param data - Registration data
     * @returns User and token
     */
    register: (data: RegisterRequest): Promise<AuthResponse> => {
      return this.request('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    /**
     * Request magic link (passwordless auth)
     * 
     * @param data - Email address
     * @returns Success response
     */
    requestMagicLink: (data: MagicLinkRequest): Promise<{ success: boolean }> => {
      return this.request('/api/v1/auth/magic-link/request', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    /**
     * Verify magic link token
     * 
     * @param data - Magic link token
     * @returns User and token
     */
    verifyMagicLink: (data: { token: string }): Promise<AuthResponse> => {
      return this.request('/api/v1/auth/magic-link/verify', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    /**
     * Get current user profile
     * 
     * @returns Current user
     */
    me: (): Promise<User> => {
      return this.request('/api/v1/auth/me');
    },

    /**
     * Logout current session
     */
    logout: (): Promise<void> => {
      return this.request('/api/v1/auth/logout', { method: 'POST' });
    },

    /**
     * Logout all sessions
     */
    logoutAll: (): Promise<void> => {
      return this.request('/api/v1/auth/logout-all', { method: 'POST' });
    },

    /**
     * Change password
     * 
     * @param data - Old and new passwords
     */
    changePassword: (data: { oldPassword: string; newPassword: string }): Promise<{ success: boolean }> => {
      return this.request('/api/v1/auth/change-password', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
  };

  /**
   * Strands API
   */
  strands = {
    /**
     * Create new strand
     * 
     * @param data - Strand data
     * @returns Created strand
     * 
     * @example
     * ```typescript
     * const strand = await sdk.strands.create({
     *   type: 'document',
     *   title: 'My Notes',
     *   content: { markdown: '# Hello' },
     *   tags: ['personal', 'notes']
     * });
     * ```
     */
    create: (data: CreateStrandRequest): Promise<Strand> => {
      return this.request('/api/v1/strands', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    /**
     * Get strand by ID
     * 
     * @param id - Strand ID
     * @returns Strand
     */
    get: (id: string): Promise<Strand> => {
      return this.request(`/api/v1/strands/${id}`);
    },

    /**
     * Update strand
     * 
     * @param id - Strand ID
     * @param data - Update data
     * @returns Updated strand
     */
    update: (id: string, data: UpdateStrandRequest): Promise<Strand> => {
      return this.request(`/api/v1/strands/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    /**
     * Delete strand
     * 
     * @param id - Strand ID
     */
    delete: (id: string): Promise<void> => {
      return this.request(`/api/v1/strands/${id}`, { method: 'DELETE' });
    },

    /**
     * List strands with pagination
     * 
     * @param options - Pagination and filter options
     * @returns Paginated strands
     */
    list: (
      options: PaginationOptions & {
        type?: string;
        noteType?: string;
        visibility?: Visibility;
        scopeId?: string;
        teamId?: string;
        search?: string;
        tags?: string;
      },
    ): Promise<PaginatedResponse<Strand>> => {
      const params = new URLSearchParams();
      if (options.page) params.set('page', options.page.toString());
      if (options.pageSize) params.set('pageSize', options.pageSize.toString());
      if (options.type) params.set('type', options.type);
      if (options.noteType) params.set('noteType', options.noteType);
      if (options.visibility) params.set('visibility', options.visibility);
      if (options.scopeId) params.set('scopeId', options.scopeId);
      if (options.teamId) params.set('teamId', options.teamId);
      if (options.search) params.set('search', options.search);
      if (options.tags) params.set('tags', options.tags);

      return this.request(`/api/v1/strands?${params.toString()}`);
    },

    /**
     * Create or update a conceptual relationship from the source strand.
     */
    createRelationship: (
      strandId: string,
      relationship: StrandRelationship,
    ): Promise<StrandRelationship> => {
      return this.request(`/api/v1/strands/${strandId}/relationships`, {
        method: 'POST',
        body: JSON.stringify(relationship),
      });
    },

    /**
     * Remove a relationship between two strands.
     */
    removeRelationship: (
      strandId: string,
      targetId: string,
      options?: { type?: string; scopeId?: string },
    ): Promise<void> => {
      return this.request(`/api/v1/strands/${strandId}/relationships`, {
        method: 'DELETE',
        body: JSON.stringify({ targetId, ...options }),
      });
    },

    /**
     * Submit a structure change request for approval.
     */
    requestStructureChange: (
      strandId: string,
      payload: StructureRequestPayload,
    ): Promise<StrandStructureRequest> => {
      return this.request(`/api/v1/strands/${strandId}/structure/requests`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    /**
     * List structure requests scoped to the strand.
     */
    listStructureRequests: (
      strandId: string,
      options?: { scopeId?: string; status?: StructureRequestStatus },
    ): Promise<StrandStructureRequest[]> => {
      const params = new URLSearchParams();
      if (options?.scopeId) params.set('scopeId', options.scopeId);
      if (options?.status) params.set('status', options.status);

      return this.request(
        `/api/v1/strands/${strandId}/structure/requests?${params.toString()}`,
      );
    },

    /**
     * Resolve a structure request.
     */
    resolveStructureRequest: (
      requestId: string,
      action: 'approve' | 'reject' | 'cancel',
      note?: string,
    ): Promise<StrandStructureRequest> => {
      return this.request(`/api/v1/strands/structure/requests/${requestId}/${action}`, {
        method: 'POST',
        body: JSON.stringify({ note }),
      });
    },
  };

  /**
   * Collections API
   */
  collections = {
    /**
     * Create collection
     */
    create: (data: CreateCollectionRequest): Promise<Collection> => {
      return this.request('/api/v1/collections', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    /**
     * Get collection
     */
    get: (id: string): Promise<Collection> => {
      return this.request(`/api/v1/collections/${id}`);
    },

    /**
     * List collections
     */
    list: (options?: PaginationOptions): Promise<PaginatedResponse<Collection>> => {
      const params = new URLSearchParams();
      if (options?.page) params.set('page', options.page.toString());
      if (options?.pageSize) params.set('pageSize', options.pageSize.toString());

      return this.request(`/api/v1/collections?${params.toString()}`);
    },

    /**
     * Delete collection
     */
    delete: (id: string): Promise<void> => {
      return this.request(`/api/v1/collections/${id}`, { method: 'DELETE' });
    },
  };

  /**
   * Weave (Knowledge Graph) API
   */
  weave = {
    /**
     * Get weave graph
     */
    get: (id: string): Promise<Weave> => {
      return this.request(`/api/v1/weave/${id}`);
    },

    /**
     * Create relationship between strands
     */
    createEdge: (data: {
      source: string;
      target: string;
      type: string;
      weight?: number;
      metadata?: Record<string, any>;
      note?: string;
    }): Promise<WeaveEdge> => {
      return this.request('/api/v1/weave/edges', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
  };

  /**
   * Visualizations API
   */
  visualizations = {
    /**
     * Create visualization
     */
    create: (data: CreateVisualizationRequest): Promise<Visualization> => {
      return this.request('/api/v1/visualizations', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    /**
     * Get visualization
     */
    get: (id: string): Promise<Visualization> => {
      return this.request(`/api/v1/visualizations/${id}`);
    },

    /**
     * List visualizations
     */
    list: (options?: PaginationOptions & { tier?: number }): Promise<PaginatedResponse<Visualization>> => {
      const params = new URLSearchParams();
      if (options?.page) params.set('page', options.page.toString());
      if (options?.pageSize) params.set('pageSize', options.pageSize.toString());
      if (options?.tier) params.set('tier', options.tier.toString());

      return this.request(`/api/v1/visualizations?${params.toString()}`);
    },

    /**
     * Update visualization
     * @param id - Visualization ID
     * @param data - Partial visualization update
     */
    update: (id: string, data: Partial<CreateVisualizationRequest>): Promise<Visualization> => {
      return this.request(`/api/v1/visualizations/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    /**
     * Delete visualization
     * @param id - Visualization ID
     */
    delete: (id: string): Promise<void> => {
      return this.request(`/api/v1/visualizations/${id}`, { method: 'DELETE' });
    },

    /**
     * Export visualization as PNG, SVG, or JSON.
     * Returns a Blob for 'png' and 'svg', and a JSON Blob for 'json'.
     */
    export: async (id: string, format: VisualizationExportFormat = 'json'): Promise<Blob> => {
      const response = await this.requestRaw(`/api/v1/visualizations/${id}/export`, {
        method: 'POST',
        body: JSON.stringify({ format }),
        headers: { 'Content-Type': 'application/json' },
      });
      return await response.blob();
    },

    /**
     * Get information about available visualization tiers.
     */
    tierInfo: (): Promise<VisualizationTierInfo> => {
      return this.request('/api/v1/visualizations/tier-info');
    },
  };

  /**
   * Featured content and leaderboards API
   */
  featured = {
    /**
     * Get a curated set of featured content for the landing experience.
     */
    list: (): Promise<Record<string, unknown>> => {
      return this.request('/api/v1/featured');
    },

    /**
     * Get leaderboard for content.
     * @param options - Filter options
     * @example
     * ```ts
     * await sdk.featured.leaderboard({ type: 'visualization', period: 'week', limit: 10 });
     * ```
     */
    leaderboard: (options?: { type?: string; period?: 'day' | 'week' | 'month' | 'all'; limit?: number }): Promise<LeaderboardEntry[]> => {
      const params = new URLSearchParams();
      if (options?.type) params.set('type', options.type);
      if (options?.period) params.set('period', options.period);
      if (options?.limit) params.set('limit', String(options.limit));
      return this.request(`/api/v1/leaderboard?${params.toString()}`);
    },
  };

  /**
   * Data / Dataset API
   */
  data = {
    /**
     * Upload dataset file.
     * Returns datasetId and basic metadata.
     */
    upload: async (file: File | Blob, metadata?: Record<string, unknown>): Promise<{ datasetId: string; metadata: Record<string, unknown> }> => {
      const form = new FormData();
      form.append('file', file);
      if (metadata) {
        form.append('metadata', JSON.stringify(metadata));
      }
      return this.request('/api/v1/data/upload', {
        method: 'POST',
        body: form,
      });
    },

    /**
     * Get dataset summary.
     */
    summary: (datasetId: string): Promise<DatasetSummary> => {
      return this.request(`/api/v1/data/${datasetId}/summary`);
    },

    /**
     * Get dataset preview rows.
     */
    preview: (datasetId: string, rows: number = 10): Promise<DatasetPreview> => {
      const params = new URLSearchParams();
      if (rows) params.set('rows', String(rows));
      return this.request(`/api/v1/data/${datasetId}/preview?${params.toString()}`);
    },

    /**
     * Analyze dataset schema.
     */
    schema: (datasetId: string): Promise<DatasetSchema> => {
      return this.request(`/api/v1/data/${datasetId}/schema`);
    },

    /**
     * Generate a visualization for a dataset by prompt.
     */
    visualize: (datasetId: string, prompt: string, options?: Record<string, unknown>): Promise<Visualization> => {
      return this.request(`/api/v1/data/${datasetId}/visualize`, {
        method: 'POST',
        body: JSON.stringify({ prompt, options }),
      });
    },

    /**
     * Check for duplicate content by uploading a small file sample.
     */
    checkDuplicate: async (file: File | Blob): Promise<{ isDuplicate: boolean; hash?: string; similarity?: number }> => {
      const form = new FormData();
      form.append('file', file);
      return this.request('/api/v1/data/check-duplicate', {
        method: 'POST',
        body: form,
      });
    },
  };

  /**
   * Feedback API (votes, favorites, summaries).
   */
  feedback = {
    /**
     * Upvote strand (visualization, dataset, document, etc.).
     */
    upvote: (strandId: string): Promise<{ message: string }> => {
      return this.request(`/api/v1/strands/${strandId}/vote`, {
        method: 'POST',
        body: JSON.stringify({ vote: 1 }),
      });
    },

    /**
     * Downvote strand.
     */
    downvote: (strandId: string): Promise<{ message: string }> => {
      return this.request(`/api/v1/strands/${strandId}/vote`, {
        method: 'POST',
        body: JSON.stringify({ vote: -1 }),
      });
    },

    /**
     * Toggle favorite for current user.
     */
    toggleFavorite: (strandId: string): Promise<{ favorited: boolean }> => {
      return this.request(`/api/v1/strands/${strandId}/favorite`, {
        method: 'POST',
      });
    },

    /**
     * Get feedback summary for a strand.
     */
    summary: (strandId: string): Promise<{
      targetId: string;
      datasetId?: string;
      likes: number;
      dislikes: number;
      favorites: number;
      score: number;
      userVote: number | null;
      userFavorite: boolean;
    }> => {
      return this.request(`/api/v1/strands/${strandId}/feedback`);
    },
  };

  /**
   * Import API
   */
  import = {
    /**
     * Import file
     * 
     * @param file - File to import
     * @param options - Import options
     */
    file: async (file: File | Blob, options?: {
      skipDuplicates?: boolean;
      useAI?: boolean;
    }): Promise<ImportResult> => {
      const formData = new FormData();
      formData.append('file', file);

      const params = new URLSearchParams();
      if (options?.skipDuplicates) params.set('skipDuplicates', 'true');
      if (options?.useAI) params.set('useAI', 'true');

      return this.request(`/api/v1/import?${params.toString()}`, {
        method: 'POST',
        body: formData,
        headers: {}, // Let browser set Content-Type for FormData
      });
    },

    /**
     * Import from URL
     */
    url: (url: string, options?: { skipDuplicates?: boolean }): Promise<ImportResult> => {
      return this.request('/api/v1/import/url', {
        method: 'POST',
        body: JSON.stringify({ url, ...options }),
      });
    },
  };

  /**
   * Export API
   */
  export = {
    /**
     * Export strand
     */
    strand: (id: string, options: ExportOptions): Promise<Blob> => {
      return this.request(`/api/v1/export/strand/${id}`, {
        method: 'POST',
        body: JSON.stringify(options),
      }).then(data => new Blob([JSON.stringify(data)]));
    },

    /**
     * Export collection
     */
    collection: (id: string, options: ExportOptions): Promise<Blob> => {
      return this.request(`/api/v1/export/collection/${id}`, {
        method: 'POST',
        body: JSON.stringify(options),
      }).then(data => new Blob([JSON.stringify(data)]));
    },
  };

  /**
   * Search API
   */
  search = {
    /**
     * Search content
     */
    query: (q: string, options?: PaginationOptions & { type?: string }): Promise<SearchResponse> => {
      const params = new URLSearchParams({ q });
      if (options?.page) params.set('page', options.page.toString());
      if (options?.pageSize) params.set('pageSize', options.pageSize.toString());
      if (options?.type) params.set('type', options.type);

      return this.request(`/api/v1/search?${params.toString()}`);
    },

    /**
     * Semantic search using AI embeddings
     */
    semantic: (query: string, options?: { limit?: number }): Promise<SearchResponse> => {
      return this.request('/api/v1/search/semantic', {
        method: 'POST',
        body: JSON.stringify({ query, ...options }),
      });
    },
  };
}
