/**
 * @fileoverview SDK Error Classes
 * @module @openstrand/sdk/errors
 */

/**
 * Base error class for all SDK errors
 */
export class OpenStrandError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'OpenStrandError';
  }
}

/**
 * Authentication error (401)
 */
export class AuthenticationError extends OpenStrandError {
  constructor(message: string = 'Authentication failed') {
    super(message, 'AUTHENTICATION_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization error (403)
 */
export class AuthorizationError extends OpenStrandError {
  constructor(message: string = 'Access denied') {
    super(message, 'AUTHORIZATION_ERROR', 403);
    this.name = 'AuthorizationError';
  }
}

/**
 * Not found error (404)
 */
export class NotFoundError extends OpenStrandError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends OpenStrandError {
  constructor(
    message: string,
    public errors?: Record<string, string[]>
  ) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

/**
 * Network error
 */
export class NetworkError extends OpenStrandError {
  constructor(message: string = 'Network request failed') {
    super(message, 'NETWORK_ERROR');
    this.name = 'NetworkError';
  }
}
