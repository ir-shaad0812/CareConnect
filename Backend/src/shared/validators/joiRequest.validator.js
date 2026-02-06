// ============================================
// JOI REQUEST VALIDATION MIDDLEWARE
// Validates request body, params, and query
// ============================================

import Joi from 'joi';

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

export const objectIdSchema = Joi.string()
  .trim()
  .pattern(OBJECT_ID_REGEX)
  .messages({
    'string.pattern.base': 'must be a valid MongoDB ObjectId',
  });

const formatValidationErrors = (error, section) => {
  return error.details.map((detail) => ({
    section,
    field: detail.path.join('.') || section,
    message: detail.message,
  }));
};

export const validateRequest = ({ body, params, query } = {}) => {
  return (req, res, next) => {
    const errors = [];

    if (body) {
      const { error } = body.validate(req.body ?? {}, {
        abortEarly: false,
        allowUnknown: true,
      });

      if (error) {
        errors.push(...formatValidationErrors(error, 'body'));
      }
    }

    if (params) {
      const { error } = params.validate(req.params ?? {}, {
        abortEarly: false,
        allowUnknown: true,
      });

      if (error) {
        errors.push(...formatValidationErrors(error, 'params'));
      }
    }

    if (query) {
      const { error } = query.validate(req.query ?? {}, {
        abortEarly: false,
        allowUnknown: true,
      });

      if (error) {
        errors.push(...formatValidationErrors(error, 'query'));
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Request validation failed',
        code: 'VALIDATION_FAILED',
        errors,
      });
    }

    next();
  };
};

export default {
  objectIdSchema,
  validateRequest,
};
