import { ApiError } from '../utils/apiResponse.js';
import config from '../config/index.js';
import { getTranslation, DEFAULT_LANGUAGE } from './localization.middleware.js';

const isDatabaseUnavailableError = (err) => {
  if (!err) return false;

  const name = String(err.name || '');
  const message = String(err.message || '').toLowerCase();

  if (
    name === 'MongoServerSelectionError' ||
    name === 'MongooseServerSelectionError' ||
    name === 'MongoNetworkError' ||
    name === 'MongoNetworkTimeoutError'
  ) {
    return true;
  }

  return (
    message.includes('server selection timed out') ||
    message.includes('timed out after') ||
    message.includes('failed to connect to server') ||
    message.includes('enotfound') ||
    message.includes('econnrefused')
  );
};

/**
 * Global error handler middleware
 * Handles all errors and returns consistent responses
 */
export const errorHandler = (err, req, res, next) => {
  let error = err;
  const lang = req.lang || DEFAULT_LANGUAGE;
  const isDatabaseUnavailable = isDatabaseUnavailableError(err);

  // Log errors — downgrade expected auth/validation errors to avoid log spam
  const statusCode = isDatabaseUnavailable ? 503 : err.statusCode || err.status || 500;
  if (config.isDevelopment) {
    if (statusCode === 401 || statusCode === 403 || statusCode === 404 || statusCode === 400 || statusCode === 503) {
      // Operational client errors: warn-level only, no stack trace
      console.warn(`[${statusCode}] ${req.method} ${req.path} — ${err.message}`);
    } else {
      console.error('❌ Server Error:', {
        name: err.name,
        message: err.message,
        path: `${req.method} ${req.path}`,
        stack: err.stack,
      });
    }
  } else {
    // Production: only log unexpected 5xx errors
    if (!err.isOperational && statusCode >= 500) {
      console.error('❌ Unexpected Error:', {
        message: err.message,
        name: err.name,
        path: `${req.method} ${req.path}`,
      });
    }
  }

  if (isDatabaseUnavailable) {
    error = new ApiError(
      503,
      'Database is temporarily unavailable. Please try again shortly.',
    ).withCode('DATABASE_UNAVAILABLE');
  }

  // Handle Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    error = ApiError.badRequest(getTranslation(lang, 'common', 'badRequest'));
  }

  // Handle Mongoose ValidationError
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    error = ApiError.badRequest(getTranslation(lang, 'common', 'validationError'), messages);
  }

  // Handle MongoDB duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    error = ApiError.conflict(`${field} already exists`);
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = ApiError.unauthorized(getTranslation(lang, 'auth', 'tokenInvalid'));
  }

  if (err.name === 'TokenExpiredError') {
    error = ApiError.unauthorized(getTranslation(lang, 'auth', 'tokenExpired'));
  }

  const finalStatusCode = error.statusCode || 500;
  const message = error.message || getTranslation(lang, 'common', 'serverError');

  // Build response
  const response = {
    success: false,
    message: config.isProduction && finalStatusCode === 500
      ? 'An unexpected error occurred'
      : message,
    errors: error.errors || [],
    // Include application-level error code when present (e.g. 'PENDING_APPROVAL')
    ...(error.code ? { code: error.code } : {}),
  };

  // Only include stack trace in development for 5xx errors
  if (config.isDevelopment && err.stack && finalStatusCode >= 500) {
    response.stack = err.stack;
  }

  res.status(finalStatusCode).json(response);
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req, res, next) => {
  const lang = req.lang || DEFAULT_LANGUAGE;
  next(ApiError.notFound(getTranslation(lang, 'common', 'notFound')));
};
