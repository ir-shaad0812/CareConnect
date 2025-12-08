/**
 * Standardized Error Types for CareConnect Frontend
 * Use these types instead of 'any' for type-safe error handling
 */

// ═══════════════════════════════════════════════════════════════════════════
// API Error Response Types
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Standard API error response from backend
 */
export interface ApiErrorResponse {
  success: false;
  message?: string;
  error?: string;
  errors?: ValidationError[];
  statusCode?: number;
  code?: string;
}

/**
 * Express-validator error format
 */
export interface ValidationError {
  msg: string;
  message?: string;
  param?: string;
  location?: string;
  value?: unknown;
}

/**
 * Nested API response (from axios/fetch interceptors)
 */
export interface NestedApiError {
  response?: {
    data?: ApiErrorResponse;
    status?: number;
    statusText?: string;
  };
  message?: string;
  code?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Authentication Error Types
// ═══════════════════════════════════════════════════════════════════════════

export interface AuthError {
  message: string;
  code?: 'INVALID_CREDENTIALS' | 'TOKEN_EXPIRED' | 'UNAUTHORIZED' | 'PENDING_APPROVAL' | 'ACCOUNT_PENDING' | 'ACCOUNT_SUSPENDED' | 'ACCOUNT_REJECTED' | 'ONBOARDING_REQUIRED';
  statusCode?: number;
}

export interface TokenError {
  message: string;
  code: 'TOKEN_EXPIRED' | 'INVALID_TOKEN' | 'TOKEN_REFRESH_FAILED';
}

// ═══════════════════════════════════════════════════════════════════════════
// Payment Error Types
// ═══════════════════════════════════════════════════════════════════════════

export interface PaymentError {
  message: string;
  code?: 'CARD_DECLINED' | 'INSUFFICIENT_FUNDS' | 'PAYMENT_FAILED' | 'INVALID_CARD';
  decline_code?: string;
  statusCode?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Network Error Types
// ═══════════════════════════════════════════════════════════════════════════

export interface NetworkError {
  message: string;
  code: 'NETWORK_ERROR' | 'TIMEOUT' | 'CONNECTION_FAILED';
  originalError?: Error;
}

// ═══════════════════════════════════════════════════════════════════════════
// Generic Application Error
// ═══════════════════════════════════════════════════════════════════════════

export interface AppError {
  message: string;
  code?: string;
  statusCode?: number;
  details?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════
// Type Guards
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if error is an API error response
 */
export function isApiErrorResponse(error: unknown): error is ApiErrorResponse {
  return (
    typeof error === 'object' &&
    error !== null &&
    'success' in error &&
    error.success === false
  );
}

/**
 * Check if error is a nested API error (from axios/fetch)
 */
export function isNestedApiError(error: unknown): error is NestedApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as NestedApiError).response === 'object'
  );
}

/**
 * Check if error has validation errors array
 */
export function hasValidationErrors(error: unknown): error is { errors: ValidationError[] } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'errors' in error &&
    Array.isArray((error as { errors: unknown }).errors)
  );
}

/**
 * Check if error is an auth error
 */
export function isAuthError(error: unknown): error is AuthError {
  if (typeof error !== 'object' || error === null) return false;
  const authError = error as AuthError;
  return (
    typeof authError.message === 'string' &&
    (authError.code === undefined ||
      ['INVALID_CREDENTIALS', 'TOKEN_EXPIRED', 'UNAUTHORIZED', 'PENDING_APPROVAL', 'ACCOUNT_PENDING', 'ACCOUNT_SUSPENDED', 'ACCOUNT_REJECTED'].includes(authError.code))
  );
}

/**
 * Check if error is a network error (TypeError from fetch)
 */
export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof TypeError || (typeof error === 'object' && error !== null && 'code' in error && (error as NetworkError).code === 'NETWORK_ERROR');
}

// ═══════════════════════════════════════════════════════════════════════════
// Error Extraction Utilities
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Extract a user-friendly error message from any error type
 * @param error - Any error object
 * @param fallback - Fallback message if extraction fails
 * @returns User-friendly error message
 */
export function extractErrorMessage(error: unknown, fallback = 'An unexpected error occurred'): string {
  // Standard Error object
  if (error instanceof Error) {
    return error.message;
  }

  // Nested API error (axios/fetch response)
  if (isNestedApiError(error)) {
    const data = error.response?.data;
    
    // Validation errors array
    if (hasValidationErrors(data)) {
      return data.errors.map(e => e.msg || e.message).filter(Boolean).join(', ');
    }
    
    // Single message
    if (data?.message) return data.message;
    if (data?.error) return data.error;
    
    // HTTP status text
    if (error.response?.statusText) return error.response.statusText;
  }

  // Direct API error response
  if (isApiErrorResponse(error)) {
    if (hasValidationErrors(error)) {
      return error.errors.map(e => e.msg || e.message).filter(Boolean).join(', ');
    }
    if (error.message) return error.message;
    if (error.error) return error.error;
  }

  // Object with message property
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const msg = (error as { message: unknown }).message;
    if (typeof msg === 'string') return msg;
  }

  // String error
  if (typeof error === 'string') {
    return error;
  }

  // Fallback
  return fallback;
}

/**
 * Extract validation errors as an array
 */
export function extractValidationErrors(error: unknown): string[] {
  if (isNestedApiError(error) && hasValidationErrors(error.response?.data)) {
    return error.response.data.errors.map(e => e.msg || e.message).filter((s): s is string => Boolean(s));
  }

  if (hasValidationErrors(error)) {
    return error.errors.map(e => e.msg || e.message).filter((s): s is string => Boolean(s));
  }

  return [];
}

/**
 * Extract HTTP status code from error
 */
export function extractStatusCode(error: unknown): number | undefined {
  if (isNestedApiError(error)) {
    return error.response?.status || error.response?.data?.statusCode;
  }

  if (isApiErrorResponse(error)) {
    return error.statusCode;
  }

  if (typeof error === 'object' && error !== null && 'statusCode' in error) {
    const code = (error as { statusCode: unknown }).statusCode;
    return typeof code === 'number' ? code : undefined;
  }

  return undefined;
}

/**
 * Check if error indicates pending admin approval
 */
export function isPendingApprovalError(error: unknown): boolean {
  const message = extractErrorMessage(error, '').toLowerCase();
  const code = typeof error === 'object' && error !== null && 'code' in error 
    ? (error as { code: unknown }).code 
    : undefined;

  return (
    code === 'ACCOUNT_PENDING' ||
    code === 'PENDING_APPROVAL' ||
    (message.includes('pending') && (message.includes('approval') || message.includes('verification')))
  );
}

/**
 * Check if error indicates rejected account lifecycle state.
 */
export function isRejectedAccountError(error: unknown): boolean {
  const message = extractErrorMessage(error, '').toLowerCase();
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? (error as { code: unknown }).code
    : undefined;

  return code === 'ACCOUNT_REJECTED' || (message.includes('rejected') && message.includes('register'));
}

/**
 * Check if error is due to expired/invalid token
 */
export function isTokenError(error: unknown): boolean {
  const message = extractErrorMessage(error, '').toLowerCase();
  const code = typeof error === 'object' && error !== null && 'code' in error 
    ? (error as { code: unknown }).code 
    : undefined;

  return (
    code === 'TOKEN_EXPIRED' ||
    code === 'INVALID_TOKEN' ||
    message.includes('token') && (message.includes('expired') || message.includes('invalid'))
  );
}

/**
 * Check if error indicates this account must sign in with Google OAuth.
 */
export function isGoogleLoginOnlyError(error: unknown): boolean {
  const message = extractErrorMessage(error, '').toLowerCase();
  return (
    message.includes('uses google login') ||
    (message.includes('google') && message.includes('sign in'))
  );
}
