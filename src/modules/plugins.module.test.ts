/**
 * Plugins Module Tests
 * 
 * @module modules/plugins.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenStrandSDK } from '../client';
import { PluginsModule } from './plugins.module';

describe('PluginsModule', () => {
  let sdk: OpenStrandSDK;
  let pluginsModule: PluginsModule;

  beforeEach(() => {
    sdk = new OpenStrandSDK({
      baseUrl: 'http://localhost:8000',
      token: 'test-token',
    });
    pluginsModule = sdk.plugins;

    global.fetch = vi.fn();
  });

  describe('list', () => {
    it('should list all plugins', async () => {
      const mockPlugins = [
        {
          id: '1',
          name: 'csv-export',
          version: '1.0.0',
          displayName: 'CSV Exporter',
          enabled: true,
          isSigned: false,
          loadOrder: 1,
          permissions: ['filesystem'],
          installed: '2025-01-01T00:00:00Z',
          updated: '2025-01-01T00:00:00Z',
        },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPlugins,
      });

      const result = await pluginsModule.list();

      expect(result).toEqual(mockPlugins);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/plugins',
        expect.any(Object)
      );
    });

    it('should filter by enabled status', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      await pluginsModule.list({ enabled: true });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('enabled=true'),
        expect.any(Object)
      );
    });
  });

  describe('install', () => {
    it('should install plugin', async () => {
      const mockResult = {
        id: '1',
        name: 'csv-export',
        message: 'Plugin installed successfully',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockResult,
      });

      const result = await pluginsModule.install({
        name: 'csv-export',
        version: '1.0.0',
        source: 'npm',
        path: 'npm:@company/csv-export',
        permissions: ['filesystem'],
      });

      expect(result).toEqual(mockResult);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/plugins',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should throw error when plugin already exists', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ error: 'CONFLICT', message: 'Plugin already installed' }),
      });

      await expect(
        pluginsModule.install({
          name: 'csv-export',
          version: '1.0.0',
          source: 'npm',
          path: 'npm:@company/csv-export',
        })
      ).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('should update plugin enabled status', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Plugin updated successfully' }),
      });

      const result = await pluginsModule.update('csv-export', { enabled: false });

      expect(result.message).toBe('Plugin updated successfully');
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/plugins/csv-export',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ enabled: false }),
        })
      );
    });

    it('should update plugin load order', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Plugin updated successfully' }),
      });

      await pluginsModule.update('csv-export', { loadOrder: 5 });

      const callBody = JSON.parse((global.fetch as any).mock.calls[0][1].body);
      expect(callBody.loadOrder).toBe(5);
    });
  });

  describe('uninstall', () => {
    it('should uninstall plugin', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Plugin uninstalled successfully' }),
      });

      const result = await pluginsModule.uninstall('csv-export');

      expect(result.message).toBe('Plugin uninstalled successfully');
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/plugins/csv-export',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    it('should throw error when plugin not found', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'NOT_FOUND', message: 'Plugin not found' }),
      });

      await expect(pluginsModule.uninstall('nonexistent')).rejects.toThrow();
    });
  });

  describe('getConflicts', () => {
    it('should return conflicts', async () => {
      const mockConflicts = {
        conflicts: [
          {
            selector: 'export-csv',
            type: 'command',
            plugins: ['csv-export', 'data-exporter'],
          },
        ],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockConflicts,
      });

      const result = await pluginsModule.getConflicts();

      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].plugins).toContain('csv-export');
    });

    it('should return empty array when no conflicts', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ conflicts: [] }),
      });

      const result = await pluginsModule.getConflicts();

      expect(result.conflicts).toEqual([]);
    });
  });
});

