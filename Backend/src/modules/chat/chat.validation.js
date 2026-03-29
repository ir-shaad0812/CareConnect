// ============================================
// CHAT MODULE JOI VALIDATION SCHEMAS
// ============================================

import Joi from 'joi';
import { objectIdSchema } from '../../shared/validators/joiRequest.validator.js';

export const conversationIdParamSchema = Joi.object({
  conversationId: objectIdSchema.required(),
}).unknown(true);

export const sendMessageSchema = Joi.object({
  content: Joi.string().trim().min(1).max(5000).required(),
  messageType: Joi.string().trim().optional(),
  attachments: Joi.array().optional(),
}).unknown(true);

export default {
  conversationIdParamSchema,
  sendMessageSchema,
};
