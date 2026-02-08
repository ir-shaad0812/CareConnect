// ============================================
// VALIDATION ERROR HANDLER
// Middleware to handle express-validator errors
// ============================================

import { validationResult } from 'express-validator';
import logger from '../utils/logger.js';

/**
 * Handle validation errors from express-validator
 * Returns 400 with detailed error messages
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value,
    }));

    logger.warn('Validation failed', {
      path: req.path,
      method: req.method,
      errors: errorMessages,
      userId: req.user?._id,
    });

    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errorMessages,
    });
  }

  next();
};

/**
 * Validate file upload
 */
export const validateFileMiddleware = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'No file uploaded',
    });
  }

  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'audio/mpeg',
    'audio/wav',
    'video/mp4',
    'video/mpeg',
  ];

  const maxFileSize = 10 * 1024 * 1024; // 10MB

  if (!allowedMimeTypes.includes(req.file.mimetype)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid file type',
      allowedTypes: allowedMimeTypes,
    });
  }

  if (req.file.size > maxFileSize) {
    return res.status(400).json({
      success: false,
      error: 'File size exceeds 10MB limit',
    });
  }

  next();
};
