/**
 * Plugins Module
 * 
 * Client wrapper for /api/plugins endpoints
 * 
 * @module modules/plugins
 * 
 * @example
 * ```typescript
 * // List installed plugins
 * const plugins = await sdk.plugins.list();
 * 
 * // Install plugin (admin only)
 * await sdk.plugins.install({
 *   name: 'csv-export',
 *   version: '1.0.0',
 *   source: 'npm',
 *   path: 'npm:@company/csv-export',
 * });
 * 
 * // Toggle plugin
 * await sdk.plugins.update('csv-export', { enabled: false });
 * ```
 */

import type { OpenStrandSDK } from '../client';

/**
 * Installed plugin information
 */
export interface InstalledPlugin {
  /** Plugin ID */
  id: string;
  /** Plugin name (unique) */
  name: string;
  /** Version */
  version: string;
  /** Display name */
  displayName?: string;
  /** Description */
  description?: string;
  /** Author */
  author?: string;
  /** Installation source (npm, git, local) */
  source?: string;
  /** Enabled status */
  enabled: boolean;
  /** Is plugin signed/verified */
  isSigned: boolean;
  /** Signer information */
  signedBy?: string;
  /** Load order (for conflict resolution) */
  loadOrder: number;
  /** Granted permissions */
  permissions: string[];
  /** Install timestamp */
  installed: string;
  /** Last update timestamp */
  updated: string;
}

/**
 * Plugin conflict information
 */
export interface PluginConflict {
  /** Conflicting selector (command ID, route, etc.) */
  selector: string;
  /** Conflict type */
  type: 'command' | 'route' | 'ui' | 'hook';
  /** Plugins involved */
  plugins: string[];
}

/**
 * Plugin installation options
 */
export interface InstallPluginOptions {
  /** Plugin name (unique) */
  name: string;
  /** Version */
  version: string;
  /** Source type */
  source: 'npm' | 'git' | 'local';
  /** Path or URL */
  path: string;
  /** Display name */
  displayName?: string;
  /** Description */
  description?: string;
  /** Author */
  author?: string;
  /** Permissions */
  permissions?: string[];
}

/**
 * Plugin update options
 */
export interface UpdatePluginOptions {
  /** Enable/disable plugin */
  enabled?: boolean;
  /** Load order */
  loadOrder?: number;
  /** Plugin settings */
  settings?: Record<string, unknown>;
}

/**
 * Plugins Module
 * 
 * Manages plugin installation, configuration, and conflict resolution.
 */
export class PluginsModule {
  /**
   * Creates a PluginsModule instance
   * 
   * @param sdk - OpenStrand SDK instance
   */
  constructor(private sdk: OpenStrandSDK) {}

  /**
   * List installed plugins
   * 
   * @param options - Filter options
   * @returns Array of installed plugins
   * 
   * @example
   * ```typescript
   * // List all plugins
   * const all = await sdk.plugins.list();
   * 
   * // List only enabled plugins
   * const enabled = await sdk.plugins.list({ enabled: true });
   * ```
   */
  async list(options?: { enabled?: boolean }): Promise<InstalledPlugin[]> {
    const query: Record<string, string> = {};
    if (options?.enabled !== undefined) {
      query.enabled = String(options.enabled);
    }

    return this.sdk.request('GET', '/api/plugins', { query });
  }

  /**
   * Install a plugin (admin only)
   * 
   * @param options - Installation options
   * @returns Installation result
   * 
   * @example
   * ```typescript
   * await sdk.plugins.install({
   *   name: 'csv-export',
   *   version: '1.0.0',
   *   source: 'npm',
   *   path: 'npm:@company/csv-export',
   *   permissions: ['filesystem'],
   * });
   * ```
   */
  async install(options: InstallPluginOptions): Promise<{ id: string; name: string; message: string }> {
    return this.sdk.request('POST', '/api/plugins', {
      body: options,
    });
  }

  /**
   * Update plugin configuration
   * 
   * @param name - Plugin name
   * @param options - Update options
   * @returns Success message
   * 
   * @example
   * ```typescript
   * // Disable plugin
   * await sdk.plugins.update('csv-export', { enabled: false });
   * 
   * // Change load order
   * await sdk.plugins.update('csv-export', { loadOrder: 10 });
   * ```
   */
  async update(name: string, options: UpdatePluginOptions): Promise<{ message: string }> {
    return this.sdk.request('PUT', `/api/plugins/${name}`, {
      body: options,
    });
  }

  /**
   * Uninstall a plugin (admin only)
   * 
   * @param name - Plugin name
   * @returns Success message
   * 
   * @example
   * ```typescript
   * await sdk.plugins.uninstall('csv-export');
   * ```
   */
  async uninstall(name: string): Promise<{ message: string }> {
    return this.sdk.request('DELETE', `/api/plugins/${name}`);
  }

  /**
   * Get plugin conflicts
   * 
   * @returns Array of conflicts
   * 
   * @example
   * ```typescript
   * const conflicts = await sdk.plugins.getConflicts();
   * if (conflicts.length > 0) {
   *   console.log('Conflicts detected:', conflicts);
   * }
   * ```
   */
  async getConflicts(): Promise<{ conflicts: PluginConflict[] }> {
    return this.sdk.request('GET', '/api/plugins/conflicts');
  }
}

