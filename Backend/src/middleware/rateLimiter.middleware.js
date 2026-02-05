import rateLimit from 'express-rate-limit';
import { ApiError } from '../utils/apiResponse.js';
import { ERROR_MESSAGES } from '../constants/index.js';

const isDev = process.env.NODE_ENV === 'development';

/**
 * General API rate limiter.
 * - Production: 500 requests per 15 minutes per IP (prevents scraping / DoS
 *   while easily accommodating legitimate multi-request page loads).
 * - Development: 2 000 requests per 15 minutes so React StrictMode
 *   double-invocation and rapid HMR reloads never hit the wall.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 2000 : 500,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    throw ApiError.tooManyRequests(ERROR_MESSAGES.RATE_LIMIT);
  },
});

/**
 * Sensitive auth limiter — applied only to login, register,
 * OAuth initiation.  Only FAILED attempts are counted so a
 * legitimate user who logs in successfully is never blocked.
 * - Production: 20 / 15 min
 * - Development: unlimited (skipped entirely)
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 0 : 20,     // 0 = unlimited in express-rate-limit v7
  skip: () => isDev,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    throw ApiError.tooManyRequests('Too many authentication attempts, please try again later.');
  },
});

/**
 * Password reset / forgot-password limiter.
 * - Production: 5 per hour per IP
 * - Development: skipped
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isDev ? 0 : 5,
  skip: () => isDev,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    throw ApiError.tooManyRequests('Too many password reset attempts, please try again later.');
  },
});

/**
 * Refresh-token limiter — intentionally very relaxed.
 * Token refresh happens automatically in the background on every
 * page load / socket reconnect.  Strict limiting here causes
 * cascading 429s across the whole app.
 * - Production: 120 / 15 min (8 per minute – plenty for any user)
 * - Development: skipped
 */
export const refreshTokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 0 : 120,
  skip: () => isDev,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    throw ApiError.tooManyRequests('Too many token refresh attempts.');
  },
});

// ============================================
// CHAT & MESSAGING RATE LIMITERS
// Prevent spam and abuse in real-time communication
// ============================================

/**
 * Message sending limiter — prevents message flooding.
 * - Production: 60 messages per minute per user
 * - Development: 200 per minute (relaxed for testing)
 */
export const messageSendLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isDev ? 200 : 60,
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    throw ApiError.tooManyRequests('Message rate limit exceeded. Please slow down.');
  },
});

/**
 * Conversation creation limiter — prevents spam conversation creation.
 * - Production: 10 new conversations per hour per user
 * - Development: 50 per hour
 */
export const conversationCreateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isDev ? 50 : 10,
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    throw ApiError.tooManyRequests('Too many conversations created. Please try again later.');
  },
});

/**
 * File upload limiter — prevents excessive media uploads.
 * - Production: 30 uploads per hour per user
 * - Development: 100 per hour
 */
export const chatUploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isDev ? 100 : 30,
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    throw ApiError.tooManyRequests('Upload limit exceeded. Please try again later.');
  },
});

/**
 * Report/block action limiter — prevents abuse of moderation features.
 * - Production: 10 reports/blocks per hour per user
 * - Development: skipped
 */
export const moderationActionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isDev ? 0 : 10,
  skip: () => isDev,
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    throw ApiError.tooManyRequests('Too many moderation actions. Please try again later.');
  },
});

/**
 * Video/audio call initiation limiter — prevents call spam.
 * - Production: 20 calls per hour per user
 * - Development: skipped
 */
export const callInitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isDev ? 0 : 20,
  skip: () => isDev,
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    throw ApiError.tooManyRequests('Too many call attempts. Please try again later.');
  },
});

/**
 * Admin login limiter — stricter than regular auth limiter.
 * - Production: 5 attempts per 15 min per IP
 * - Development: skipped
 */
export const adminAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 0 : 5,
  skip: () => isDev,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    // Log blocked attempts for security monitoring
    console.warn('[SECURITY] Admin login rate limit triggered', { ip: req.ip, email: req.body?.email });
    throw ApiError.tooManyRequests('Too many admin login attempts. Please try again in 15 minutes.');
  },
});
