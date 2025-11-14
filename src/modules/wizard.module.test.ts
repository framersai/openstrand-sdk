/**
 * Wizard Module Tests
 * 
 * @module modules/wizard.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenStrandSDK } from '../client';
import { WizardModule } from './wizard.module';

describe('WizardModule', () => {
  let sdk: OpenStrandSDK;
  let wizardModule: WizardModule;

  beforeEach(() => {
    sdk = new OpenStrandSDK({
      baseUrl: 'http://localhost:8000',
      token: 'test-token',
    });
    wizardModule = sdk.wizard;

    global.fetch = vi.fn();
  });

  describe('createSession', () => {
    it('should create wizard session with defaults', async () => {
      const mockSession = {
        id: 'session-123',
        type: 'onboarding',
        currentStep: 0,
        totalSteps: 5,
        status: 'in_progress',
        created: '2025-01-01T00:00:00Z',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockSession,
      });

      const result = await wizardModule.createSession();

      expect(result).toEqual(mockSession);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/wizard/session',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should create wizard session with custom options', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ id: 'session-123' }),
      });

      await wizardModule.createSession({
        type: 'template-setup',
        templateId: 'storytelling',
        totalSteps: 3,
      });

      const callBody = JSON.parse((global.fetch as any).mock.calls[0][1].body);
      expect(callBody).toEqual({
        type: 'template-setup',
        templateId: 'storytelling',
        totalSteps: 3,
      });
    });
  });

  describe('getSession', () => {
    it('should get wizard session by ID', async () => {
      const mockSession = {
        id: 'session-123',
        userId: 'user-1',
        type: 'onboarding',
        currentStep: 2,
        totalSteps: 5,
        templateId: 'storytelling',
        data: { step1: 'complete' },
        status: 'in_progress',
        created: '2025-01-01T00:00:00Z',
        updated: '2025-01-01T00:05:00Z',
        completed: null,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSession,
      });

      const result = await wizardModule.getSession('session-123');

      expect(result).toEqual(mockSession);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/wizard/session/session-123',
        expect.any(Object)
      );
    });

    it('should throw error when session not found', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'NOT_FOUND' }),
      });

      await expect(wizardModule.getSession('999')).rejects.toThrow();
    });
  });

  describe('updateSession', () => {
    it('should update current step', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Wizard session updated successfully' }),
      });

      const result = await wizardModule.updateSession('session-123', {
        currentStep: 3,
      });

      expect(result.message).toBe('Wizard session updated successfully');
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/wizard/session/session-123',
        expect.objectContaining({
          method: 'PUT',
        })
      );
    });

    it('should update wizard data', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Updated' }),
      });

      await wizardModule.updateSession('session-123', {
        data: { templateId: 'storytelling', projectName: 'My Novel' },
      });

      const callBody = JSON.parse((global.fetch as any).mock.calls[0][1].body);
      expect(callBody.data).toEqual({
        templateId: 'storytelling',
        projectName: 'My Novel',
      });
    });

    it('should complete session', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Updated' }),
      });

      await wizardModule.updateSession('session-123', {
        status: 'completed',
      });

      const callBody = JSON.parse((global.fetch as any).mock.calls[0][1].body);
      expect(callBody.status).toBe('completed');
    });
  });

  describe('listSessions', () => {
    it('should list user wizard sessions', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          type: 'onboarding',
          currentStep: 3,
          totalSteps: 5,
          status: 'in_progress',
          created: '2025-01-01T00:00:00Z',
          updated: '2025-01-01T00:05:00Z',
          completed: null,
        },
        {
          id: 'session-2',
          type: 'template-setup',
          currentStep: 5,
          totalSteps: 5,
          status: 'completed',
          created: '2025-01-01T00:00:00Z',
          updated: '2025-01-01T00:10:00Z',
          completed: '2025-01-01T00:10:00Z',
        },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSessions,
      });

      const result = await wizardModule.listSessions();

      expect(result).toEqual(mockSessions);
      expect(result).toHaveLength(2);
    });
  });
});

