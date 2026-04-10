// ============================================
// TRACKING MODULE JOI VALIDATION SCHEMAS
// ============================================

import Joi from 'joi';
import { objectIdSchema } from '../../shared/validators/joiRequest.validator.js';

export const trackingCheckSchema = Joi.object({
  bookingId: objectIdSchema.required(),
  date: Joi.string().trim().optional(),
  notes: Joi.string().trim().allow('').optional(),
  verifiedBy: Joi.string().trim().optional(),
  location: Joi.object().optional(),
}).unknown(true);

export const trackingSubmitSchema = Joi.object({
  bookingId: objectIdSchema.required(),
  date: Joi.string().trim().optional(),
  tasksCompleted: Joi.alternatives()
    .try(
      Joi.string().trim(),
      Joi.array().items(Joi.string().trim()),
    )
    .optional(),
  notes: Joi.string().trim().allow('').optional(),
  issues: Joi.alternatives().try(Joi.string(), Joi.array()).optional(),
  issueFlag: Joi.alternatives().try(Joi.boolean(), Joi.number().integer().valid(0, 1), Joi.string()).optional(),
}).unknown(true);

export const bookingIdParamSchema = Joi.object({
  bookingId: objectIdSchema.required(),
}).unknown(true);

export const bookingDateParamSchema = Joi.object({
  bookingId: objectIdSchema.required(),
  date: Joi.string().trim().required(),
}).unknown(true);

export default {
  trackingCheckSchema,
  trackingSubmitSchema,
  bookingIdParamSchema,
  bookingDateParamSchema,
};
