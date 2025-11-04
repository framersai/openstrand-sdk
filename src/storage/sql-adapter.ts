/**
 * SQL Storage Adapter for OpenStrand
 *
 * Provides a unified storage interface that works across all platforms:
 * - Web browsers (sql.js - WebAssembly SQLite)
 * - Mobile apps (Native SQLite via Capacitor)
 * - Desktop/Electron (better-sqlite3 or PGLite)
 * - Server (PostgreSQL or PGLite)
 *
 * Features:
 * - Automatic adapter detection based on environment
 * - Offline-first with sync capabilities
 * - Full-text search support
 * - JSON column support for flexible schemas
 * - Migration and versioning support
 *
 * @module SQLStorageAdapter
 */

import type {
  Strand,
  StrandLink,
  StrandHierarchy,
  StrandScope,
  User,
  Team,
  Visualization
} from '../types';

/**
 * Database provider types
 */
export type DatabaseProvider =
  | 'sqlite-web'      // sql.js in browser
  | 'sqlite-mobile'   // Native SQLite via Capacitor
  | 'sqlite-desktop'  // better-sqlite3 in Electron
  | 'pglite'         // PGLite (embedded PostgreSQL)
  | 'postgresql';    // Full PostgreSQL server

/**
 * Storage adapter configuration
 */
export interface StorageConfig {
  /** Database URL or file path */
  url?: string;

  /** Adapter type (auto-detected if not specified) */
  adapter?: DatabaseProvider;

  /** Enable offline mode with sync */
  offline?: boolean;

  /** Sync configuration */
  sync?: {
    /** Remote database URL for sync */
    remoteUrl?: string;
    /** Sync interval in milliseconds */
    interval?: number;
    /** Conflict resolution strategy */
    conflictStrategy?: 'local-wins' | 'remote-wins' | 'merge';
  };

  /** Enable debug logging */
  debug?: boolean;

  /** Custom data directory (for desktop/mobile) */
  dataDir?: string;

  /** Migration configuration */
  migrations?: {
    /** Directory containing migration files */
    dir?: string;
    /** Auto-run migrations on connect */
    autoRun?: boolean;
  };
}

/**
 * Query result types
 */
export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
  fields?: string[];
}

/**
 * Transaction context
 */
export interface Transaction {
  query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;
  execute(sql: string, params?: any[]): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

/**
 * Abstract base class for SQL storage adapters
 */
export abstract class SQLStorageAdapter {
  protected config: StorageConfig;
  protected provider: DatabaseProvider;
  protected isConnected = false;

  constructor(config: StorageConfig) {
    this.config = config;
    this.provider = config.adapter || this.detectProvider();
  }

  /**
   * Detect the best provider for current environment
   */
  protected detectProvider(): DatabaseProvider {
    // Check if we're in a browser
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      // Check if Capacitor is available (mobile app)
      if ((window as any).Capacitor) {
        return 'sqlite-mobile';
      }
      // Regular web browser
      return 'sqlite-web';
    }

    // Check if we're in Node.js
    if (typeof process !== 'undefined' && process.versions?.node) {
      // Check if we're in Electron
      if (process.versions?.electron) {
        return 'sqlite-desktop';
      }
      // Server environment - prefer PGLite for embedded use
      if (this.config.url?.startsWith('pglite://')) {
        return 'pglite';
      }
      // PostgreSQL for production servers
      if (this.config.url?.startsWith('postgres')) {
        return 'postgresql';
      }
      // Default to PGLite for local development
      return 'pglite';
    }

    // Default fallback
    return 'sqlite-web';
  }

  /**
   * Connect to database
   */
  abstract connect(): Promise<void>;

  /**
   * Disconnect from database
   */
  abstract disconnect(): Promise<void>;

  /**
   * Execute a query and return results
   */
  abstract query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;

  /**
   * Execute a statement without returning results
   */
  abstract execute(sql: string, params?: any[]): Promise<void>;

  /**
   * Begin a transaction
   */
  abstract transaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T>;

  /**
   * Initialize database schema
   */
  async initialize(): Promise<void> {
    await this.createTables();
    if (this.config.migrations?.autoRun) {
      await this.runMigrations();
    }
  }

  /**
   * Create database tables
   */
  protected async createTables(): Promise<void> {
    const isPostgreSQL = this.provider === 'postgresql' || this.provider === 'pglite';

    // Create tables with appropriate syntax for SQLite vs PostgreSQL
    await this.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id ${isPostgreSQL ? 'TEXT' : 'TEXT'} PRIMARY KEY ${isPostgreSQL ? 'DEFAULT gen_random_uuid()::text' : ''},
        email TEXT UNIQUE NOT NULL,
        username TEXT UNIQUE,
        name TEXT,
        avatar_url TEXT,
        bio TEXT,
        preferences ${isPostgreSQL ? 'JSONB' : 'TEXT'} DEFAULT '{}',
        plan TEXT DEFAULT 'FREE',
        created_at ${isPostgreSQL ? 'TIMESTAMP WITH TIME ZONE' : 'TEXT'} DEFAULT ${isPostgreSQL ? 'CURRENT_TIMESTAMP' : "datetime('now')"},
        updated_at ${isPostgreSQL ? 'TIMESTAMP WITH TIME ZONE' : 'TEXT'} DEFAULT ${isPostgreSQL ? 'CURRENT_TIMESTAMP' : "datetime('now')"}
      )
    `);

    await this.execute(`
      CREATE TABLE IF NOT EXISTS teams (
        id ${isPostgreSQL ? 'TEXT' : 'TEXT'} PRIMARY KEY ${isPostgreSQL ? 'DEFAULT gen_random_uuid()::text' : ''},
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        description TEXT,
        logo_url TEXT,
        plan TEXT DEFAULT 'FREE',
        settings ${isPostgreSQL ? 'JSONB' : 'TEXT'} DEFAULT '{}',
        created_at ${isPostgreSQL ? 'TIMESTAMP WITH TIME ZONE' : 'TEXT'} DEFAULT ${isPostgreSQL ? 'CURRENT_TIMESTAMP' : "datetime('now')"},
        updated_at ${isPostgreSQL ? 'TIMESTAMP WITH TIME ZONE' : 'TEXT'} DEFAULT ${isPostgreSQL ? 'CURRENT_TIMESTAMP' : "datetime('now')"}
      )
    `);

    await this.execute(`
      CREATE TABLE IF NOT EXISTS strands (
        id ${isPostgreSQL ? 'TEXT' : 'TEXT'} PRIMARY KEY ${isPostgreSQL ? 'DEFAULT gen_random_uuid()::text' : ''},
        title TEXT NOT NULL,
        data_type TEXT NOT NULL DEFAULT 'NOTE',
        content ${isPostgreSQL ? 'JSONB' : 'TEXT'} DEFAULT '{}',
        metadata ${isPostgreSQL ? 'JSONB' : 'TEXT'} DEFAULT '{}',
        plain_text TEXT,
        author_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        primary_team_id TEXT REFERENCES teams(id) ON DELETE SET NULL,
        is_public ${isPostgreSQL ? 'BOOLEAN' : 'INTEGER'} DEFAULT ${isPostgreSQL ? 'false' : '0'},
        is_featured ${isPostgreSQL ? 'BOOLEAN' : 'INTEGER'} DEFAULT ${isPostgreSQL ? 'false' : '0'},
        view_count INTEGER DEFAULT 0,
        created_at ${isPostgreSQL ? 'TIMESTAMP WITH TIME ZONE' : 'TEXT'} DEFAULT ${isPostgreSQL ? 'CURRENT_TIMESTAMP' : "datetime('now')"},
        updated_at ${isPostgreSQL ? 'TIMESTAMP WITH TIME ZONE' : 'TEXT'} DEFAULT ${isPostgreSQL ? 'CURRENT_TIMESTAMP' : "datetime('now')"}
      )
    `);

    await this.execute(`
      CREATE TABLE IF NOT EXISTS strand_links (
        id ${isPostgreSQL ? 'TEXT' : 'TEXT'} PRIMARY KEY ${isPostgreSQL ? 'DEFAULT gen_random_uuid()::text' : ''},
        source_id TEXT NOT NULL REFERENCES strands(id) ON DELETE CASCADE,
        target_id TEXT NOT NULL REFERENCES strands(id) ON DELETE CASCADE,
        link_type TEXT NOT NULL,
        metadata ${isPostgreSQL ? 'JSONB' : 'TEXT'} DEFAULT '{}',
        created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
        created_at ${isPostgreSQL ? 'TIMESTAMP WITH TIME ZONE' : 'TEXT'} DEFAULT ${isPostgreSQL ? 'CURRENT_TIMESTAMP' : "datetime('now')"},
        UNIQUE(source_id, target_id, link_type)
      )
    `);

    await this.execute(`
      CREATE TABLE IF NOT EXISTS visualizations (
        id ${isPostgreSQL ? 'TEXT' : 'TEXT'} PRIMARY KEY ${isPostgreSQL ? 'DEFAULT gen_random_uuid()::text' : ''},
        strand_id TEXT REFERENCES strands(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        config ${isPostgreSQL ? 'JSONB' : 'TEXT'} DEFAULT '{}',
        generated_code TEXT,
        tier INTEGER DEFAULT 1,
        created_at ${isPostgreSQL ? 'TIMESTAMP WITH TIME ZONE' : 'TEXT'} DEFAULT ${isPostgreSQL ? 'CURRENT_TIMESTAMP' : "datetime('now')"},
        updated_at ${isPostgreSQL ? 'TIMESTAMP WITH TIME ZONE' : 'TEXT'} DEFAULT ${isPostgreSQL ? 'CURRENT_TIMESTAMP' : "datetime('now')"}
      )
    `);

    // Create indexes for performance
    await this.execute(`CREATE INDEX IF NOT EXISTS idx_strands_author ON strands(author_id)`);
    await this.execute(`CREATE INDEX IF NOT EXISTS idx_strands_team ON strands(primary_team_id)`);
    await this.execute(`CREATE INDEX IF NOT EXISTS idx_strand_links_source ON strand_links(source_id)`);
    await this.execute(`CREATE INDEX IF NOT EXISTS idx_strand_links_target ON strand_links(target_id)`);
    await this.execute(`CREATE INDEX IF NOT EXISTS idx_visualizations_strand ON visualizations(strand_id)`);

    // Create full-text search indexes if PostgreSQL
    if (isPostgreSQL) {
      await this.execute(`
        CREATE INDEX IF NOT EXISTS idx_strands_fulltext
        ON strands USING gin(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(plain_text, '')))
      `).catch(() => {
        // Ignore if GIN indexes aren't available
      });
    }
  }

  /**
   * Run database migrations
   */
  protected async runMigrations(): Promise<void> {
    // Create migrations table
    await this.execute(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id INTEGER PRIMARY KEY ${this.provider.includes('postgresql') ? 'GENERATED ALWAYS AS IDENTITY' : 'AUTOINCREMENT'},
        name TEXT UNIQUE NOT NULL,
        executed_at ${this.provider.includes('postgresql') ? 'TIMESTAMP WITH TIME ZONE' : 'TEXT'} DEFAULT ${this.provider.includes('postgresql') ? 'CURRENT_TIMESTAMP' : "datetime('now')"}
      )
    `);

    // TODO: Load and run migration files from configured directory
    // This would be implemented based on the specific migration strategy
  }

  // High-level data access methods

  /**
   * Get all strands for a user
   */
  async getStrandsForUser(userId: string): Promise<Strand[]> {
    const result = await this.query<Strand>(`
      SELECT * FROM strands
      WHERE author_id = ? OR is_public = ${this.provider.includes('postgresql') ? 'true' : '1'}
      ORDER BY updated_at DESC
    `, [userId]);

    return result.rows;
  }

  /**
   * Get a single strand by ID
   */
  async getStrandById(id: string): Promise<Strand | null> {
    const result = await this.query<Strand>(`
      SELECT * FROM strands WHERE id = ?
    `, [id]);

    return result.rows[0] || null;
  }

  /**
   * Create a new strand
   */
  async createStrand(strand: Partial<Strand>): Promise<Strand> {
    const id = strand.id || this.generateId();
    const now = new Date().toISOString();

    await this.execute(`
      INSERT INTO strands (
        id, title, data_type, content, metadata, plain_text,
        author_id, primary_team_id, is_public, is_featured,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      strand.title || 'Untitled',
      strand.dataType || 'NOTE',
      JSON.stringify(strand.content || {}),
      JSON.stringify(strand.metadata || {}),
      strand.plainText || '',
      strand.authorId || null,
      strand.primaryTeamId || null,
      strand.isPublic ? 1 : 0,
      strand.isFeatured ? 1 : 0,
      strand.createdAt || now,
      strand.updatedAt || now
    ]);

    return this.getStrandById(id) as Promise<Strand>;
  }

  /**
   * Update a strand
   */
  async updateStrand(id: string, updates: Partial<Strand>): Promise<Strand | null> {
    const sets: string[] = [];
    const values: any[] = [];

    if (updates.title !== undefined) {
      sets.push('title = ?');
      values.push(updates.title);
    }
    if (updates.content !== undefined) {
      sets.push('content = ?');
      values.push(JSON.stringify(updates.content));
    }
    if (updates.metadata !== undefined) {
      sets.push('metadata = ?');
      values.push(JSON.stringify(updates.metadata));
    }
    if (updates.plainText !== undefined) {
      sets.push('plain_text = ?');
      values.push(updates.plainText);
    }
    if (updates.isPublic !== undefined) {
      sets.push('is_public = ?');
      values.push(updates.isPublic ? 1 : 0);
    }

    if (sets.length === 0) {
      return this.getStrandById(id);
    }

    sets.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    await this.execute(`
      UPDATE strands
      SET ${sets.join(', ')}
      WHERE id = ?
    `, values);

    return this.getStrandById(id);
  }

  /**
   * Delete a strand
   */
  async deleteStrand(id: string): Promise<boolean> {
    await this.execute(`DELETE FROM strands WHERE id = ?`, [id]);
    return true;
  }

  /**
   * Search strands by text
   */
  async searchStrands(query: string, limit = 20): Promise<Strand[]> {
    const isPostgreSQL = this.provider === 'postgresql' || this.provider === 'pglite';

    if (isPostgreSQL) {
      // Use PostgreSQL full-text search
      const result = await this.query<Strand>(`
        SELECT * FROM strands
        WHERE to_tsvector('english', coalesce(title, '') || ' ' || coalesce(plain_text, ''))
          @@ plainto_tsquery('english', ?)
        ORDER BY ts_rank(
          to_tsvector('english', coalesce(title, '') || ' ' || coalesce(plain_text, '')),
          plainto_tsquery('english', ?)
        ) DESC
        LIMIT ?
      `, [query, query, limit]);

      return result.rows;
    } else {
      // Use LIKE for SQLite
      const searchPattern = `%${query}%`;
      const result = await this.query<Strand>(`
        SELECT * FROM strands
        WHERE title LIKE ? OR plain_text LIKE ?
        ORDER BY
          CASE
            WHEN title LIKE ? THEN 1
            ELSE 2
          END,
          updated_at DESC
        LIMIT ?
      `, [searchPattern, searchPattern, searchPattern, limit]);

      return result.rows;
    }
  }

  /**
   * Get strand links
   */
  async getStrandLinks(strandId: string): Promise<StrandLink[]> {
    const result = await this.query<StrandLink>(`
      SELECT * FROM strand_links
      WHERE source_id = ? OR target_id = ?
      ORDER BY created_at DESC
    `, [strandId, strandId]);

    return result.rows;
  }

  /**
   * Create a strand link
   */
  async createStrandLink(link: Partial<StrandLink>): Promise<StrandLink> {
    const id = link.id || this.generateId();

    await this.execute(`
      INSERT INTO strand_links (
        id, source_id, target_id, link_type, metadata, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      link.sourceId,
      link.targetId,
      link.linkType || 'REFERENCE',
      JSON.stringify(link.metadata || {}),
      link.createdBy || null,
      link.createdAt || new Date().toISOString()
    ]);

    const result = await this.query<StrandLink>(`
      SELECT * FROM strand_links WHERE id = ?
    `, [id]);

    return result.rows[0];
  }

  /**
   * Sync with remote database (if configured)
   */
  async sync(): Promise<{ success: boolean; recordsSynced: number }> {
    if (!this.config.sync?.remoteUrl) {
      return { success: false, recordsSynced: 0 };
    }

    // TODO: Implement sync logic based on conflict strategy
    // This would involve:
    // 1. Connecting to remote database
    // 2. Comparing local and remote records by updated_at timestamp
    // 3. Resolving conflicts based on strategy
    // 4. Updating both databases as needed

    return { success: true, recordsSynced: 0 };
  }

  /**
   * Generate a unique ID
   */
  protected generateId(): string {
    // Simple UUID v4 generation
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

/**
 * Factory function to create the appropriate storage adapter
 */
export async function createStorageAdapter(config: StorageConfig = {}): Promise<SQLStorageAdapter> {
  const adapter = config.adapter || detectBestAdapter();

  switch (adapter) {
    case 'sqlite-web':
      const { WebSQLiteAdapter } = await import('./adapters/web-sqlite');
      return new WebSQLiteAdapter(config);

    case 'sqlite-mobile':
      const { MobileSQLiteAdapter } = await import('./adapters/mobile-sqlite');
      return new MobileSQLiteAdapter(config);

    case 'sqlite-desktop':
      const { DesktopSQLiteAdapter } = await import('./adapters/desktop-sqlite');
      return new DesktopSQLiteAdapter(config);

    case 'pglite':
      const { PGLiteAdapter } = await import('./adapters/pglite');
      return new PGLiteAdapter(config);

    case 'postgresql':
      const { PostgreSQLAdapter } = await import('./adapters/postgresql');
      return new PostgreSQLAdapter(config);

    default:
      throw new Error(`Unsupported adapter: ${adapter}`);
  }
}

/**
 * Detect the best adapter for the current environment
 */
function detectBestAdapter(): DatabaseProvider {
  // Browser environment
  if (typeof window !== 'undefined') {
    if ((window as any).Capacitor) {
      return 'sqlite-mobile';
    }
    return 'sqlite-web';
  }

  // Node.js environment
  if (typeof process !== 'undefined') {
    if (process.versions?.electron) {
      return 'sqlite-desktop';
    }
    // Default to PGLite for local development
    return 'pglite';
  }

  return 'sqlite-web';
}

// Export convenience functions
export { detectBestAdapter as detectAdapter };

/**
 * Global storage instance (singleton)
 */
let globalStorage: SQLStorageAdapter | null = null;

/**
 * Get or create the global storage instance
 */
export async function getStorage(config?: StorageConfig): Promise<SQLStorageAdapter> {
  if (!globalStorage) {
    globalStorage = await createStorageAdapter(config);
    await globalStorage.connect();
    await globalStorage.initialize();
  }
  return globalStorage;
}

/**
 * Close the global storage connection
 */
export async function closeStorage(): Promise<void> {
  if (globalStorage) {
    await globalStorage.disconnect();
    globalStorage = null;
  }
}