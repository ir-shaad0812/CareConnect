// ============================================
// PAYMENT VALIDATORS - Sprint-05
// Request validation schemas for payment routes
// ============================================

import { body, param, query } from 'express-validator';

/**
 * Validate checkout session creation
 */
export const validateCreateCheckoutSession = [
  body('bookingId')
    .notEmpty()
    .withMessage('Booking ID is required')
    .isMongoId()
    .withMessage('Invalid booking ID format'),
  body('amount')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number'),
];

/**
 * Validate refund request
 */
export const validateRefund = [
  param('bookingId')
    .notEmpty()
    .withMessage('Booking ID is required')
    .isMongoId()
    .withMessage('Invalid booking ID format'),
  body('reason')
    .notEmpty()
    .withMessage('Refund reason is required')
    .isLength({ min: 10, max: 500 })
    .withMessage('Reason must be 10-500 characters'),
  body('amount')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number'),
];

/**
 * Validate transaction query filters
 */
export const validateTransactionQuery = [
  query('type')
    .optional()
    .isIn(['payment', 'refund', 'payout', 'platform_fee', 'cancellation_fee'])
    .withMessage('Invalid transaction type'),
  query('status')
    .optional()
    .isIn(['initiated', 'pending', 'completed', 'failed', 'cancelled', 'expired'])
    .withMessage('Invalid status'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be 1-100'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
];

/**
 * Validate booking ID param
 */
export const validateBookingIdParam = [
  param('bookingId')
    .notEmpty()
    .withMessage('Booking ID is required')
    .isMongoId()
    .withMessage('Invalid booking ID format'),
];

/**
 * Validate transaction ID param
 */
export const validateTransactionIdParam = [
  param('transactionId')
    .notEmpty()
    .withMessage('Transaction ID is required')
    .isMongoId()
    .withMessage('Invalid transaction ID format'),
];
