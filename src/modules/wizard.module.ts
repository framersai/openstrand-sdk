/**
 * Wizard Module
 * 
 * Client wrapper for /api/wizard endpoints
 * 
 * @module modules/wizard
 * 
 * @example
 * ```typescript
 * // Create wizard session
 * const session = await sdk.wizard.createSession({
 *   type: 'onboarding',
 *   totalSteps: 5,
 * });
 * 
 * // Update progress
 * await sdk.wizard.updateSession(session.id, {
 *   currentStep: 2,
 *   data: { templateId: 'storytelling' },
 * });
 * 
 * // Get session
 * const current = await sdk.wizard.getSession(session.id);
 * ```
 */

import type { OpenStrandSDK } from '../client';

/**
 * Wizard session type
 */
export type WizardType = 'onboarding' | 'template-setup' | 'project-import';

/**
 * Wizard session status
 */
export type WizardStatus = 'in_progress' | 'completed' | 'abandoned';

/**
 * Wizard session
 */
export interface WizardSession {
  /** Session ID */
  id: string;
  /** User ID */
  userId: string;
  /** Wizard type */
  type: WizardType;
  /** Current step (0-indexed) */
  currentStep: number;
  /** Total steps */
  totalSteps: number;
  /** Selected template ID (if applicable) */
  templateId?: string;
  /** Wizard data (user selections) */
  data: Record<string, unknown>;
  /** Session status */
  status: WizardStatus;
  /** Created timestamp */
  created: string;
  /** Updated timestamp */
  updated: string;
  /** Completed timestamp */
  completed?: string;
}

/**
 * Create wizard session options
 */
export interface CreateWizardSessionOptions {
  /** Wizard type */
  type?: WizardType;
  /** Template ID (if template-setup type) */
  templateId?: string;
  /** Total steps */
  totalSteps?: number;
}

/**
 * Update wizard session options
 */
export interface UpdateWizardSessionOptions {
  /** Current step */
  currentStep?: number;
  /** Template ID */
  templateId?: string;
  /** Wizard data updates */
  data?: Record<string, unknown>;
  /** Session status */
  status?: WizardStatus;
}

/**
 * Wizard Module
 * 
 * Manages onboarding wizard sessions with progress tracking and resumption.
 */
export class WizardModule {
  /**
   * Creates a WizardModule instance
   * 
   * @param sdk - OpenStrand SDK instance
   */
  constructor(private sdk: OpenStrandSDK) {}

  /**
   * Create a new wizard session
   * 
   * @param options - Session creation options
   * @returns Created session
   * 
   * @example
   * ```typescript
   * const session = await sdk.wizard.createSession({
   *   type: 'onboarding',
   *   totalSteps: 5,
   * });
   * ```
   */
  async createSession(options: CreateWizardSessionOptions = {}): Promise<Omit<WizardSession, 'userId' | 'data'>> {
    return this.sdk.request('POST', '/api/wizard/session', {
      body: options,
    });
  }

  /**
   * Get wizard session by ID
   * 
   * @param id - Session ID
   * @returns Wizard session
   * 
   * @example
   * ```typescript
   * const session = await sdk.wizard.getSession('session-123');
   * console.log(`Step ${session.currentStep} of ${session.totalSteps}`);
   * ```
   */
  async getSession(id: string): Promise<WizardSession> {
    return this.sdk.request('GET', `/api/wizard/session/${id}`);
  }

  /**
   * Update wizard session
   * 
   * @param id - Session ID
   * @param options - Update options
   * @returns Success message
   * 
   * @example
   * ```typescript
   * // Advance to next step
   * await sdk.wizard.updateSession(sessionId, {
   *   currentStep: 3,
   *   data: { selectedTemplate: 'storytelling' },
   * });
   * 
   * // Complete wizard
   * await sdk.wizard.updateSession(sessionId, {
   *   status: 'completed',
   * });
   * ```
   */
  async updateSession(id: string, options: UpdateWizardSessionOptions): Promise<{ message: string }> {
    return this.sdk.request('PUT', `/api/wizard/session/${id}`, {
      body: options,
    });
  }

  /**
   * List user's wizard sessions
   * 
   * @returns Array of wizard sessions
   * 
   * @example
   * ```typescript
   * const sessions = await sdk.wizard.listSessions();
   * const inProgress = sessions.filter(s => s.status === 'in_progress');
   * ```
   */
  async listSessions(): Promise<Omit<WizardSession, 'userId' | 'data'>[]> {
    return this.sdk.request('GET', '/api/wizard/sessions');
  }
}

