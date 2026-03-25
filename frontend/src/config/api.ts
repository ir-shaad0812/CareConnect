// ============================================
// API CONFIGURATION
// ============================================

import { env } from './env';

export const API_CONFIG = {
  BASE_URL: env.API_URL,
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
} as const;

export const AUTH_CONFIG = {
  TOKEN_KEY: 'careconnect_token',
  REFRESH_TOKEN_KEY: 'careconnect_refresh_token',
  USER_KEY: 'careconnect_user',
  TOKEN_EXPIRY_BUFFER: 60,
} as const;

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
} as const;
