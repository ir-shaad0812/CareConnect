// ============================================
// BOOKING MODULE JOI VALIDATION SCHEMAS
// ============================================

import Joi from 'joi';
import { objectIdSchema } from '../../shared/validators/joiRequest.validator.js';

const dateSchema = Joi.alternatives().try(Joi.string().trim(), Joi.date().iso());

const timeSchema = Joi.string()
  .trim()
  .pattern(/^([01]\d|2[0-3]):[0-5]\d$/)
  .messages({
    'string.pattern.base': 'time must be in HH:mm format',
  });

const scheduleWindowSchema = Joi.object({
  startDate: dateSchema.required(),
  endDate: dateSchema.optional(),
  startTime: timeSchema.required(),
  endTime: timeSchema.required(),
  timezone: Joi.string().trim().optional(),
  days: Joi.array().items(Joi.string().trim()).optional(),
  isFlexible: Joi.boolean().optional(),
}).unknown(true);

const legacyScheduleItemSchema = Joi.object({
  date: dateSchema.required(),
  startTime: timeSchema.required(),
  endTime: timeSchema.required(),
}).unknown(true);

export const createBookingSchema = Joi.object({
  caregiverId: objectIdSchema.required(),
  schedule: Joi.alternatives()
    .try(
      scheduleWindowSchema.keys({
        endDate: dateSchema.required(),
      }),
      legacyScheduleItemSchema,
      Joi.array().items(legacyScheduleItemSchema).min(1),
    )
    .required(),
}).unknown(true);

export const checkAvailabilitySchema = Joi.object({
  caregiverId: objectIdSchema.required(),
  schedule: Joi.alternatives()
    .try(
      scheduleWindowSchema,
      legacyScheduleItemSchema,
      Joi.array().items(legacyScheduleItemSchema).min(1),
    )
    .required(),
}).unknown(true);

export const bookingIdParamSchema = Joi.object({
  bookingId: objectIdSchema.required(),
}).unknown(true);

export default {
  createBookingSchema,
  checkAvailabilitySchema,
  bookingIdParamSchema,
};
