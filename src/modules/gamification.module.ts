/**
 * Gamification Module
 * 
 * Client wrapper for badges, leaderboards, and sharing features.
 * 
 * @module modules/gamification
 * @author OpenStrand
 * @since 1.4.0
 * @license MIT
 * 
 * @example
 * ```typescript
 * import { OpenStrandSDK } from '@framers/openstrand-sdk';
 * 
 * const sdk = new OpenStrandSDK({ baseUrl: 'http://localhost:8000' });
 * 
 * // Get user's badges
 * const badges = await sdk.gamification.getUserBadges();
 * console.log(`Earned ${badges.length} badges`);
 * 
 * // Get leaderboard
 * const leaderboard = await sdk.gamification.getLeaderboard('team-123');
 * ```
 */

import type { OpenStrandSDK } from '../client';

export interface Badge {
  id: string;
  name: string;
  slug: string;
  description?: string;
  category?: string;
  assetType: 'svg' | 'png' | 'gif';
  assetUrl: string;
  primaryColor?: string;
  secondaryColor?: string;
  criteria: Record<string, any>;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  points: number;
  earned: boolean;
  earnedAt?: string;
  progress?: number;
}

export interface LeaderboardEntry {
  id: string;
  userId: string;
  rank: number;
  score: number;
  flashcardsReviewed: number;
  quizzesCompleted: number;
  pomodoroSessions: number;
  currentStreak: number;
  user: {
    username: string;
    displayName: string | null;
  };
}

export interface SharedContent {
  id: string;
  contentId: string;
  contentType: 'flashcard_deck' | 'quiz' | 'strand' | 'loom';
  shareCode: string;
  shareUrl: string;
  qrCodeUrl?: string;
  isPublic: boolean;
  allowClone: boolean;
  viewCount: number;
  cloneCount: number;
  created: string;
}

/**
 * Gamification Module
 * 
 * Provides methods for badges, leaderboards, and content sharing.
 * 
 * @public
 */
export class GamificationModule {
  constructor(private sdk: OpenStrandSDK) {}

  // ============================================================================
  // BADGE METHODS
  // ============================================================================

  /**
   * List all available badges
   * 
   * @param teamId - Optional team ID
   * @returns Array of badges
   * 
   * @example
   * ```typescript
   * const badges = await sdk.gamification.listBadges();
   * const earned = badges.filter(b => b.earned);
   * ```
   * 
   * @public
   */
  async listBadges(teamId?: string): Promise<Badge[]> {
    const query: Record<string, string> = {};
    if (teamId) query.teamId = teamId;

    return this.sdk.request('GET', '/api/v1/badges', { query });
  }

  /**
   * Get user's earned badges
   * 
   * @returns Array of earned badges
   * 
   * @example
   * ```typescript
   * const earned = await sdk.gamification.getUserBadges();
   * console.log(`You have ${earned.length} badges!`);
   * ```
   * 
   * @public
   */
  async getUserBadges(): Promise<Badge[]> {
    return this.sdk.request('GET', '/api/v1/badges/me');
  }

  /**
   * Check and auto-award badges based on criteria
   * 
   * @returns Newly awarded badges
   * 
   * @example
   * ```typescript
   * const newBadges = await sdk.gamification.checkBadges();
   * if (newBadges.length > 0) {
   *   console.log('New badges earned:', newBadges.map(b => b.name));
   * }
   * ```
   * 
   * @public
   */
  async checkBadges(): Promise<Badge[]> {
    return this.sdk.request('POST', '/api/v1/badges/check');
  }

  /**
   * Toggle badge visibility
   * 
   * @param badgeId - User badge ID
   * @returns Updated badge
   * 
   * @example
   * ```typescript
   * await sdk.gamification.toggleBadgeVisibility('badge-123');
   * ```
   * 
   * @public
   */
  async toggleBadgeVisibility(badgeId: string): Promise<any> {
    return this.sdk.request('PATCH', `/api/v1/badges/${badgeId}/visibility`);
  }

  // ============================================================================
  // LEADERBOARD METHODS
  // ============================================================================

  /**
   * Get team leaderboard
   * 
   * @param teamId - Team ID
   * @param options - Filter options
   * @returns Leaderboard entries
   * 
   * @example
   * ```typescript
   * const leaderboard = await sdk.gamification.getLeaderboard('team-123', {
   *   category: 'overall',
   *   period: 'weekly',
   *   limit: 50
   * });
   * ```
   * 
   * @public
   */
  async getLeaderboard(teamId: string, options?: {
    category?: 'overall' | 'flashcards' | 'quizzes' | 'pomodoro' | 'streak';
    period?: 'weekly' | 'monthly' | 'all_time';
    limit?: number;
  }): Promise<LeaderboardEntry[]> {
    const query: Record<string, string> = {};
    if (options?.category) query.category = options.category;
    if (options?.period) query.period = options.period;
    if (options?.limit) query.limit = String(options.limit);

    return this.sdk.request('GET', `/api/v1/leaderboard/${teamId}`, { query });
  }

  /**
   * Opt into leaderboards
   * 
   * @param teamId - Team ID
   * 
   * @example
   * ```typescript
   * await sdk.gamification.optInLeaderboard('team-123');
   * ```
   * 
   * @public
   */
  async optInLeaderboard(teamId: string): Promise<void> {
    await this.sdk.request('POST', '/api/v1/leaderboard/opt-in', {
      body: { teamId },
    });
  }

  /**
   * Opt out of leaderboards
   * 
   * @param teamId - Team ID
   * 
   * @example
   * ```typescript
   * await sdk.gamification.optOutLeaderboard('team-123');
   * ```
   * 
   * @public
   */
  async optOutLeaderboard(teamId: string): Promise<void> {
    await this.sdk.request('POST', '/api/v1/leaderboard/opt-out', {
      body: { teamId },
    });
  }

  /**
   * Get user's leaderboard position
   * 
   * @param teamId - Team ID
   * @param options - Filter options
   * @returns User's position
   * 
   * @example
   * ```typescript
   * const position = await sdk.gamification.getUserPosition('team-123', {
   *   category: 'streak'
   * });
   * console.log(`You are rank #${position.rank}`);
   * ```
   * 
   * @public
   */
  async getUserPosition(teamId: string, options?: {
    category?: string;
    period?: string;
  }): Promise<LeaderboardEntry | null> {
    const query: Record<string, string> = {};
    if (options?.category) query.category = options.category;
    if (options?.period) query.period = options.period;

    return this.sdk.request('GET', `/api/v1/leaderboard/${teamId}/me`, { query });
  }

  // ============================================================================
  // SHARING METHODS
  // ============================================================================

  /**
   * Create shareable link with QR code
   * 
   * @param data - Share configuration
   * @returns Share data
   * 
   * @example
   * ```typescript
   * const share = await sdk.gamification.createShare({
   *   contentId: 'quiz-123',
   *   contentType: 'quiz',
   *   isPublic: true,
   *   allowClone: true
   * });
   * 
   * console.log('Share URL:', share.shareUrl);
   * console.log('QR Code:', share.qrCodeUrl);
   * ```
   * 
   * @public
   */
  async createShare(data: {
    contentId: string;
    contentType: 'flashcard_deck' | 'quiz' | 'strand' | 'loom';
    isPublic?: boolean;
    allowClone?: boolean;
    expiresAt?: string;
  }): Promise<SharedContent> {
    return this.sdk.request('POST', '/api/v1/share', { body: data });
  }

  /**
   * Get shared content by code
   * 
   * @param shareCode - Share code
   * @returns Shared content
   * 
   * @example
   * ```typescript
   * const shared = await sdk.gamification.getShare('abc123xy');
   * console.log(shared.contentType);
   * ```
   * 
   * @public
   */
  async getShare(shareCode: string): Promise<SharedContent> {
    return this.sdk.request('GET', `/api/v1/share/${shareCode}`);
  }

  /**
   * Clone shared content to your library
   * 
   * @param shareCode - Share code
   * @returns Cloned content info
   * 
   * @example
   * ```typescript
   * const cloned = await sdk.gamification.cloneShare('abc123xy');
   * console.log(`Cloned ${cloned.type}: ${cloned.id}`);
   * ```
   * 
   * @public
   */
  async cloneShare(shareCode: string): Promise<{
    id: string;
    type: string;
  }> {
    return this.sdk.request('POST', `/api/v1/share/${shareCode}/clone`);
  }

  /**
   * Delete share
   * 
   * @param shareCode - Share code
   * 
   * @example
   * ```typescript
   * await sdk.gamification.deleteShare('abc123xy');
   * ```
   * 
   * @public
   */
  async deleteShare(shareCode: string): Promise<void> {
    await this.sdk.request('DELETE', `/api/v1/share/${shareCode}`);
  }

  /**
   * List user's shares
   * 
   * @returns Array of shares
   * 
   * @example
   * ```typescript
   * const shares = await sdk.gamification.listShares();
   * ```
   * 
   * @public
   */
  async listShares(): Promise<SharedContent[]> {
    return this.sdk.request('GET', '/api/v1/share/me/list');
  }
}

