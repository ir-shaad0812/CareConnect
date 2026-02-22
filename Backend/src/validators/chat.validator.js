// ============================================
// CHAT VALIDATION MIDDLEWARE
// Comprehensive input validation for chat endpoints
// ============================================

import { body, param, query } from 'express-validator';
import { isValidObjectId } from '../utils/sanitize.js';

/**
 * Validation rules for creating a conversation
 */
export const validateCreateConversation = [
  body('participantId')
    .trim()
    .notEmpty()
    .withMessage('Participant ID is required')
    .custom((value) => {
      if (!isValidObjectId(value)) {
        throw new Error('Invalid participant ID format');
      }
      return true;
    }),
  body('bookingId')
    .optional()
    .trim()
    .custom((value) => {
      if (value && !isValidObjectId(value)) {
        throw new Error('Invalid booking ID format');
      }
      return true;
    }),
];

/**
 * Validation rules for sending a message
 */
export const validateSendMessage = [
  param('conversationId')
    .trim()
    .notEmpty()
    .withMessage('Conversation ID is required')
    .custom((value) => {
      if (!isValidObjectId(value)) {
        throw new Error('Invalid conversation ID format');
      }
      return true;
    }),
  body('content')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Message content cannot exceed 5000 characters'),
  body('type')
    .optional()
    .isIn(['text', 'image', 'file', 'audio', 'video', 'system'])
    .withMessage('Invalid message type'),
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be an object'),
];

/**
 * Validation rules for getting messages
 */
export const validateGetMessages = [
  param('conversationId')
    .trim()
    .notEmpty()
    .withMessage('Conversation ID is required')
    .custom((value) => {
      if (!isValidObjectId(value)) {
        throw new Error('Invalid conversation ID format');
      }
      return true;
    }),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
];

/**
 * Validation rules for marking messages as read
 */
export const validateMarkAsRead = [
  param('conversationId')
    .trim()
    .notEmpty()
    .withMessage('Conversation ID is required')
    .custom((value) => {
      if (!isValidObjectId(value)) {
        throw new Error('Invalid conversation ID format');
      }
      return true;
    }),
];

/**
 * Validation rules for getting conversation details
 */
export const validateGetConversation = [
  param('conversationId')
    .trim()
    .notEmpty()
    .withMessage('Conversation ID is required')
    .custom((value) => {
      if (!isValidObjectId(value)) {
        throw new Error('Invalid conversation ID format');
      }
      return true;
    }),
];

/**
 * Validation rules for adding reaction to message
 */
export const validateAddReaction = [
  param('messageId')
    .trim()
    .notEmpty()
    .withMessage('Message ID is required')
    .custom((value) => {
      if (!isValidObjectId(value)) {
        throw new Error('Invalid message ID format');
      }
      return true;
    }),
  body('emoji')
    .trim()
    .notEmpty()
    .withMessage('Emoji is required')
    .isLength({ min: 1, max: 10 })
    .withMessage('Emoji must be 1-10 characters'),
];

/**
 * Validation rules for reporting a message
 */
export const validateReportMessage = [
  param('messageId')
    .trim()
    .notEmpty()
    .withMessage('Message ID is required')
    .custom((value) => {
      if (!isValidObjectId(value)) {
        throw new Error('Invalid message ID format');
      }
      return true;
    }),
  body('reason')
    .trim()
    .notEmpty()
    .withMessage('Report reason is required')
    .isIn(['spam', 'harassment', 'inappropriate', 'scam', 'other'])
    .withMessage('Invalid report reason'),
  body('details')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Details cannot exceed 500 characters'),
];

/**
 * Validation rules for uploading file
 */
export const validateFileUpload = [
  param('conversationId')
    .trim()
    .notEmpty()
    .withMessage('Conversation ID is required')
    .custom((value) => {
      if (!isValidObjectId(value)) {
        throw new Error('Invalid conversation ID format');
      }
      return true;
    }),
];

/**
 * Validation rules for AI chat
 */
export const validateAIChat = [
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message must be between 1 and 1000 characters'),
  body('conversationId')
    .trim()
    .notEmpty()
    .withMessage('Conversation ID is required')
    .custom((value) => {
      if (!isValidObjectId(value)) {
        throw new Error('Invalid conversation ID format');
      }
      return true;
    }),
];

/**
 * Validation rules for ObjectId parameter
 */
export const validateObjectId = (paramName = 'id') => [
  param(paramName)
    .trim()
    .notEmpty()
    .withMessage(`${paramName} is required`)
    .custom((value) => {
      if (!isValidObjectId(value)) {
        throw new Error(`Invalid ${paramName} format`);
      }
      return true;
    }),
];
