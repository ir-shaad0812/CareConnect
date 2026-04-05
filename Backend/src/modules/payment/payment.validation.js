// ============================================
// PAYMENT MODULE JOI VALIDATION SCHEMAS
// ============================================

import Joi from 'joi';
import { objectIdSchema } from '../../shared/validators/joiRequest.validator.js';

export const checkoutSessionSchema = Joi.object({
  bookingId: objectIdSchema.required(),
  amount: Joi.number().positive().optional(),
}).unknown(true);

export const gatewayInitiateSchema = Joi.object({
  bookingId: objectIdSchema.required(),
  amount: Joi.number().positive().optional(),
}).unknown(true);

export const khaltiVerifySchema = Joi.object({
  pidx: Joi.string().trim().required(),
  transactionId: Joi.string().trim().required(),
}).unknown(true);

export const esewaVerifySchema = Joi.object({
  encodedResponse: Joi.string().trim().required(),
}).unknown(true);

export const bookingIdParamSchema = Joi.object({
  bookingId: objectIdSchema.required(),
}).unknown(true);

export const transactionIdParamSchema = Joi.object({
  transactionId: objectIdSchema.required(),
}).unknown(true);

export default {
  checkoutSessionSchema,
  gatewayInitiateSchema,
  khaltiVerifySchema,
  esewaVerifySchema,
  bookingIdParamSchema,
  transactionIdParamSchema,
};
