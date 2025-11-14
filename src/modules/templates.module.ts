/**
 * Templates Module
 * 
 * Client wrapper for /api/templates endpoints
 * 
 * @module modules/templates
 */

import type { OpenStrandSDK } from '../client';

export interface Template {
  id: string;
  name: string;
  slug: string;
  description?: string;
  category: string;
  tags: string[];
  icon?: string;
  previewUrl?: string;
  usageCount: number;
  created: string;
  isPublic: boolean;
}

export interface TemplateDetail extends Template {
  strandTree: unknown;
  variables: unknown;
  assets: unknown;
  versions?: Array<{
    id: string;
    version: string;
    changelog?: string;
    created: string;
  }>;
}

export interface ListTemplatesOptions {
  category?: string;
  tags?: string[];
  search?: string;
  authorId?: string;
  pluginName?: string;
  isPublic?: boolean;
}

export interface ApplyTemplateOptions {
  variables?: Record<string, unknown>;
}

/**
 * Templates Module
 * 
 * @example
 * ```typescript
 * const templates = await sdk.templates.list({ category: 'STORYTELLING' });
 * const template = await sdk.templates.get('template-id');
 * const result = await sdk.templates.apply('template-id', { variables: { name: 'My Project' } });
 * ```
 */
export class TemplatesModule {
  constructor(private sdk: OpenStrandSDK) {}

  /**
   * List templates
   * 
   * @param options - Filter options
   * @returns Templates
   */
  async list(options?: ListTemplatesOptions): Promise<Template[]> {
    const query: Record<string, string> = {};

    if (options?.category) query.category = options.category;
    if (options?.tags) query.tags = options.tags.join(',');
    if (options?.search) query.search = options.search;
    if (options?.authorId) query.authorId = options.authorId;
    if (options?.pluginName) query.pluginName = options.pluginName;
    if (options?.isPublic !== undefined) query.isPublic = String(options.isPublic);

    return this.sdk.request('GET', '/api/templates', { query });
  }

  /**
   * Get template by ID
   * 
   * @param id - Template ID
   * @returns Template
   */
  async get(id: string): Promise<TemplateDetail> {
    return this.sdk.request('GET', `/api/templates/${id}`);
  }

  /**
   * Apply template
   * 
   * @param id - Template ID
   * @param options - Apply options
   * @returns Result with root strand ID
   */
  async apply(id: string, options?: ApplyTemplateOptions): Promise<{ rootStrandId: string; message: string }> {
    return this.sdk.request('POST', `/api/templates/${id}/apply`, {
      body: options,
    });
  }
}

