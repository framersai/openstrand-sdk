/**
 * Templates Module Tests
 * 
 * @module modules/templates.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenStrandSDK } from '../client';
import { TemplatesModule } from './templates.module';

describe('TemplatesModule', () => {
  let sdk: OpenStrandSDK;
  let templatesModule: TemplatesModule;

  beforeEach(() => {
    sdk = new OpenStrandSDK({
      baseUrl: 'http://localhost:8000',
      token: 'test-token',
    });
    templatesModule = sdk.templates;

    // Mock fetch globally
    global.fetch = vi.fn();
  });

  describe('list', () => {
    it('should list templates without filters', async () => {
      const mockTemplates = [
        {
          id: '1',
          name: 'Storytelling',
          slug: 'storytelling',
          category: 'STORYTELLING',
          tags: ['beginner'],
          usageCount: 10,
          created: '2025-01-01T00:00:00Z',
          isPublic: true,
        },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTemplates,
      });

      const result = await templatesModule.list();

      expect(result).toEqual(mockTemplates);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/templates',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
          }),
        })
      );
    });

    it('should list templates with filters', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      await templatesModule.list({
        category: 'STORYTELLING',
        tags: ['beginner', 'advanced'],
        search: 'novel',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('category=STORYTELLING'),
        expect.any(Object)
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('tags=beginner%2Cadvanced'),
        expect.any(Object)
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('search=novel'),
        expect.any(Object)
      );
    });
  });

  describe('get', () => {
    it('should get template by ID', async () => {
      const mockTemplate = {
        id: '1',
        name: 'Storytelling',
        slug: 'storytelling',
        category: 'STORYTELLING',
        tags: [],
        strandTree: { root: {} },
        variables: [],
        assets: [],
        usageCount: 10,
        created: '2025-01-01T00:00:00Z',
        isPublic: true,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTemplate,
      });

      const result = await templatesModule.get('1');

      expect(result).toEqual(mockTemplate);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/templates/1',
        expect.any(Object)
      );
    });

    it('should throw error when template not found', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ message: 'Template not found' }),
      });

      await expect(templatesModule.get('999')).rejects.toThrow();
    });
  });

  describe('apply', () => {
    it('should apply template without variables', async () => {
      const mockResult = {
        rootStrandId: 'strand-123',
        message: 'Template applied successfully',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResult,
      });

      const result = await templatesModule.apply('1');

      expect(result).toEqual(mockResult);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/templates/1/apply',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should apply template with variables', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ rootStrandId: 'strand-123', message: 'Success' }),
      });

      await templatesModule.apply('1', {
        variables: { projectName: 'My Novel' },
      });

      const callBody = JSON.parse((global.fetch as any).mock.calls[0][1].body);
      expect(callBody.variables).toEqual({ projectName: 'My Novel' });
    });
  });
});

