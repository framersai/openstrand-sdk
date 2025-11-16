/**
 * @fileoverview Tests for GamificationModule
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OpenStrandSDK } from '../client';

describe('GamificationModule', () => {
  let sdk: OpenStrandSDK;

  beforeEach(() => {
    sdk = new OpenStrandSDK({
      baseUrl: 'http://localhost:8000',
      token: 'test-token',
    });
    global.fetch = vi.fn();
  });

  describe('Badge Methods', () => {
    it('should list badges', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { id: '1', name: 'First Steps', earned: false },
          { id: '2', name: 'Week Warrior', earned: true },
        ],
      });

      const badges = await sdk.gamification.listBadges();
      expect(badges).toHaveLength(2);
    });

    it('should get user badges', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { id: '1', name: 'Week Warrior', earnedAt: '2024-01-01' },
        ],
      });

      const earned = await sdk.gamification.getUserBadges();
      expect(earned).toHaveLength(1);
    });
  });

  describe('Leaderboard Methods', () => {
    it('should get leaderboard', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { rank: 1, score: 500 },
          { rank: 2, score: 400 },
        ],
      });

      const leaderboard = await sdk.gamification.getLeaderboard('team-123');
      expect(leaderboard).toHaveLength(2);
    });
  });

  describe('Sharing Methods', () => {
    it('should create share', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          shareCode: 'abc123xy',
          shareUrl: 'http://localhost:3000/share/abc123xy',
          qrCodeUrl: 'data:image/png;base64,...',
        }),
      });

      const share = await sdk.gamification.createShare({
        contentId: 'quiz-123',
        contentType: 'quiz',
      });

      expect(share.shareCode).toBe('abc123xy');
      expect(share.qrCodeUrl).toBeDefined();
    });
  });
});

