/**
 * Fact-Check Module
 * 
 * Client wrapper for /api/fact-check endpoints
 * 
 * @module modules/factCheck
 */

import type { OpenStrandSDK } from '../client';

export interface FactCheckStartOptions {
  prompt: string;
  models?: {
    primary?: string;
    secondary?: string;
    arbiter?: string;
  };
  timeout?: number;
}

export interface FactCheckResult {
  jobId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  verdict?: 'MATCH' | 'MISMATCH' | 'UNCERTAIN';
  confidence?: number;
  answerA?: string;
  answerB?: string;
  arbiterReasoning?: string;
}

export interface FactCheckJob {
  id: string;
  prompt: string;
  status: string;
  verdict?: string;
  confidence?: number;
  created: string;
  completed?: string;
}

/**
 * Fact-Check Module
 * 
 * @example
 * ```typescript
 * const job = await sdk.factCheck.start('Is the sky blue?');
 * const status = await sdk.factCheck.getStatus(job.jobId);
 * const jobs = await sdk.factCheck.list();
 * ```
 */
export class FactCheckModule {
  constructor(private sdk: OpenStrandSDK) {}

  /**
   * Start a fact-check job
   * 
   * @param options - Fact-check options
   * @returns Job result
   */
  async start(options: FactCheckStartOptions): Promise<FactCheckResult> {
    return this.sdk.request('POST', '/api/fact-check', {
      body: options,
    });
  }

  /**
   * Get fact-check job status
   * 
   * @param jobId - Job ID
   * @returns Job status
   */
  async getStatus(jobId: string): Promise<FactCheckResult> {
    return this.sdk.request('GET', `/api/fact-check/${jobId}`);
  }

  /**
   * List recent fact-check jobs
   * 
   * @param limit - Max results
   * @returns Jobs
   */
  async list(limit = 20): Promise<FactCheckJob[]> {
    return this.sdk.request('GET', '/api/fact-check', {
      query: { limit: String(limit) },
    });
  }

  /**
   * Poll for job completion
   * 
   * @param jobId - Job ID
   * @param options - Polling options
   * @returns Completed job
   */
  async poll(
    jobId: string,
    options?: {
      maxAttempts?: number;
      intervalMs?: number;
    }
  ): Promise<FactCheckResult> {
    const maxAttempts = options?.maxAttempts || 30;
    const intervalMs = options?.intervalMs || 1000;

    for (let i = 0; i < maxAttempts; i++) {
      const result = await this.getStatus(jobId);

      if (result.status === 'COMPLETED' || result.status === 'FAILED') {
        return result;
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new Error('Fact-check polling timed out');
  }
}

