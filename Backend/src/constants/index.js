/**
 * Application Constants
 * Centralized constant values for the application
 */

// User Roles
export const USER_ROLES = {
  CAREGIVER: 'caregiver',
  CARESEEKER: 'careseeker',
  ADMIN: 'admin',
};

// User Status (DB values — do not rename these, existing records use these strings)
export const USER_STATUS = {
  ONBOARDING: 'onboarding',           // OAuth new user — no role/profile yet
  PENDING: 'pending',                 // Manual register — email not yet verified
  PENDING_APPROVAL: 'pending_approval', // Profile complete, awaiting admin review
  ACTIVE: 'active',                   // Admin approved — full platform access
  SUSPENDED: 'suspended',             // Blocked by admin
  REJECTED: 'rejected',               // Rejected by admin
  DELETED: 'deleted',                 // Soft deleted

  // ── Semantic aliases (map to DB values) ──────────────────────────────
  // Use these in new code for cleaner intent signalling
  INCOMPLETE: 'onboarding',       // = ONBOARDING: profile not yet completed
  IN_REVIEW: 'pending_approval',  // = PENDING_APPROVAL: under admin review
  VERIFIED: 'active',             // = ACTIVE: fully verified
  BLOCKED: 'suspended',           // = SUSPENDED: access denied
};

// Document Types
export const DOCUMENT_TYPES = {
  ID_PROOF: 'id_proof',
  ADDRESS_PROOF: 'address_proof',
  CERTIFICATION: 'certification',
  BACKGROUND_CHECK: 'background_check',
};

// Document Status
export const DOCUMENT_STATUS = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
};

// Gender Options
export const GENDER = {
  MALE: 'male',
  FEMALE: 'female',
  OTHER: 'other',
  PREFER_NOT_TO_SAY: 'prefer_not_to_say',
};

// Auth Providers  (Facebook removed)
export const AUTH_PROVIDERS = {
  LOCAL: 'local',
  GOOGLE: 'google',
};

// Token Types
export const TOKEN_TYPES = {
  ACCESS: 'access',
  REFRESH: 'refresh',
  EMAIL_VERIFICATION: 'email_verification',
  PASSWORD_RESET: 'password_reset',
};

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
};

// Error Messages
export const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid email or password',
  USER_NOT_FOUND: 'User not found',
  USER_EXISTS: 'User with this email already exists',
  EMAIL_NOT_VERIFIED: 'Please verify your email before logging in',
  ACCOUNT_SUSPENDED: 'Your account has been suspended',
  ACCOUNT_DELETED: 'This account has been deleted',
  INVALID_TOKEN: 'Invalid or expired token',
  TOKEN_EXPIRED: 'Token has expired',
  UNAUTHORIZED: 'You are not authorized to perform this action',
  FORBIDDEN: 'Access forbidden',
  VALIDATION_ERROR: 'Validation failed',
  PASSWORDS_NOT_MATCH: 'Passwords do not match',
  WEAK_PASSWORD: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
  INVALID_EMAIL: 'Please provide a valid email address',
  SERVER_ERROR: 'Internal server error',
  NOT_FOUND: 'Resource not found',
  RATE_LIMIT: 'Too many requests, please try again later',
};

// Success Messages
export const SUCCESS_MESSAGES = {
  REGISTRATION_SUCCESS: 'Registration successful. Please check your email to verify your account.',
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logged out successfully',
  EMAIL_VERIFIED: 'Email verified successfully',
  PASSWORD_RESET_SENT: 'Password reset link sent to your email',
  PASSWORD_RESET_SUCCESS: 'Password reset successful',
  PROFILE_UPDATED: 'Profile updated successfully',
  DOCUMENT_UPLOADED: 'Document uploaded successfully',
};

// Service Types
export const SERVICE_TYPES = {
  ELDERLY_CARE: 'elderly_care',
  CHILD_CARE: 'child_care',
  SPECIAL_NEEDS: 'special_needs',
  DISABILITY_CARE: 'disability_care',
  POST_SURGERY: 'post_surgery',
  COMPANIONSHIP: 'companionship',
  RESPITE_CARE: 'respite_care',
  PALLIATIVE_CARE: 'palliative_care',
};

// Work Preferences
export const WORK_PREFERENCES = {
  LIVE_IN: 'live_in',
  LIVE_OUT: 'live_out',
  PART_TIME: 'part_time',
  FULL_TIME: 'full_time',
  OVERNIGHT: 'overnight',
  WEEKENDS: 'weekends',
  HOLIDAYS: 'holidays',
};

// Background Check Status
export const BACKGROUND_CHECK_STATUS = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  PASSED: 'passed',
  FAILED: 'failed',
  EXPIRED: 'expired',
};

// Rate Types
export const RATE_TYPES = {
  HOURLY: 'hourly',
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
};

// Export location and trust constants
export * from './location.constants.js';
