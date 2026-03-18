// ============================================
// AGREEMENT MODULE ROUTES
// Dedicated agreement endpoints separate from booking routes.
// These routes mirror the agreement sub-routes on /api/bookings/:id/agreement
// but are exposed under /api/agreements for a cleaner module boundary.
// ============================================

import { Router } from 'express';
import {
  getAgreement,
  getAgreementStatus,
  acceptAgreement,
  downloadAgreementPDF,
  generateAgreement,
} from './agreement.controller.js';
import { authenticate, requireActive, authorize } from '../../middleware/auth.middleware.js';
import { validateRequest } from '../../shared/validators/joiRequest.validator.js';
import {
  validateBookingIdParam,
  validateAcceptAgreement,
  validateGenerateAgreement,
} from './agreement.validation.js';
import { USER_ROLES } from '../../constants/index.js';

const router = Router();

// All agreement routes require a verified, active session
router.use(authenticate, requireActive);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/agreements/:bookingId
// Returns the full agreement object including content, acceptance state, and
// role-specific obligation sections.
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  '/:bookingId',
  validateRequest(validateBookingIdParam),
  getAgreement,
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/agreements/:bookingId/status
// Lightweight status-only endpoint — ideal for polling, progress bars, and
// step indicators. Does NOT return full agreement content.
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  '/:bookingId/status',
  validateRequest(validateBookingIdParam),
  getAgreementStatus,
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/agreements/:bookingId/accept
// Record the authenticated party's acceptance of the service agreement.
// Idempotent — safe to retry.
//
// Role rules enforced in the controller:
//   • Care seeker  → can accept from most active booking statuses
//   • Caregiver    → must have accepted the booking REQUEST first
//
// Error codes:
//   BOOKING_INACTIVE              – cancelled / rejected / expired booking
//   BOOKING_REQUEST_PENDING       – caregiver must accept booking request first
//   BOOKING_NOT_SUBMITTED         – booking not yet submitted by care seeker
//   INVALID_BOOKING_STATUS_FOR_AGREEMENT – other disallowed status
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/:bookingId/accept',
  validateRequest(validateAcceptAgreement),
  acceptAgreement,
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/agreements/:bookingId/pdf
// Stream the rendered agreement PDF.
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  '/:bookingId/pdf',
  validateRequest(validateBookingIdParam),
  downloadAgreementPDF,
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/agreements/:bookingId/generate
// Manually trigger agreement generation for a booking in ACCEPTED status.
// Normally triggered automatically when caregiver accepts the booking request.
// Exposed here for recovery workflows and admin use.
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/:bookingId/generate',
  validateRequest(validateGenerateAgreement),
  generateAgreement,
);

export default router;
