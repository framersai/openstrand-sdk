/**
 * Web SQLite Storage Adapter
 *
 * Implements storage using sql.js - SQLite compiled to WebAssembly for browsers.
 * Provides full SQL database capabilities in the browser with optional persistence.
 *
 * @module WebSQLiteAdapter
 */

import { SQLStorageAdapter, QueryResult, Transaction, StorageConfig } from '../sql-adapter';

// Type definitions for sql.js
interface SqlJs {
  Database: new (data?: Uint8Array) => SqlJsDatabase;
}

interface SqlJsDatabase {
  run(sql: string, params?: any[]): void;
  exec(sql: string): SqlJsResult[];
  prepare(sql: string): SqlJsStatement;
  export(): Uint8Array;
  close(): void;
}

interface SqlJsStatement {
  bind(values: any[]): boolean;
  step(): boolean;
  get(params?: any[]): any[];
  getAsObject(params?: any[]): any;
  free(): void;
}

interface SqlJsResult {
  columns: string[];
  values: any[][];
}

/**
 * Web SQLite transaction implementation
 */
class WebSQLiteTransaction implements Transaction {
  private statements: string[] = [];
  private parameters: any[][] = [];

  constructor(private db: SqlJsDatabase) {}

  async query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
    this.statements.push(sql);
    this.parameters.push(params || []);

    // Execute immediately for SELECT queries
    if (sql.trim().toUpperCase().startsWith('SELECT')) {
      const stmt = this.db.prepare(sql);
      stmt.bind(params || []);

      const rows: T[] = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject() as T);
      }
      stmt.free();

      return {
        rows,
        rowCount: rows.length
      };
    }

    // Queue other statements
    return { rows: [], rowCount: 0 };
  }

  async execute(sql: string, params?: any[]): Promise<void> {
    this.statements.push(sql);
    this.parameters.push(params || []);
  }

  async commit(): Promise<void> {
    // Execute all queued statements
    for (let i = 0; i < this.statements.length; i++) {
      const sql = this.statements[i];
      const params = this.parameters[i];

      if (!sql.trim().toUpperCase().startsWith('SELECT')) {
        this.db.run(sql, params);
      }
    }
    this.db.run('COMMIT');
  }

  async rollback(): Promise<void> {
    this.db.run('ROLLBACK');
  }
}

/**
 * Web SQLite storage adapter
 */
export class WebSQLiteAdapter extends SQLStorageAdapter {
  private SQL: SqlJs | null = null;
  private db: SqlJsDatabase | null = null;
  private persistenceKey = 'openstrand_db';
  private autoSaveInterval: NodeJS.Timeout | null = null;

  constructor(config: StorageConfig) {
    super(config);
    this.provider = 'sqlite-web';

    // Set persistence key if provided
    if (config.dataDir) {
      this.persistenceKey = config.dataDir;
    }
  }

  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      // Load sql.js library
      await this.loadSqlJs();

      // Load existing database from storage or create new
      const data = await this.loadFromStorage();

      if (data) {
        this.db = new this.SQL!.Database(data);
        if (this.config.debug) {
          console.log('[WebSQLiteAdapter] Loaded existing database from storage');
        }
      } else {
        this.db = new this.SQL!.Database();
        if (this.config.debug) {
          console.log('[WebSQLiteAdapter] Created new database');
        }
      }

      this.isConnected = true;

      // Initialize schema
      await this.initialize();

      // Set up auto-save if configured
      if (this.config.offline) {
        this.setupAutoSave();
      }
    } catch (error) {
      console.error('[WebSQLiteAdapter] Connection failed:', error);
      throw new Error(`Failed to connect to WebSQLite: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    if (!this.isConnected || !this.db) {
      return;
    }

    try {
      // Save to storage before closing
      await this.saveToStorage();

      // Clear auto-save interval
      if (this.autoSaveInterval) {
        clearInterval(this.autoSaveInterval);
        this.autoSaveInterval = null;
      }

      // Close database
      this.db.close();
      this.db = null;
      this.isConnected = false;

      if (this.config.debug) {
        console.log('[WebSQLiteAdapter] Disconnected');
      }
    } catch (error) {
      console.error('[WebSQLiteAdapter] Disconnect failed:', error);
      throw error;
    }
  }

  async query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    try {
      if (this.config.debug) {
        console.log('[WebSQLiteAdapter] Query:', sql, params);
      }

      // Use prepared statements for parameterized queries
      if (params && params.length > 0) {
        const stmt = this.db.prepare(sql);
        stmt.bind(params);

        const rows: T[] = [];
        const fields: string[] = [];
        let firstRow = true;

        while (stmt.step()) {
          const row = stmt.getAsObject();
          rows.push(row as T);

          if (firstRow) {
            fields.push(...Object.keys(row));
            firstRow = false;
          }
        }

        stmt.free();

        return {
          rows,
          rowCount: rows.length,
          fields
        };
      }

      // Execute directly for non-parameterized queries
      const results = this.db.exec(sql);

      if (results.length === 0) {
        return { rows: [], rowCount: 0, fields: [] };
      }

      const result = results[0];
      const rows = result.values.map(row => {
        const obj: any = {};
        result.columns.forEach((col, idx) => {
          obj[col] = row[idx];
        });
        return obj as T;
      });

      return {
        rows,
        rowCount: rows.length,
        fields: result.columns
      };
    } catch (error) {
      console.error('[WebSQLiteAdapter] Query failed:', error);
      throw error;
    }
  }

  async execute(sql: string, params?: any[]): Promise<void> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    try {
      if (this.config.debug) {
        console.log('[WebSQLiteAdapter] Execute:', sql, params);
      }

      this.db.run(sql, params);

      // Auto-save after mutations if offline mode is enabled
      if (this.config.offline && this.isMutation(sql)) {
        await this.saveToStorage();
      }
    } catch (error) {
      console.error('[WebSQLiteAdapter] Execute failed:', error);
      throw error;
    }
  }

  async transaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    try {
      // Begin transaction
      this.db.run('BEGIN TRANSACTION');

      // Create transaction context
      const tx = new WebSQLiteTransaction(this.db);

      // Execute transaction function
      const result = await fn(tx);

      // Commit if successful
      await tx.commit();

      // Save to storage after transaction
      if (this.config.offline) {
        await this.saveToStorage();
      }

      return result;
    } catch (error) {
      // Rollback on error
      try {
        this.db.run('ROLLBACK');
      } catch (rollbackError) {
        console.error('[WebSQLiteAdapter] Rollback failed:', rollbackError);
      }

      console.error('[WebSQLiteAdapter] Transaction failed:', error);
      throw error;
    }
  }

  /**
   * Load sql.js library
   */
  private async loadSqlJs(): Promise<void> {
    try {
      // Try to load from CDN or bundled version
      if (typeof window !== 'undefined' && (window as any).initSqlJs) {
        this.SQL = await (window as any).initSqlJs({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/sql.js@1.8.0/dist/${file}`
        });
      } else {
        // Try dynamic import
        const sqlJsModule = await import('sql.js');
        this.SQL = await sqlJsModule.default({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/sql.js@1.8.0/dist/${file}`
        });
      }
    } catch (error) {
      console.error('[WebSQLiteAdapter] Failed to load sql.js:', error);
      throw new Error('Failed to load sql.js library');
    }
  }

  /**
   * Load database from browser storage
   */
  private async loadFromStorage(): Promise<Uint8Array | null> {
    try {
      // Try IndexedDB first
      if (typeof indexedDB !== 'undefined') {
        const data = await this.loadFromIndexedDB();
        if (data) return data;
      }

      // Fall back to localStorage
      const stored = localStorage.getItem(this.persistenceKey);
      if (stored) {
        // Convert base64 to Uint8Array
        const binaryString = atob(stored);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
      }
    } catch (error) {
      console.warn('[WebSQLiteAdapter] Failed to load from storage:', error);
    }

    return null;
  }

  /**
   * Save database to browser storage
   */
  private async saveToStorage(): Promise<void> {
    if (!this.db) return;

    try {
      const data = this.db.export();

      // Try IndexedDB first
      if (typeof indexedDB !== 'undefined') {
        await this.saveToIndexedDB(data);
        return;
      }

      // Fall back to localStorage
      // Convert Uint8Array to base64
      let binaryString = '';
      for (let i = 0; i < data.length; i++) {
        binaryString += String.fromCharCode(data[i]);
      }
      const base64 = btoa(binaryString);
      localStorage.setItem(this.persistenceKey, base64);

      if (this.config.debug) {
        console.log('[WebSQLiteAdapter] Saved to storage');
      }
    } catch (error) {
      console.error('[WebSQLiteAdapter] Failed to save to storage:', error);
    }
  }

  /**
   * Load from IndexedDB
   */
  private async loadFromIndexedDB(): Promise<Uint8Array | null> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('OpenStrandDB', 1);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['databases'], 'readonly');
        const store = transaction.objectStore('databases');
        const getRequest = store.get(this.persistenceKey);

        getRequest.onsuccess = () => {
          resolve(getRequest.result?.data || null);
        };

        getRequest.onerror = () => reject(getRequest.error);
      };

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('databases')) {
          db.createObjectStore('databases', { keyPath: 'name' });
        }
      };
    });
  }

  /**
   * Save to IndexedDB
   */
  private async saveToIndexedDB(data: Uint8Array): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('OpenStrandDB', 1);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['databases'], 'readwrite');
        const store = transaction.objectStore('databases');
        const putRequest = store.put({
          name: this.persistenceKey,
          data: data,
          updated: new Date().toISOString()
        });

        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('databases')) {
          db.createObjectStore('databases', { keyPath: 'name' });
        }
      };
    });
  }

  /**
   * Set up auto-save interval
   */
  private setupAutoSave(): void {
    const interval = this.config.sync?.interval || 30000; // Default 30 seconds

    this.autoSaveInterval = setInterval(async () => {
      await this.saveToStorage();
    }, interval);

    // Also save on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.saveToStorage();
      });
    }
  }

  /**
   * Check if SQL statement is a mutation
   */
  private isMutation(sql: string): boolean {
    const upperSql = sql.trim().toUpperCase();
    return (
      upperSql.startsWith('INSERT') ||
      upperSql.startsWith('UPDATE') ||
      upperSql.startsWith('DELETE') ||
      upperSql.startsWith('CREATE') ||
      upperSql.startsWith('DROP') ||
      upperSql.startsWith('ALTER')
    );
  }

  /**
   * Override createTables for SQLite-specific syntax
   */
  protected async createTables(): Promise<void> {
    // Call the parent method with SQLite-specific adjustments
    await super.createTables();

    // Add SQLite-specific optimizations
    await this.execute('PRAGMA journal_mode = WAL');
    await this.execute('PRAGMA synchronous = NORMAL');

    if (this.config.debug) {
      console.log('[WebSQLiteAdapter] Database schema created');
    }
  }

  /**
   * Export database as SQL dump
   */
  async exportToSQL(): Promise<string> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    const tables = await this.query<{ name: string }>(`
      SELECT name FROM sqlite_master
      WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_%'
    `);

    let dump = '-- OpenStrand Database Dump (WebSQL)\n';
    dump += `-- Generated: ${new Date().toISOString()}\n\n`;

    for (const table of tables.rows) {
      // Get table schema
      const schema = await this.query<{ sql: string }>(`
        SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?
      `, [table.name]);

      if (schema.rows.length > 0) {
        dump += `\n-- Table: ${table.name}\n`;
        dump += schema.rows[0].sql + ';\n\n';

        // Get table data
        const data = await this.query(`SELECT * FROM ${table.name}`);
        for (const row of data.rows) {
          const values = Object.values(row).map(v =>
            v === null ? 'NULL' :
            typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` :
            String(v)
          );
          dump += `INSERT INTO ${table.name} VALUES (${values.join(', ')});\n`;
        }
      }
    }

    return dump;
  }
}