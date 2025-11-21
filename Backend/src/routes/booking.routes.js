// ============================================
// BOOKING ROUTES
// Routes for booking management
// ============================================

import { Router } from 'express';
import * as bookingController from '../controllers/booking/booking.controller.js';
import { authenticate, requireActive, authorize } from '../middleware/auth.middleware.js';
import { USER_ROLES } from '../constants/index.js';
import { validateRequest } from '../shared/validators/joiRequest.validator.js';
import {
  createBookingSchema,
  checkAvailabilitySchema,
  bookingIdParamSchema,
} from '../modules/booking/booking.validation.js';

const router = Router();
const validateBookingId = validateRequest({ params: bookingIdParamSchema });

// All booking routes require authentication
router.use(authenticate, requireActive);

// ============================================
// CARE SEEKER & CAREGIVER ROUTES
// ============================================

// Create a new booking (Care Seeker only) - Creates RESERVED status
router.post('/', validateRequest({ body: createBookingSchema }), bookingController.createBooking);

// Check availability before booking
router.post('/check-availability', validateRequest({ body: checkAvailabilitySchema }), bookingController.checkAvailability);

// Get my bookings (both roles)
router.get('/', bookingController.getMyBookings);

// Get my booking statistics
router.get('/stats', bookingController.getMyBookingStats);

// Get calendar events
router.get('/calendar', bookingController.getCalendarEvents);

// Update booking status (Admin alias)
router.patch('/status/:bookingId', authorize(USER_ROLES.ADMIN), validateBookingId, bookingController.updateBookingStatus);

// Get booking by ID
router.get('/:bookingId', validateBookingId, bookingController.getBookingById);

// Agreement endpoints
router.get('/:bookingId/agreement', validateBookingId, bookingController.getAgreement);
router.post('/:bookingId/agreement/accept', validateBookingId, bookingController.acceptAgreement);
router.get('/:bookingId/agreement/pdf', validateBookingId, bookingController.downloadAgreementPDF);

// Sprint B: Preview refund before cancelling
router.get('/:bookingId/refund-preview', validateBookingId, bookingController.previewRefund);

// Sprint A: Get slots for a booking
router.get('/:bookingId/slots', validateBookingId, bookingController.getBookingSlots);

// Submit reservation - converts RESERVED to PENDING (Care Seeker only)
router.post('/:bookingId/submit', validateBookingId, bookingController.submitReservation);

// Extend reservation time (Care Seeker only)
router.post('/:bookingId/extend-reservation', validateBookingId, bookingController.extendReservation);

// Confirm booking (Caregiver only)
router.post('/:bookingId/confirm', validateBookingId, bookingController.confirmBooking);

// Reject booking (Caregiver only)
router.post('/:bookingId/reject', validateBookingId, bookingController.rejectBooking);

// Cancel booking (both roles)
router.post('/:bookingId/cancel', validateBookingId, bookingController.cancelBooking);

// Check in (Caregiver only)
router.post('/:bookingId/check-in', validateBookingId, bookingController.checkIn);

// Check out (Caregiver only)
router.post('/:bookingId/check-out', validateBookingId, bookingController.checkOut);

// Submit care report (Caregiver only)
router.post('/:bookingId/care-report', validateBookingId, bookingController.submitCareReport);

// Get care reports for a booking
router.get('/:bookingId/care-reports', validateBookingId, bookingController.getCareReports);

// Request modification (both roles)
router.post('/:bookingId/modify', validateBookingId, bookingController.requestModification);

// Respond to modification request
router.post(
  '/:bookingId/modifications/:modificationId/respond',
  validateBookingId,
  bookingController.respondToModification
);

// Raise a dispute
router.post('/:bookingId/dispute', validateBookingId, bookingController.raiseDispute);

export default router;
