/**
 * Illustrations Module Tests
 *
 * @module modules/illustrations.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OpenStrandSDK } from '../client';
import { IllustrationsModule } from './illustrations.module';

describe('IllustrationsModule', () => {
  let sdk: OpenStrandSDK;
  let illustrations: IllustrationsModule;

  beforeEach(() => {
    sdk = new OpenStrandSDK({
      baseUrl: 'http://localhost:8000',
      token: 'test-token',
    });
    illustrations = sdk.illustrations;
    global.fetch = vi.fn();
  });

  it('generates illustration for strand', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          images: [{ url: 'https://example.com/img.png' }],
          prompt: 'test prompt',
        },
      }),
    });

    const result = await illustrations.generateForStrand({
      strandId: 'strand-123',
      summary: 'Test summary',
      stylePreset: 'flat_pastel',
    });

    expect(result.images[0].url).toBe('https://example.com/img.png');
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/illustrations/strand',
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });
});


