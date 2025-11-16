/**
 * Pomodoro Module
 * 
 * Client wrapper for Pomodoro timer features and session management.
 * 
 * @module modules/pomodoro
 * @author OpenStrand
 * @since 1.3.0
 * @license MIT
 * 
 * @example
 * ```typescript
 * import { OpenStrandSDK } from '@framers/openstrand-sdk';
 * 
 * const sdk = new OpenStrandSDK({ baseUrl: 'http://localhost:8000' });
 * 
 * // Start Pomodoro session
 * const session = await sdk.pomodoro.start({
 *   preset: 'classic',
 *   label: 'Studying Algorithms'
 * });
 * 
 * // Complete session
 * await sdk.pomodoro.complete(session.id);
 * ```
 */

import type { OpenStrandSDK } from '../client';

export interface PomodoroSession {
  id: string;
  userId: string;
  durationSec: number;
  breakSec: number;
  preset: 'classic' | 'short' | 'long' | 'custom';
  label?: string;
  strandId?: string;
  category?: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  startedAt: string;
  completedAt?: string;
}

export interface PomodoroStats {
  totalSessions: number;
  completedSessions: number;
  totalMinutes: number;
  avgSessionLength: number;
}

/**
 * Pomodoro Module
 * 
 * Provides methods for managing Pomodoro timer sessions.
 * 
 * @public
 */
export class PomodoroModule {
  constructor(private sdk: OpenStrandSDK) {}

  /**
   * Start Pomodoro session
   * 
   * @param data - Session configuration
   * @returns Created session
   * 
   * @example
   * ```typescript
   * const session = await sdk.pomodoro.start({
   *   preset: 'classic', // 25 minutes
   *   label: 'Deep work',
   *   strandId: 'strand-123'
   * });
   * ```
   * 
   * @public
   */
  async start(data: {
    preset?: 'classic' | 'short' | 'long' | 'custom';
    durationSec?: number;
    label?: string;
    strandId?: string;
    category?: string;
    soundEnabled?: boolean;
    volume?: number;
  }): Promise<PomodoroSession> {
    return this.sdk.request('POST', '/api/v1/pomodoro/start', { body: data });
  }

  /**
   * Get active Pomodoro session
   * 
   * @returns Active session or null
   * 
   * @example
   * ```typescript
   * const active = await sdk.pomodoro.getActive();
   * if (active) {
   *   console.log(`Session started ${active.startedAt}`);
   * }
   * ```
   * 
   * @public
   */
  async getActive(): Promise<PomodoroSession | null> {
    try {
      return await this.sdk.request('GET', '/api/v1/pomodoro/active');
    } catch (error) {
      return null;
    }
  }

  /**
   * Pause active session
   * 
   * @param sessionId - Session ID
   * @returns Updated session
   * 
   * @example
   * ```typescript
   * await sdk.pomodoro.pause('session-123');
   * ```
   * 
   * @public
   */
  async pause(sessionId: string): Promise<PomodoroSession> {
    return this.sdk.request('PATCH', `/api/v1/pomodoro/${sessionId}/pause`);
  }

  /**
   * Resume paused session
   * 
   * @param sessionId - Session ID
   * @returns Updated session
   * 
   * @example
   * ```typescript
   * await sdk.pomodoro.resume('session-123');
   * ```
   * 
   * @public
   */
  async resume(sessionId: string): Promise<PomodoroSession> {
    return this.sdk.request('PATCH', `/api/v1/pomodoro/${sessionId}/resume`);
  }

  /**
   * Complete session
   * 
   * @param sessionId - Session ID
   * @param notes - Optional completion notes
   * @returns Completed session
   * 
   * @example
   * ```typescript
   * await sdk.pomodoro.complete('session-123', 'Very productive!');
   * ```
   * 
   * @public
   */
  async complete(sessionId: string, notes?: string): Promise<PomodoroSession> {
    return this.sdk.request('PATCH', `/api/v1/pomodoro/${sessionId}/complete`, {
      body: { notes },
    });
  }

  /**
   * Cancel session
   * 
   * @param sessionId - Session ID
   * @returns Cancelled session
   * 
   * @example
   * ```typescript
   * await sdk.pomodoro.cancel('session-123');
   * ```
   * 
   * @public
   */
  async cancel(sessionId: string): Promise<PomodoroSession> {
    return this.sdk.request('PATCH', `/api/v1/pomodoro/${sessionId}/cancel`);
  }

  /**
   * Get Pomodoro statistics
   * 
   * @param days - Number of days to include
   * @returns Statistics
   * 
   * @example
   * ```typescript
   * const stats = await sdk.pomodoro.getStats(30);
   * console.log(`Total sessions: ${stats.totalSessions}`);
   * console.log(`Total minutes: ${stats.totalMinutes}`);
   * ```
   * 
   * @public
   */
  async getStats(days = 30): Promise<PomodoroStats> {
    return this.sdk.request('GET', `/api/v1/pomodoro/stats?days=${days}`);
  }
}

