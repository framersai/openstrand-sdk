import { describe, expect, it, beforeEach, vi } from 'vitest';

const createDatabaseMock = vi.fn(async () => ({ kind: 'indexeddb' }) as any);

vi.mock('@framers/sql-storage-adapter', () => ({
  createDatabase: (...args: unknown[]) => createDatabaseMock(...(args as [unknown])),
  connectDatabase: vi.fn(),
  openDatabase: vi.fn(),
  createMemoryDatabase: vi.fn(),
  resolveStorageAdapter: vi.fn(),
}));

import { openLocalDB } from './storage';

describe('storage helpers', () => {
  beforeEach(() => {
    createDatabaseMock.mockClear();
  });

  it('opens local db with default IndexedDB/sql.js priority', async () => {
    await openLocalDB();

    expect(createDatabaseMock).toHaveBeenCalledWith({
      priority: ['indexeddb', 'sqljs'],
      type: 'browser',
    });
  });

  it('allows overriding database options', async () => {
    await openLocalDB({
      type: 'sqlite',
      priority: ['sqljs'],
      file: './test.db',
    });

    expect(createDatabaseMock).toHaveBeenCalledWith({
      type: 'sqlite',
      priority: ['sqljs'],
      file: './test.db',
    });
  });
});

