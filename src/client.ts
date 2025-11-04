
/**
 * @fileoverview OpenStrand SDK Main Client
 * @module @openstrand/sdk/client
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

  /**
   * Create new SDK instance
   * 
   * @param config - SDK configuration
   */
  constructor(config: SDKConfig) {
    this.config = {
      apiUrl: config.apiUrl,
      token: config.token ?? '',
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

    if (this.config.debug) {
      console.log('[OpenStrandSDK] Initialized with config:', {
        apiUrl: this.config.apiUrl,
        hasToken: !!this.token,
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

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
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
