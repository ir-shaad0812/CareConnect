import { HTTP_STATUS } from "../constants/index.js";

/**
 * Custom API Error class for handling application errors
 */
export class ApiError extends Error {
  constructor(statusCode, message, errors = [], isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = isOperational;
    this.success = false;

    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Attach a machine-readable error code to an existing ApiError instance.
   * Enables callers to do: throw ApiError.badRequest('...').withCode('MY_CODE')
   *
   * @param {string} code - e.g. 'BOOKING_REQUEST_PENDING'
   * @returns {ApiError} this (for fluent chaining)
   */
  withCode(code) {
    this.code = code;
    return this;
  }

  // ── Static factory methods ────────────────────────────────────────────────

  /**
   * 400 Bad Request
   * @param {string} message
   * @param {Array}  errors  - Optional validation error details
   * @param {string} [code]  - Optional machine-readable error code
   */
  static badRequest(message, errors = [], code = null) {
    const err = new ApiError(HTTP_STATUS.BAD_REQUEST, message, errors);
    if (code) err.code = code;
    return err;
  }

  /**
   * 401 Unauthorized
   * @param {string} message
   * @param {string} [code]
   */
  static unauthorized(message = "Unauthorized", code = null) {
    const err = new ApiError(HTTP_STATUS.UNAUTHORIZED, message);
    if (code) err.code = code;
    return err;
  }

  /**
   * 403 Forbidden
   * @param {string} message
   * @param {string} [code]
   */
  static forbidden(message = "Forbidden", code = null) {
    const err = new ApiError(HTTP_STATUS.FORBIDDEN, message);
    if (code) err.code = code;
    return err;
  }

  /**
   * 404 Not Found
   * @param {string} message
   * @param {string} [code]
   */
  static notFound(message = "Not found", code = null) {
    const err = new ApiError(HTTP_STATUS.NOT_FOUND, message);
    if (code) err.code = code;
    return err;
  }

  /**
   * 409 Conflict
   * @param {string} message
   * @param {string} [code]
   */
  static conflict(message, code = null) {
    const err = new ApiError(HTTP_STATUS.CONFLICT, message);
    if (code) err.code = code;
    return err;
  }

  /**
   * 500 Internal Server Error
   * @param {string} message
   */
  static internal(message = "Internal server error") {
    return new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, message, [], false);
  }

  /**
   * Backward-compatible alias for legacy call sites.
   * @param {string} message
   */
  static serverError(message = "Internal server error") {
    return ApiError.internal(message);
  }

  /**
   * 429 Too Many Requests
   * @param {string} message
   * @param {string} [code]
   */
  static tooManyRequests(message = "Too many requests", code = null) {
    const err = new ApiError(HTTP_STATUS.TOO_MANY_REQUESTS, message);
    if (code) err.code = code;
    return err;
  }

  /**
   * 422 Unprocessable Entity
   * @param {string} message
   * @param {Array}  errors
   * @param {string} [code]
   */
  static unprocessable(
    message = "Unprocessable entity",
    errors = [],
    code = null,
  ) {
    const err = new ApiError(422, message, errors);
    if (code) err.code = code;
    return err;
  }
}

/**
 * Standardized API Response class
 */
export class ApiResponse {
  constructor(statusCode, data, message = "Success") {
    this.success = statusCode < 400;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
  }

  static success(data, message = "Success") {
    return new ApiResponse(HTTP_STATUS.OK, data, message);
  }

  static created(data, message = "Created successfully") {
    return new ApiResponse(HTTP_STATUS.CREATED, data, message);
  }

  static noContent() {
    return new ApiResponse(HTTP_STATUS.NO_CONTENT, null, "No content");
  }
}

/**
 * Async handler wrapper to catch errors in async routes
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
