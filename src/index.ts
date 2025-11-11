/**
 * @packageDocumentation
 * @fileoverview OpenStrand SDK - TypeScript Client Library
 * @module @framers/openstrand-sdk
 * @description
 * Official TypeScript SDK for OpenStrand Personal Knowledge Management System.
 * Provides type-safe client for interacting with OpenStrand backend APIs.
 * 
 * Supports both Community Edition (open source, self-hosted) and Team Edition
 * (enterprise features with RBAC and collaboration).
 * 
 * @example
 * ```typescript
 * import { OpenStrandSDK } from '@framers/openstrand-sdk';
 * 
 * const sdk = new OpenStrandSDK({
 *   apiUrl: 'http://localhost:8000',
 * });
 * 
 * // Authenticate
 * const { user, token } = await sdk.auth.login({
 *   username: 'demo_user',
 *   password: 'Demo123!'
 * });
 * 
 * // Create strand
 * const strand = await sdk.strands.create({
 *   type: 'document',
 *   title: 'My Notes',
 *   content: { markdown: '# Hello World' }
 * });
 * ```
 * 
 * @author Framers <team@frame.dev>
 * @license MIT
 * @since 1.0.0
 */

export * from './client';
export * from './types';
export * from './errors';

// Re-export main client as default
export { OpenStrandSDK as default } from './client';
