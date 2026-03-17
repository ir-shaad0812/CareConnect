// ============================================
// AGREEMENT MODULE CONTROLLER
// Thin controller layer — all business logic
// lives in AgreementService (services/agreement.service.js)
// ============================================

import agreementService from '../../services/agreement.service.js';
import { asyncHandler, ApiError } from '../../utils/apiResponse.js';
import { USER_ROLES } from '../../constants/index.js';

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/agreements/:bookingId
// Returns the full agreement object (content + acceptance state)
// Access: care seeker, caregiver (party to booking), admin
// ─────────────────────────────────────────────────────────────────────────────
export const getAgreement = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const userId  = req.user._id;
  const isAdmin = req.user.role === USER_ROLES.ADMIN;

  const result = await agreementService.getAgreement(bookingId, userId, isAdmin);

  res.status(200).json({
    success: true,
    message: 'Agreement retrieved successfully',
    data: result,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/agreements/:bookingId/status
// Lightweight status-only endpoint — no heavy agreement content.
// Ideal for polling, status-bar, and progress-step components.
// Access: care seeker, caregiver (party to booking), admin
// ─────────────────────────────────────────────────────────────────────────────
export const getAgreementStatus = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const userId  = req.user._id;
  const isAdmin = req.user.role === USER_ROLES.ADMIN;

  const result = await agreementService.getAgreementStatus(
    bookingId,
    userId,
    isAdmin,
  );

  res.status(200).json({
    success: true,
    message: 'Agreement status retrieved successfully',
    data: result,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/agreements/:bookingId/accept
// Accept the agreement as the authenticated party.
// Idempotent: double-calling returns success without re-saving.
//
// Role rules:
//   • Care seeker  → can accept from: RESERVED, PENDING, ACCEPTED, AGREEMENT_PENDING, …
//   • Caregiver    → can accept from: ACCEPTED, AGREEMENT_PENDING, …
//     (must have already accepted the booking REQUEST first)
//
// Error codes returned on failure:
//   BOOKING_INACTIVE              – cancelled / rejected / expired
//   BOOKING_REQUEST_PENDING       – caregiver must accept booking request first
//   BOOKING_NOT_SUBMITTED         – care seeker has not submitted the booking yet
//   INVALID_BOOKING_STATUS_FOR_AGREEMENT – any other disallowed status
// ─────────────────────────────────────────────────────────────────────────────
export const acceptAgreement = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const userId   = req.user._id;
  const userRole = req.user.role;

  // Only the two booking parties may call this endpoint
  if (![USER_ROLES.CARESEEKER, USER_ROLES.CAREGIVER].includes(userRole)) {
    throw ApiError.forbidden(
      'Only care seekers and caregivers can accept service agreements.',
      'ROLE_NOT_ALLOWED',
    );
  }

  const booking = await agreementService.acceptAgreement(
    bookingId,
    userId,
    userRole,
  );

  // Derive a clear API-level status so the frontend knows exactly what changed
  let responseStatus;
  let message;

  if (booking?.status === 'payment_pending') {
    responseStatus = 'PAYMENT_ENABLED';
    message =
      'Both parties have accepted the service agreement. ' +
      'Payment is now enabled — please complete payment to confirm your booking.';
  } else if (booking?.agreement?.seekerAccepted && booking?.agreement?.caregiverAccepted) {
    responseStatus = 'AGREEMENT_FULLY_ACCEPTED';
    message = 'Agreement fully accepted by both parties.';
  } else if (booking?.agreement?.seekerAccepted) {
    responseStatus = 'AGREEMENT_ACCEPTED_BY_SEEKER';
    message =
      'Agreement accepted by the care seeker. ' +
      'Waiting for caregiver acceptance.';
  } else if (booking?.agreement?.caregiverAccepted) {
    responseStatus = 'AGREEMENT_ACCEPTED_BY_CAREGIVER';
    message =
      'Agreement accepted by the caregiver. ' +
      'Waiting for care seeker acceptance.';
  } else {
    responseStatus = 'AGREEMENT_UPDATED';
    message = 'Agreement acceptance recorded successfully.';
  }

  res.status(200).json({
    success: true,
    status: responseStatus,
    message,
    data: {
      bookingId:            booking._id,
      bookingNumber:        booking.bookingNumber,
      bookingStatus:        booking.status,
      agreementStatus:      booking.agreement?.status,
      seekerAccepted:       Boolean(booking.agreement?.seekerAccepted),
      caregiverAccepted:    Boolean(booking.agreement?.caregiverAccepted),
      fullyAccepted:        Boolean(booking.agreement?.accepted),
      seekerAcceptedAt:     booking.agreement?.seekerAcceptedAt || null,
      caregiverAcceptedAt:  booking.agreement?.caregiverAcceptedAt || null,
      paymentEnabled:       booking.status === 'payment_pending',
    },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/agreements/:bookingId/pdf
// Stream the agreement PDF to the client.
// Access: care seeker, caregiver (party to booking), admin
// ─────────────────────────────────────────────────────────────────────────────
export const downloadAgreementPDF = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const userId  = req.user._id;
  const isAdmin = req.user.role === USER_ROLES.ADMIN;

  const pdfBuffer = await agreementService.generateAgreementPDF(
    bookingId,
    userId,
    isAdmin,
  );

  // Retrieve booking number for a friendlier filename
  let filename = `careconnect-agreement-${bookingId}.pdf`;
  try {
    const statusData = await agreementService.getAgreementStatus(
      bookingId,
      userId,
      isAdmin,
    );
    if (statusData?.bookingNumber) {
      filename = `careconnect-agreement-${statusData.bookingNumber}.pdf`;
    }
  } catch {
    // Non-critical — default filename is fine
  }

  res.set({
    'Content-Type':        'application/pdf',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Content-Length':      pdfBuffer.length,
    'Cache-Control':       'no-store',
  });

  res.end(pdfBuffer);
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/agreements/:bookingId/generate
// Manually trigger agreement generation for a booking in ACCEPTED status.
// Normally called automatically by BookingService.acceptBookingByCaregiver()
// but exposed here for recovery / admin use.
// Access: admin only (or caregiver who owns the booking)
// ─────────────────────────────────────────────────────────────────────────────
export const generateAgreement = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const userRole = req.user.role;

  if (userRole !== USER_ROLES.ADMIN && userRole !== USER_ROLES.CAREGIVER) {
    throw ApiError.forbidden(
      'Only admins or the booking caregiver can manually trigger agreement generation.',
      'ROLE_NOT_ALLOWED',
    );
  }

  const booking = await agreementService.generateAgreement(bookingId);

  res.status(200).json({
    success: true,
    message: 'Service agreement generated successfully.',
    data: {
      bookingId:     booking._id,
      bookingNumber: booking.bookingNumber,
      bookingStatus: booking.status,
      agreementId:   booking.agreement?.agreementId,
      agreementStatus: booking.agreement?.status,
    },
  });
});
