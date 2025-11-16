/**
 * Productivity Module
 * 
 * Client wrapper for productivity analytics and tracking.
 * 
 * @module modules/productivity
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
 * // Get dashboard metrics
 * const dashboard = await sdk.productivity.getDashboard();
 * console.log(`Current streak: ${dashboard.streaks.current} days`);
 * ```
 */

import type { OpenStrandSDK } from '../client';

export interface DashboardMetrics {
  streaks: {
    current: number;
    longest: number;
    lastActive: string | null;
  };
  today: {
    pomodoroSessions: number;
    studyMinutes: number;
    flashcardsReviewed: number;
    quizzesTaken: number;
  };
  thisWeek: {
    pomodoroSessions: number;
    studyMinutes: number;
    flashcardsReviewed: number;
    quizzesTaken: number;
  };
  allTime: {
    totalPomodoroSessions: number;
    totalStudyMinutes: number;
    totalFlashcardsReviewed: number;
    totalQuizzesTaken: number;
  };
  averages: {
    dailyMinutes: number;
    dailyPomodoros: number;
    quizScore: number;
    flashcardAccuracy: number;
  };
}

export interface StreakDay {
  date: string;
  active: boolean;
  pomodoroCount: number;
  studyMinutes: number;
  activities: string[];
}

/**
 * Productivity Module
 * 
 * Provides methods for productivity analytics and insights.
 * 
 * @public
 */
export class ProductivityModule {
  constructor(private sdk: OpenStrandSDK) {}

  /**
   * Get comprehensive dashboard metrics
   * 
   * @returns Dashboard data
   * 
   * @example
   * ```typescript
   * const dashboard = await sdk.productivity.getDashboard();
   * console.log(`Current streak: ${dashboard.streaks.current}`);
   * console.log(`Today's study time: ${dashboard.today.studyMinutes}min`);
   * ```
   * 
   * @public
   */
  async getDashboard(): Promise<DashboardMetrics> {
    return this.sdk.request('GET', '/api/v1/analytics/dashboard');
  }

  /**
   * Get streak history (for heatmap visualization)
   * 
   * @param days - Number of days to include
   * @returns Array of daily activity
   * 
   * @example
   * ```typescript
   * const history = await sdk.productivity.getStreakHistory(365);
   * // Render GitHub-style heatmap
   * ```
   * 
   * @public
   */
  async getStreakHistory(days = 365): Promise<StreakDay[]> {
    return this.sdk.request('GET', `/api/v1/analytics/streaks/history?days=${days}`);
  }

  /**
   * Get current streak
   * 
   * @returns Streak data
   * 
   * @example
   * ```typescript
   * const streak = await sdk.productivity.getCurrentStreak();
   * console.log(`${streak.currentStreak} days`);
   * ```
   * 
   * @public
   */
  async getCurrentStreak(): Promise<{
    currentStreak: number;
    longestStreak: number;
  }> {
    return this.sdk.request('GET', '/api/v1/analytics/streaks/current');
  }

  /**
   * Get productivity insights
   * 
   * @returns Insights and recommendations
   * 
   * @example
   * ```typescript
   * const insights = await sdk.productivity.getInsights();
   * insights.forEach(insight => {
   *   console.log(`${insight.type}: ${insight.message}`);
   * });
   * ```
   * 
   * @public
   */
  async getInsights(): Promise<{
    insights: Array<{
      type: 'streak' | 'milestone' | 'suggestion';
      message: string;
      data?: any;
    }>;
  }> {
    return this.sdk.request('GET', '/api/v1/analytics/insights');
  }
}

