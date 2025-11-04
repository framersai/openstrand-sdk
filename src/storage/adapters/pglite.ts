/**
 * PGLite Storage Adapter
 *
 * Implements storage using PGLite - embedded PostgreSQL that runs in-process.
 * Perfect for Electron apps and local development.
 *
 * @module PGLiteAdapter
 */

import { SQLStorageAdapter, QueryResult, Transaction, StorageConfig } from '../sql-adapter';
import type { PGlite } from '@electric-sql/pglite';

/**
 * PGLite transaction implementation
 */
class PGLiteTransaction implements Transaction {
  constructor(private db: PGlite, private txId: string) {}

  async query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
    const result = await this.db.query(sql, params);
    return {
      rows: result.rows as T[],
      rowCount: result.rows.length,
      fields: result.fields?.map(f => f.name)
    };
  }

  async execute(sql: string, params?: any[]): Promise<void> {
    await this.db.exec(sql, params);
  }

  async commit(): Promise<void> {
    await this.db.exec('COMMIT');
  }

  async rollback(): Promise<void> {
    await this.db.exec('ROLLBACK');
  }
}

/**
 * PGLite storage adapter
 */
export class PGLiteAdapter extends SQLStorageAdapter {
  private db: PGlite | null = null;

  constructor(config: StorageConfig) {
    super(config);
    this.provider = 'pglite';
  }

  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      // Dynamically import PGLite
      const { PGlite } = await import('@electric-sql/pglite');

      // Extract path from URL or use default
      const dbPath = this.config.url?.replace('pglite://', '') || './data/openstrand.db';

      if (this.config.debug) {
        console.log('[PGLiteAdapter] Connecting to database:', dbPath);
      }

      // Create PGLite instance
      this.db = new PGlite(dbPath);

      // Wait for database to be ready
      await this.db.waitReady;

      this.isConnected = true;

      if (this.config.debug) {
        console.log('[PGLiteAdapter] Connected successfully');
      }

      // Initialize schema
      await this.initialize();
    } catch (error) {
      console.error('[PGLiteAdapter] Connection failed:', error);
      throw new Error(`Failed to connect to PGLite: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    if (!this.isConnected || !this.db) {
      return;
    }

    try {
      await this.db.close();
      this.db = null;
      this.isConnected = false;

      if (this.config.debug) {
        console.log('[PGLiteAdapter] Disconnected');
      }
    } catch (error) {
      console.error('[PGLiteAdapter] Disconnect failed:', error);
      throw error;
    }
  }

  async query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    try {
      if (this.config.debug) {
        console.log('[PGLiteAdapter] Query:', sql, params);
      }

      const result = await this.db.query(sql, params);

      return {
        rows: result.rows as T[],
        rowCount: result.rows.length,
        fields: result.fields?.map(f => f.name)
      };
    } catch (error) {
      console.error('[PGLiteAdapter] Query failed:', error);
      throw error;
    }
  }

  async execute(sql: string, params?: any[]): Promise<void> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    try {
      if (this.config.debug) {
        console.log('[PGLiteAdapter] Execute:', sql, params);
      }

      await this.db.exec(sql, params);
    } catch (error) {
      console.error('[PGLiteAdapter] Execute failed:', error);
      throw error;
    }
  }

  async transaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    const txId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Begin transaction
      await this.db.exec('BEGIN');

      // Create transaction context
      const tx = new PGLiteTransaction(this.db, txId);

      // Execute transaction function
      const result = await fn(tx);

      // Commit if successful
      await this.db.exec('COMMIT');

      return result;
    } catch (error) {
      // Rollback on error
      try {
        await this.db.exec('ROLLBACK');
      } catch (rollbackError) {
        console.error('[PGLiteAdapter] Rollback failed:', rollbackError);
      }

      console.error('[PGLiteAdapter] Transaction failed:', error);
      throw error;
    }
  }

  /**
   * PGLite-specific: Execute raw SQL file
   */
  async executeFile(filePath: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    try {
      const fs = await import('fs/promises');
      const sql = await fs.readFile(filePath, 'utf-8');
      await this.db.exec(sql);
    } catch (error) {
      console.error('[PGLiteAdapter] Execute file failed:', error);
      throw error;
    }
  }

  /**
   * PGLite-specific: Get database size
   */
  async getDatabaseSize(): Promise<number> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    try {
      const result = await this.db.query(`
        SELECT pg_database_size(current_database()) as size
      `);
      return result.rows[0]?.size || 0;
    } catch (error) {
      console.error('[PGLiteAdapter] Get database size failed:', error);
      return 0;
    }
  }

  /**
   * PGLite-specific: Vacuum database
   */
  async vacuum(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    try {
      await this.db.exec('VACUUM ANALYZE');
      if (this.config.debug) {
        console.log('[PGLiteAdapter] Vacuum completed');
      }
    } catch (error) {
      console.error('[PGLiteAdapter] Vacuum failed:', error);
      throw error;
    }
  }

  /**
   * PGLite-specific: Export database to SQL dump
   */
  async exportToSQL(): Promise<string> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    try {
      // Get all table names
      const tables = await this.db.query(`
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename NOT LIKE '\\_%' ESCAPE '\\'
      `);

      let dump = '-- OpenStrand Database Dump\n';
      dump += `-- Generated: ${new Date().toISOString()}\n\n`;

      // Export each table
      for (const table of tables.rows) {
        const tableName = table.tablename;

        // Get table structure
        const structure = await this.db.query(`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_name = $1
          ORDER BY ordinal_position
        `, [tableName]);

        dump += `\n-- Table: ${tableName}\n`;
        dump += `CREATE TABLE IF NOT EXISTS ${tableName} (\n`;

        const columns = structure.rows.map(col =>
          `  ${col.column_name} ${col.data_type}${col.is_nullable === 'NO' ? ' NOT NULL' : ''}${col.column_default ? ` DEFAULT ${col.column_default}` : ''}`
        );

        dump += columns.join(',\n');
        dump += '\n);\n\n';

        // Export data
        const data = await this.db.query(`SELECT * FROM ${tableName}`);
        if (data.rows.length > 0) {
          for (const row of data.rows) {
            const values = Object.values(row).map(v =>
              v === null ? 'NULL' :
              typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` :
              typeof v === 'object' ? `'${JSON.stringify(v).replace(/'/g, "''")}'` :
              String(v)
            );

            dump += `INSERT INTO ${tableName} VALUES (${values.join(', ')});\n`;
          }
        }
      }

      return dump;
    } catch (error) {
      console.error('[PGLiteAdapter] Export failed:', error);
      throw error;
    }
  }

  /**
   * PGLite-specific: Import from SQL dump
   */
  async importFromSQL(sql: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    try {
      await this.db.exec(sql);
      if (this.config.debug) {
        console.log('[PGLiteAdapter] Import completed');
      }
    } catch (error) {
      console.error('[PGLiteAdapter] Import failed:', error);
      throw error;
    }
  }

  /**
   * Override base createTables for PGLite-specific features
   */
  protected async createTables(): Promise<void> {
    // Call parent implementation
    await super.createTables();

    // Add PGLite-specific features
    try {
      // Enable UUID extension
      await this.execute(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

      // Create custom functions for better SQLite compatibility
      await this.execute(`
        CREATE OR REPLACE FUNCTION datetime(text)
        RETURNS timestamp with time zone AS $$
        BEGIN
          RETURN CASE
            WHEN $1 = 'now' THEN CURRENT_TIMESTAMP
            ELSE $1::timestamp with time zone
          END;
        END;
        $$ LANGUAGE plpgsql IMMUTABLE;
      `).catch(() => {
        // Ignore if function already exists
      });

      if (this.config.debug) {
        console.log('[PGLiteAdapter] Database schema created');
      }
    } catch (error) {
      console.error('[PGLiteAdapter] Schema creation failed:', error);
      throw error;
    }
  }
}