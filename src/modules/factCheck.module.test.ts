/**
 * Fact-Check Module Tests
 * 
 * @module modules/factCheck.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenStrandSDK } from '../client';
import { FactCheckModule } from './factCheck.module';

describe('FactCheckModule', () => {
  let sdk: OpenStrandSDK;
  let factCheckModule: FactCheckModule;

  beforeEach(() => {
    sdk = new OpenStrandSDK({
      baseUrl: 'http://localhost:8000',
      token: 'test-token',
    });
    factCheckModule = sdk.factCheck;

    // Mock fetch globally
    global.fetch = vi.fn();
  });

  describe('start', () => {
    it('should start a fact-check job', async () => {
      const mockResult = {
        jobId: 'job-123',
        status: 'PENDING',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResult,
      });

      const result = await factCheckModule.start({
        prompt: 'Is the sky blue?',
      });

      expect(result).toEqual(mockResult);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/fact-check',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
          }),
        })
      );
    });

    it('should start fact-check with custom models', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ jobId: 'job-123', status: 'PENDING' }),
      });

      await factCheckModule.start({
        prompt: 'Test prompt',
        models: {
          primary: 'gpt-4',
          secondary: 'claude-3-opus',
          arbiter: 'gpt-4-turbo',
        },
      });

      const callBody = JSON.parse((global.fetch as any).mock.calls[0][1].body);
      expect(callBody.models).toEqual({
        primary: 'gpt-4',
        secondary: 'claude-3-opus',
        arbiter: 'gpt-4-turbo',
      });
    });
  });

  describe('getStatus', () => {
    it('should get job status', async () => {
      const mockResult = {
        jobId: 'job-123',
        status: 'COMPLETED',
        verdict: 'MATCH',
        confidence: 0.95,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResult,
      });

      const result = await factCheckModule.getStatus('job-123');

      expect(result).toEqual(mockResult);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/fact-check/job-123',
        expect.any(Object)
      );
    });
  });

  describe('poll', () => {
    it('should poll until job completes', async () => {
      // First call: PENDING
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ jobId: 'job-123', status: 'PENDING' }),
      });

      // Second call: PROCESSING
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ jobId: 'job-123', status: 'PROCESSING' }),
      });

      // Third call: COMPLETED
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jobId: 'job-123',
          status: 'COMPLETED',
          verdict: 'MATCH',
          confidence: 0.95,
        }),
      });

      const result = await factCheckModule.poll('job-123', {
        maxAttempts: 10,
        intervalMs: 10, // Fast polling for tests
      });

      expect(result.status).toBe('COMPLETED');
      expect(result.verdict).toBe('MATCH');
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should timeout if job does not complete', async () => {
      // Always return PENDING
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ jobId: 'job-123', status: 'PENDING' }),
      });

      await expect(
        factCheckModule.poll('job-123', {
          maxAttempts: 3,
          intervalMs: 10,
        })
      ).rejects.toThrow('timed out');
    });
  });

  describe('list', () => {
    it('should list recent jobs', async () => {
      const mockJobs = [
        {
          id: 'job-1',
          prompt: 'Test 1',
          status: 'COMPLETED',
          verdict: 'MATCH',
          confidence: 0.95,
          created: '2025-01-01T00:00:00Z',
          completed: '2025-01-01T00:01:00Z',
        },
        {
          id: 'job-2',
          prompt: 'Test 2',
          status: 'PENDING',
          verdict: null,
          confidence: null,
          created: '2025-01-01T00:02:00Z',
          completed: null,
        },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockJobs,
      });

      const result = await factCheckModule.list(20);

      expect(result).toEqual(mockJobs);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=20'),
        expect.any(Object)
      );
    });
  });
});

