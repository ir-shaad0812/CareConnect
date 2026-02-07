import { validationResult } from 'express-validator';
import { ApiError } from '../utils/apiResponse.js';

/**
 * Middleware to handle validation errors from express-validator
 */
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => ({
      field: error.path,
      message: error.msg,
    }));
    
    throw ApiError.badRequest('Validation failed', errorMessages);
  }
  
  next();
};
