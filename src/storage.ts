import type { Database } from '@framers/sql-storage-adapter';

/**
 * Open a local database using the sql-storage-adapter.
 * In browsers this prefers IndexedDB (sql.js persistence).
 */
export async function openLocalDB(): Promise<Database> {
  const { createDatabase } = await import('@framers/sql-storage-adapter');
  return createDatabase({
    priority: ['indexeddb', 'sqljs', 'memory'],
    name: 'openstrand_local',
    autoMigrate: true,
  } as any);
}


