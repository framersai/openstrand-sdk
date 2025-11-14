/**
 * OpenStrand SDK Client Tests
 * 
 * @module client.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenStrandSDK, OpenStrandSDKError } from './client';

describe('OpenStrandSDK', () => {
  let sdk: OpenStrandSDK;

  beforeEach(() => {
    sdk = new OpenStrandSDK({
      baseUrl: 'http://localhost:8000',
      token: 'test-token',
      timeout: 5000,
    });

    global.fetch = vi.fn();
  });

  describe('constructor', () => {
    it('should initialize with config', () => {
      expect(sdk).toBeDefined();
      expect(sdk.templates).toBeDefined();
      expect(sdk.factCheck).toBeDefined();
      expect(sdk.enrichment).toBeDefined();
      expect(sdk.plugins).toBeDefined();
      expect(sdk.wizard).toBeDefined();
    });

    it('should remove trailing slash from baseUrl', () => {
      const sdkWithSlash = new OpenStrandSDK({
        baseUrl: 'http://localhost:8000/',
        token: 'test-token',
      });

      const config = sdkWithSlash.getConfig();
      expect(config.baseUrl).toBe('http://localhost:8000');
    });
  });

  describe('request', () => {
    it('should make GET request', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: 'data' }),
      });

      const result = await sdk.request('GET', '/api/test');

      expect(result).toEqual({ result: 'data' });
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/test',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
          }),
        })
      );
    });

    it('should make POST request with body', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: '123' }),
      });

      await sdk.request('POST', '/api/test', {
        body: { data: 'test' },
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ data: 'test' }),
        })
      );
    });

    it('should add query parameters', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await sdk.request('GET', '/api/test', {
        query: { foo: 'bar', baz: 'qux' },
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('foo=bar'),
        expect.any(Object)
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('baz=qux'),
        expect.any(Object)
      );
    });

    it('should handle 401 unauthorized', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Unauthorized' }),
      });

      await expect(sdk.request('GET', '/api/test')).rejects.toThrow(OpenStrandSDKError);
    });

    it('should handle 404 not found', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ message: 'Not found' }),
      });

      await expect(sdk.request('GET', '/api/test')).rejects.toThrow(OpenStrandSDKError);
    });

    it('should handle 500 server error', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Internal server error' }),
      });

      await expect(sdk.request('GET', '/api/test')).rejects.toThrow(OpenStrandSDKError);
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      await expect(sdk.request('GET', '/api/test')).rejects.toThrow('Network error');
    });

    it('should handle timeout', async () => {
      const slowSdk = new OpenStrandSDK({
        baseUrl: 'http://localhost:8000',
        token: 'test-token',
        timeout: 100,
      });

      // Mock slow response
      (global.fetch as any).mockImplementationOnce(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve({ ok: true, json: async () => ({}) }), 200);
        });
      });

      await expect(slowSdk.request('GET', '/api/test')).rejects.toThrow();
    });

    it('should add custom headers', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await sdk.request('GET', '/api/test', {
        headers: { 'X-Custom-Header': 'value' },
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom-Header': 'value',
          }),
        })
      );
    });
  });

  describe('setToken', () => {
    it('should update token', () => {
      sdk.setToken('new-token');

      const config = sdk.getConfig();
      expect(config.token).toBe('new-token');
    });

    it('should use new token in requests', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      sdk.setToken('new-token');
      await sdk.request('GET', '/api/test');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer new-token',
          }),
        })
      );
    });
  });

  describe('getConfig', () => {
    it('should return current config', () => {
      const config = sdk.getConfig();

      expect(config).toEqual({
        baseUrl: 'http://localhost:8000',
        token: 'test-token',
        timeout: 5000,
      });
    });
  });
});

describe('OpenStrandSDKError', () => {
  it('should create error with status code', () => {
    const error = new OpenStrandSDKError('Not found', 404, { detail: 'Resource not found' });

    expect(error.message).toBe('Not found');
    expect(error.statusCode).toBe(404);
    expect(error.details).toEqual({ detail: 'Resource not found' });
    expect(error.name).toBe('OpenStrandSDKError');
  });

  it('should be instanceof Error', () => {
    const error = new OpenStrandSDKError('Test', 500);

    expect(error instanceof Error).toBe(true);
    expect(error instanceof OpenStrandSDKError).toBe(true);
  });
});

