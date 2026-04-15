// ============================================
// USER MODULE JOI VALIDATION SCHEMAS
// ============================================

import Joi from 'joi';
import { objectIdSchema } from '../../shared/validators/joiRequest.validator.js';

export const caregiverListQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  city: Joi.string().trim().optional(),
  district: Joi.string().trim().optional(),
  serviceType: Joi.string().trim().optional(),
}).unknown(true);

export const userIdParamSchema = Joi.object({
  userId: objectIdSchema.required(),
}).unknown(true);

export default {
  caregiverListQuerySchema,
  userIdParamSchema,
};
