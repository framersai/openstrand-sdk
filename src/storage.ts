import type {
  DatabaseOptions,
  StorageAdapter,
  AdapterKind,
} from '@framers/sql-storage-adapter';

import {
  createDatabase as baseCreateDatabase,
  connectDatabase,
  openDatabase,
  createMemoryDatabase,
  resolveStorageAdapter,
} from '@framers/sql-storage-adapter';

export {
  connectDatabase,
  openDatabase,
  createMemoryDatabase,
  resolveStorageAdapter,
};

export type { StorageAdapter, DatabaseOptions, AdapterKind };
export type Database = StorageAdapter;

const LOCAL_FIRST_PRIORITY: AdapterKind[] = ['indexeddb', 'sqljs'];

/**
 * Open a persistent, local-first database using the official sql-storage-adapter.
 *
 * This helper is a thin convenience wrapper that defaults to IndexedDB + sql.js
 * for Community Edition / browser runtimes while still allowing callers to pass
 * through any {@link DatabaseOptions} they need (e.g. forcing SQLite or memory).
 */
export async function openLocalDB(
  options?: DatabaseOptions,
): Promise<StorageAdapter> {
  const mergedOptions: DatabaseOptions = {
    priority: LOCAL_FIRST_PRIORITY,
    type: 'browser',
    ...options,
  };

  return baseCreateDatabase(mergedOptions);
}

/**
 * Re-export createDatabase for parity with sql-storage-adapter consumers.
 * Having the symbol locally lets downstream callers import everything from
 * the SDK when convenient while still resolving to the official implementation.
 */
export const createDatabase = baseCreateDatabase;
