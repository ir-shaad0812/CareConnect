// ============================================
// AGREEMENT MODULE VALIDATION
// Joi schemas for all agreement-related requests
// ============================================

import Joi from 'joi';

// ─── Shared ──────────────────────────────────────────────────────────────────

const mongoId = Joi.string()
  .pattern(/^[a-fA-F0-9]{24}$/)
  .required()
  .messages({
    'string.pattern.base': 'Invalid ID format — must be a 24-character hex string',
    'any.required': 'Booking ID is required',
  });

// ─── Param schemas ───────────────────────────────────────────────────────────

/**
 * Validates :bookingId route parameter.
 * Used on every agreement endpoint.
 */
export const bookingIdParamSchema = Joi.object({
  bookingId: mongoId,
});

// ─── Body schemas ─────────────────────────────────────────────────────────────

/**
 * POST /api/agreements/:bookingId/accept
 * Body is intentionally empty — the acting party is determined from the
 * authenticated JWT, not from any request body field.
 * Keeping this schema ensures any accidental body payload is rejected cleanly.
 */
export const acceptAgreementSchema = Joi.object({
  // No fields expected — acceptance is derived from the authenticated user
}).options({ allowUnknown: false });

/**
 * POST /api/agreements/:bookingId/generate
 * Optional body — admins may supply a note for audit trail.
 */
export const generateAgreementSchema = Joi.object({
  note: Joi.string().trim().max(500).optional().messages({
    'string.max': 'Note cannot exceed 500 characters',
  }),
}).options({ allowUnknown: false });

// ─── Query schemas ────────────────────────────────────────────────────────────

/**
 * GET /api/agreements/:bookingId
 * No query params required, but this schema future-proofs the endpoint.
 */
export const getAgreementQuerySchema = Joi.object({
  // reserved for future: e.g. ?includeContent=false
}).options({ allowUnknown: true });

/**
 * GET /api/agreements/:bookingId/status
 * No query params required.
 */
export const getAgreementStatusQuerySchema = Joi.object({}).options({
  allowUnknown: true,
});

// ─── Combined request schemas (used with validateRequest middleware) ──────────

export const validateBookingIdParam = {
  params: bookingIdParamSchema,
};

export const validateAcceptAgreement = {
  params: bookingIdParamSchema,
  body:   acceptAgreementSchema,
};

export const validateGenerateAgreement = {
  params: bookingIdParamSchema,
  body:   generateAgreementSchema,
};
