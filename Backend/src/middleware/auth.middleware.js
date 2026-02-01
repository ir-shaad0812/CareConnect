import { ApiError } from '../utils/apiResponse.js';
import { verifyAccessToken } from '../utils/tokenUtils.js';
import User from '../models/user.model.js';
import { ERROR_MESSAGES, USER_STATUS, TOKEN_TYPES } from '../constants/index.js';
import { getCachedUser, setCachedUser } from '../utils/userCache.js';

/**
 * Authentication middleware - Verifies JWT access token
 * CRITICAL: Only accepts ACCESS tokens, not refresh tokens
 */
export const authenticate = async (req, res, next) => {
  try {
    let token = null;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    // Fallback to cookie (only for web clients)
    if (!token && req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      throw ApiError.unauthorized(ERROR_MESSAGES.UNAUTHORIZED);
    }

    // Verify token and check type
    const decoded = verifyAccessToken(token);
    if (!decoded) {
      throw ApiError.unauthorized(ERROR_MESSAGES.INVALID_TOKEN);
    }

    // CRITICAL: Validate token type
    if (decoded.type !== TOKEN_TYPES.ACCESS) {
      throw ApiError.unauthorized('Invalid token type');
    }

    // Validate user ID exists in token
    if (!decoded.userId) {
      throw ApiError.unauthorized('Invalid token payload');
    }

    // Fetch user — check 1-minute in-memory cache first to reduce DB load
    let user = getCachedUser(decoded.userId);
    if (!user) {
      user = await User.findById(decoded.userId).lean();
      if (!user) {
        throw ApiError.unauthorized(ERROR_MESSAGES.USER_NOT_FOUND);
      }
      setCachedUser(decoded.userId, user);
    }

    // Check user status — only hard-block terminated accounts here.
    // pending_approval users must still reach /api/auth/me and read-only
    // endpoints so they can see the "waiting for approval" screen.
    // Business-sensitive actions (booking, payment, chat) enforce ACTIVE
    // status via the requireActive middleware on their routes.
    if (user.status === USER_STATUS.SUSPENDED) {
      throw ApiError.forbidden(ERROR_MESSAGES.ACCOUNT_SUSPENDED);
    }

    if (user.status === USER_STATUS.DELETED) {
      throw ApiError.forbidden(ERROR_MESSAGES.ACCOUNT_DELETED);
    }

    // Attach user to request (without password)
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional authentication - Continues even if no token
 */
export const optionalAuth = async (req, res, next) => {
  try {
    let token = null;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token && req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (token) {
      const decoded = verifyAccessToken(token);
      if (decoded) {
        const user = await User.findById(decoded.userId);
        if (user && user.status === USER_STATUS.ACTIVE) {
          req.user = user;
        }
      }
    }

    next();
  } catch (error) {
    // Token errors are expected for unauthenticated users — continue without user
    if (
      error.name === 'JsonWebTokenError' ||
      error.name === 'TokenExpiredError' ||
      error.status === 401
    ) {
      return next();
    }
    // Real errors (DB connection, etc.) should propagate
    next(error);
  }
};

/**
 * Require ACTIVE status — use this on routes that need full account approval
 * (booking, payments, chat). Must come AFTER authenticate.
 */
export const requireActive = (req, res, next) => {
  if (!req.user) {
    return next(ApiError.unauthorized(ERROR_MESSAGES.UNAUTHORIZED));
  }
  if (req.user.status !== USER_STATUS.ACTIVE) {
    return next(ApiError.forbidden('Your account must be active to perform this action. Please wait for admin approval.'));
  }
  next();
};

/**
 * Role-Based Access Control middleware
 */
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized(ERROR_MESSAGES.UNAUTHORIZED));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(ApiError.forbidden(ERROR_MESSAGES.FORBIDDEN));
    }

    next();
  };
};
