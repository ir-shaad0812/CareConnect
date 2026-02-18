import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import config from '../config/index.js';
import { TOKEN_TYPES } from '../constants/index.js';

/**
 * Generate JWT Access Token
 */
export const generateAccessToken = (userId, role) => {
  return jwt.sign(
    { userId, role, type: TOKEN_TYPES.ACCESS },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpiresIn }
  );
};

/**
 * Generate JWT Refresh Token
 */
export const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId, type: TOKEN_TYPES.REFRESH },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn }
  );
};

/**
 * Verify Access Token
 */
export const verifyAccessToken = (token) => {
  try {
    const decoded = jwt.verify(token, config.jwt.accessSecret);
    if (decoded.type !== TOKEN_TYPES.ACCESS) {
      throw new Error('Invalid token type');
    }
    return decoded;
  } catch (error) {
    return null;
  }
};

/**
 * Verify Refresh Token
 */
export const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, config.jwt.refreshSecret);
    if (decoded.type !== TOKEN_TYPES.REFRESH) {
      throw new Error('Invalid token type');
    }
    return decoded;
  } catch (error) {
    return null;
  }
};

/**
 * Generate random token for email verification or password reset
 */
export const generateRandomToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Hash a token for secure storage
 */
export const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Generate token pair (access + refresh)
 */
export const generateTokenPair = (userId, role) => {
  return {
    accessToken: generateAccessToken(userId, role),
    refreshToken: generateRefreshToken(userId),
  };
};

/**
 * Set auth cookies
 */
export const setAuthCookies = (res, accessToken, refreshToken) => {
  const isProduction = config.nodeEnv === 'production';
  const refreshCookiePath = '/api/auth';
  
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 15 * 60 * 1000,
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: refreshCookiePath,
  });
};

/**
 * Clear auth cookies
 */
export const clearAuthCookies = (res) => {
  res.clearCookie('accessToken');

  // Clear current and legacy refresh cookie paths for backward compatibility.
  res.clearCookie('refreshToken', { path: '/api/auth' });
  res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
};
