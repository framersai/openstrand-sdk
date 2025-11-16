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

// Main client
export * from './client';

// Modules
export * from './modules/templates.module';
export * from './modules/factCheck.module';
export * from './modules/enrichment.module';
export * from './modules/plugins.module';
export * from './modules/wizard.module';
export * from './modules/dataIntelligence.module';
export * from './modules/ner';
export * from './modules/summarization';
export * from './modules/rag.module';
export * from './modules/cost.module';
export * from './modules/analytics.module';
export * from './modules/illustrations.module';
export * from './modules/learning.module';
export * from './modules/pomodoro.module';
export * from './modules/productivity.module';
export * from './modules/gamification.module';
export * from './modules/export.module';
export * from './storage';

// Explicitly export data intelligence types & functions for backend use
export {
  buildVocabularySummary,
  type DatasetAnalysisRequest,
  type DatasetAnalysisResult,
  type VocabularyDocument,
  type VocabularyOptions,
  type VocabularySummary,
  type VocabularyTerm,
  type EntityCandidate,
  type SchemaAnalysis,
  type SchemaAnalysisOptions,
} from './modules/dataIntelligence.module';

// Core types
export type {
  UserRole,
  UserPlan,
  AuthProvider,
  StrandType,
  Visibility,
  VisualizationTier,
  StrandLinkType,
  LinkProvenance,
  HierarchyScopeType,
  StructureRequestType,
  StructureRequestStatus,
  User,
  UserSession,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  MagicLinkRequest,
  MagicLinkVerify,
  Strand,
  StrandSummary,
  StrandRelationship,
  StrandLinkEdge,
  StrandLinkSummary,
  StrandHierarchyNode,
  StrandVisibilitySnapshot,
  StrandAccessPermission,
  StrandStructureRequest,
  StructureRequestPayload,
  CreateStrandRequest,
  UpdateStrandRequest,
  Collection,
  CreateCollectionRequest,
  WeaveNode,
  WeaveEdge,
  Weave,
  Visualization,
  VisualizationExportFormat,
  CreateVisualizationRequest,
  VisualizationTierInfo,
  ImportResult,
  ExportFormat,
  ExportOptions,
  SearchResult,
  SearchResponse,
  LeaderboardEntry,
  DatasetPreview,
  DatasetSchema,
  DatasetSummary,
  PaginatedResponse,
  PaginationOptions,
  ApiSuccess,
  ApiError,
  ApiResponse,
  SDKConfig,
} from './types';

// Errors
export * from './errors';

// Re-export main client as default
export { OpenStrandSDK as default } from './client';
