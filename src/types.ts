/**
 * @fileoverview SDK Type Definitions
 * @module @framers/openstrand-sdk/types
 * @description
 * Shared type definitions for OpenStrand SDK.
 * These types match the backend API responses and requests.
 */

// ============================================================================
// Core Types
// ============================================================================

/**
 * User role in the system
 */
export type UserRole = 'admin' | 'editor' | 'viewer' | 'guest';

/**
 * User subscription plan
 */
export type UserPlan = 'free' | 'pro' | 'team' | 'enterprise';

/**
 * Authentication provider
 */
export type AuthProvider = 'local' | 'google' | 'github' | 'supabase' | 'magic_link';

/**
 * Strand type
 */
export type StrandType = 'document' | 'note' | 'dataset' | 'code' | 'media' | 'visualization' | 'exercise' | 'flashcard';

/**
 * Content visibility level
 */
export type Visibility = 'private' | 'public' | 'unlisted' | 'team';

/**
 * Visualization tier
 */
export type VisualizationTier = 1 | 2 | 3;

/**
 * Link classification between strands.
 */
export type StrandLinkType = 'STRUCTURAL' | 'CONCEPTUAL' | 'PLACEHOLDER' | 'REFERENCE' | 'DERIVED';

/**
 * Provenance metadata describing how a link or hierarchy entry was created.
 */
export type LinkProvenance = 'USER' | 'SYSTEM' | 'MIGRATION' | 'IMPORT';

/**
 * Supported hierarchy scope classifications.
 */
export type HierarchyScopeType = 'COLLECTION' | 'DATASET' | 'PROJECT' | 'TEAM' | 'GLOBAL';

/**
 * Structure request action types.
 */
export type StructureRequestType = 'ADD_CHILD' | 'REORDER' | 'REATTACH' | 'REPLACE_PLACEHOLDER' | 'REMOVE_LINK';

/**
 * Structure request lifecycle status values.
 */
export type StructureRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

// ============================================================================
// User Types
// ============================================================================

/**
 * User account
 */
export interface User {
  id: string;
  username: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  role: UserRole;
  plan: UserPlan;
  authProvider: AuthProvider;
  emailVerified: Date | null;
  created: Date;
  updated: Date;
  preferences?: Record<string, any>;
}

/**
 * User session
 */
export interface UserSession {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  created: Date;
}

// ============================================================================
// Authentication Types
// ============================================================================

/**
 * Login request
 */
export interface LoginRequest {
  username?: string;
  email?: string;
  password: string;
}

/**
 * Registration request
 */
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  displayName?: string;
}

/**
 * Authentication response
 */
export interface AuthResponse {
  user: User;
  token: string;
}

/**
 * Magic link request
 */
export interface MagicLinkRequest {
  email: string;
}

/**
 * Magic link verify
 */
export interface MagicLinkVerify {
  token: string;
}

// ============================================================================
// Strand Types
// ============================================================================

/**
 * Core strand entity returned by the OpenStrand API. Represents a single piece of content
 * with both conceptual and structural metadata.
 */
export interface Strand {
  id: string;
  strandType: StrandType;
  /**
   * Legacy alias preserved for backwards compatibility. Mirrors `strandType`.
   */
  type?: StrandType;
  classification?: string;
  noteType?: string;
  title: string;
  slug: string;
  summary?: string;
  content?: any;
  metadata?: Record<string, any>;
  contentType?: string;
  tags?: string[];
  visibility: Visibility;
  placeholderBehavior?: string;
  ownerId?: string;
  createdBy?: string;
  updatedBy?: string;
  teamId?: string;
  primaryScopeId?: string;
  coAuthorIds?: string[];
  learningObjectives?: string[];
  difficulty?: string;
  prerequisites?: Array<{ id: string; level: string }>;
  analysisStatus?: string;
  analysisProvider?: string;
  documentAnalysis?: any;
  mediaAnalysis?: any;
  analysisNotes?: string[];
  derivatives?: string[];
  created: Date;
  updated: Date;
  /**
   * Legacy alias for `updated` maintained for compatibility with older clients.
   */
  modified?: Date;
  qualityScore?: number;
  qualityConfidence?: number;
  llmRating?: number;
  humanRatings?: Record<string, number>;
  contentHash?: string;
  perceptualHash?: string;
  fileSize?: number;
  relationships?: StrandRelationship[];
  links?: StrandLinkSummary;
  hierarchy?: StrandHierarchyNode[];
  visibilityState?: StrandVisibilitySnapshot[];
  permissions?: StrandAccessPermission[];
  structureRequests?: StrandStructureRequest[];
}

/**
 * High-level summary returned alongside conceptual links.
 */
export interface StrandSummary {
  id: string;
  title: string;
  slug: string;
  strandType: StrandType;
}

export interface StrandRelationship {
  targetId: string;
  type: string;
  weight?: number;
  scopeId?: string;
  provenance?: LinkProvenance;
  justification?: string;
  metadata?: Record<string, any>;
}

export interface StrandLinkEdge {
  strandId: string;
  scopeId?: string;
  provenance: LinkProvenance;
  weight: number;
  summary?: StrandSummary;
}

export interface StrandLinkSummary {
  outgoing: Array<StrandRelationship & { target?: StrandSummary }>;
  incoming: Array<StrandRelationship & { target?: StrandSummary }>;
  structural: {
    parents: StrandLinkEdge[];
    children: StrandLinkEdge[];
  };
}

export interface StrandHierarchyNode {
  scopeId: string;
  parentId?: string;
  depth: number;
  position: number;
  path: string;
  isPrimary: boolean;
  scope?: { id: string; name: string; scopeType: string };
}

export interface StrandVisibilitySnapshot {
  scopeId: string;
  audience: string;
  isVisible: boolean;
  isPlaceholder: boolean;
  inheritedFrom?: string;
}

export interface StrandAccessPermission {
  id: string;
  principalType: string;
  principalId: string;
  role: string;
  permissions: string[];
  grantedBy?: string;
  grantedAt: Date;
  expiresAt?: Date;
  metadata: Record<string, any>;
}

export interface StrandStructureRequest {
  id: string;
  scopeId: string;
  strandId: string;
  parentId?: string;
  requestedBy: string;
  reviewedBy?: string;
  type: StructureRequestType;
  status: StructureRequestStatus;
  payload: Record<string, any>;
  justification?: string;
  resolutionNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StructureRequestPayload {
  scopeId: string;
  type: StructureRequestType;
  targetId?: string;
  parentId?: string;
  position?: number;
  metadata?: Record<string, any>;
  justification?: string;
}

/**
 * Request payload used when creating a strand.
 */
export interface CreateStrandRequest {
  type: StrandType;
  classification?: string;
  title: string;
  summary?: string;
  content?: any;
  contentType?: string;
  metadata?: Record<string, any>;
  learningObjectives?: string[];
  difficulty?: string;
  prerequisites?: Array<{ id: string; level: string }>;
  visibility?: Visibility;
  noteType?: string;
  teamId?: string;
  scopeId?: string;
  parentId?: string;
  position?: number;
  coAuthorIds?: string[];
  placeholderBehavior?: string;
  relationships?: StrandRelationship[];
}

/**
 * Request payload used when updating a strand.
 */
export interface UpdateStrandRequest {
  title?: string;
  classification?: string;
  summary?: string;
  content?: any;
  contentType?: string;
  metadata?: Record<string, any>;
  learningObjectives?: string[];
  difficulty?: string;
  prerequisites?: Array<{ id: string; level: string }>;
  visibility?: Visibility;
  noteType?: string;
  teamId?: string;
  scopeId?: string;
  parentId?: string;
  position?: number;
  coAuthorIds?: string[];
  placeholderBehavior?: string;
  relationships?: StrandRelationship[];
}

// ============================================================================
// Collection Types
// ============================================================================

/**
 * Collection of strands
 */
export interface Collection {
  id: string;
  name: string;
  slug: string;
  description?: string;
  ownerId: string;
  visibility: Visibility;
  metadata?: Record<string, any>;
  created: Date;
  updated: Date;
}

/**
 * Create collection request
 */
export interface CreateCollectionRequest {
  name: string;
  description?: string;
  visibility?: Visibility;
  metadata?: Record<string, any>;
}

// ============================================================================
// Weave (Knowledge Graph) Types
// ============================================================================

export interface WeaveNode {
  id: string;
  strandId: string;
  position?: { x: number; y: number; z?: number };
  metadata?: Record<string, any>;
}

/**
 * Weave edge (relationship)
 */
export interface WeaveEdge {
  source: string;
  target: string;
  type: string;
  weight?: number;
  metadata?: Record<string, any>;
  note?: string;
  createdBy?: string;
}

/**
 * Weave graph
 */
export interface Weave {
  id: string;
  name: string;
  domain?: string;
  description?: string;
  nodes: WeaveNode[];
  edges: WeaveEdge[];
  metadata: Record<string, any>;
  nodeCount: number;
  edgeCount: number;
  depth: number;
  created: Date;
  modified: Date;
}

// ============================================================================
// Visualization Types
// ============================================================================

/**
 * Visualization
 */
export interface Visualization {
  id: string;
  type: 'chart' | 'd3' | 'three' | 'custom';
  tier: VisualizationTier;
  config: any;
  datasetId?: string;
  ownerId: string;
  created: Date;
}

/**
 * Supported export formats for visualizations.
 */
export type VisualizationExportFormat = 'png' | 'svg' | 'json';

/**
 * Create visualization request
 */
export interface CreateVisualizationRequest {
  prompt: string;
  datasetId?: string;
  tier?: VisualizationTier;
  options?: Record<string, any>;
}

/**
 * Tier information for visualization capabilities.
 * Mirrors `/api/v1/visualizations/tier-info` response.
 */
export interface VisualizationTierInfo {
  tiers: Array<{
    level: 1 | 2 | 3;
    name: string;
    description: string;
    features: string[];
    available: boolean;
    requirements?: string;
  }>;
}

// ============================================================================
// Import/Export Types
// ============================================================================

/**
 * Import result
 */
export interface ImportResult {
  success: boolean;
  strandId?: string;
  error?: string;
  warnings?: string[];
  metadata?: Record<string, any>;
  isDuplicate?: boolean;
  originalId?: string;
}

/**
 * Export format
 */
export type ExportFormat = 'pdf' | 'docx' | 'markdown' | 'html' | 'text' | 'json' | 'csv' | 'xml' | 'graphml' | 'zip';

/**
 * Export options
 */
export interface ExportOptions {
  format: ExportFormat;
  includeMetadata?: boolean;
  includeAttachments?: boolean;
  includeRelationships?: boolean;
  style?: {
    fontSize?: number;
    includeToc?: boolean;
    pageSize?: 'A4' | 'Letter' | 'Legal';
  };
}

// ============================================================================
// Search Types
// ============================================================================

/**
 * Search result
 */
export interface SearchResult {
  id: string;
  title: string;
  snippet: string;
  score: number;
  type: StrandType;
}

/**
 * Search response
 */
export interface SearchResponse {
  items: SearchResult[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Leaderboard entry (featured content ranking).
 */
export interface LeaderboardEntry {
  targetId: string;
  datasetId?: string;
  label: string;
  likes: number;
  dislikes: number;
  favorites: number;
  score: number;
}

// ============================================================================
// Data / Datasets Types
// ============================================================================

export interface DatasetPreview {
  rows: Array<Record<string, unknown>>;
}

export interface DatasetSchema {
  columns: Array<{
    name: string;
    type: string;
    semanticTags?: string[];
    stats?: Record<string, unknown>;
  }>;
}

export interface DatasetSummary {
  datasetId: string;
  generatedAt: string;
  rowCount: number;
  columnCount: number;
  columns: Array<{
    name: string;
    type: string;
    sampleValues: unknown[];
    stats?: Record<string, unknown>;
    semanticTags?: string[];
  }>;
  notes?: string | null;
}

// ============================================================================
// Pagination Types
// ============================================================================

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  page?: number;
  pageSize?: number;
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Successful API response
 */
export interface ApiSuccess<T> {
  success: true;
  data: T;
}

/**
 * Error API response
 */
export interface ApiError {
  success: false;
  error: string;
  code?: string;
  details?: any;
}

/**
 * Generic API response
 */
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ============================================================================
// SDK Configuration
// ============================================================================

/**
 * SDK configuration options
 */
export interface SDKConfig {
  /** Backend API base URL */
  apiUrl: string;
  
  /** Authentication token */
  token?: string;

  /** API key for x-api-key auth (takes precedence over token) */
  apiKey?: string;
  
  /** Request timeout in milliseconds */
  timeout?: number;
  
  /** Custom headers to include in requests */
  headers?: Record<string, string>;
  
  /** Enable debug logging */
  debug?: boolean;
  
  /** Retry configuration */
  retry?: {
    enabled?: boolean;
    maxRetries?: number;
    retryDelay?: number;
  };
}
