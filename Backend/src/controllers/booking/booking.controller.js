// ============================================
// BOOKING CONTROLLER
// Handles all booking-related HTTP requests
// ============================================

import bookingService from '../../services/booking.service.js';
import agreementService from '../../services/agreement.service.js';
import refundService from '../../services/refund.service.js';
import slotService from '../../services/slot.service.js';
import bookingStateTransitionService from '../../services/bookingStateTransition.service.js';
import Booking from '../../models/booking.model.js';
import { ApiResponse, asyncHandler, ApiError } from '../../utils/apiResponse.js';
import { USER_ROLES } from '../../constants/index.js';
import { BOOKING_STATUS } from '../../constants/booking.constants.js';

const normalizeDateValue = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString().split('T')[0];
};

const normalizeScheduleInput = (schedule) => {
  if (!schedule) {
    return schedule;
  }

  if (Array.isArray(schedule)) {
    const normalizedItems = schedule
      .map((item) => {
        const normalizedDate = normalizeDateValue(
          item?.date || item?.startDate || item?.endDate,
        );

        return {
          ...item,
          date: normalizedDate,
        };
      })
      .filter((item) => Boolean(item.date));

    if (normalizedItems.length === 0) {
      return schedule;
    }

    const sorted = [...normalizedItems].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    return {
      startDate: first.date,
      endDate: last.date,
      startTime: first.startTime,
      endTime: first.endTime || last.endTime,
      date: first.date,
    };
  }

  const startDate = normalizeDateValue(schedule.startDate || schedule.date);
  const endDate = normalizeDateValue(schedule.endDate || schedule.date || startDate);

  return {
    ...schedule,
    startDate,
    endDate,
    date: schedule.date || startDate,
  };
};

/**
 * Preview refund for a booking — does NOT mutate state.
 * GET /api/bookings/:bookingId/refund-preview
 */
export const previewRefund = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const userId = req.user._id.toString();

  // Authorization: only parties to the booking can preview
  const Booking = (await import('../../models/booking.model.js')).default;
  const booking = await Booking.findById(bookingId).select('careSeekerId caregiverId');
  if (!booking) throw ApiError.notFound('Booking not found');

  const csId = booking.careSeekerId?.toString();
  const cgId = booking.caregiverId?.toString();
  const isCareSeeker = csId === userId;
  const isCaregiver = cgId === userId;
  if (!isCareSeeker && !isCaregiver && req.user.role !== 'admin') {
    throw ApiError.forbidden('Not authorized to preview this refund');
  }

  const cancelledByRole = isCaregiver ? 'caregiver' : isCareSeeker ? 'careseeker' : 'admin';
  const preview = await refundService.previewRefund(bookingId, { cancelledByRole });
  res.json(new ApiResponse(200, preview, 'Refund preview generated'));
});

/**
 * Get all slots for a booking.
 * GET /api/bookings/:bookingId/slots
 */
export const getBookingSlots = asyncHandler(async (req, res) => {
  const summary = await slotService.getBookingSlotSummary(req.params.bookingId);
  res.json(new ApiResponse(200, summary, 'Slots fetched'));
});

/**
 * Create a new booking
 * POST /api/bookings
 */
export const createBooking = asyncHandler(async (req, res) => {
  const careSeekerId = req.user._id;

  // Validate user role
  if (req.user.role !== USER_ROLES.CARESEEKER) {
    throw ApiError.forbidden('Only care seekers can create bookings');
  }

  const normalizedPayload = {
    ...req.body,
    schedule: normalizeScheduleInput(req.body?.schedule),
  };

  if (
    !normalizedPayload.schedule?.startDate ||
    !normalizedPayload.schedule?.endDate ||
    !normalizedPayload.schedule?.startTime ||
    !normalizedPayload.schedule?.endTime
  ) {
    throw ApiError.badRequest(
      'schedule.startDate, schedule.endDate, schedule.startTime, and schedule.endTime are required',
    );
  }

  let booking;
  try {
    booking = await bookingService.createBooking(normalizedPayload, careSeekerId);
  } catch (error) {
    if (error?.code === 'CARE_GIVER_UNAVAILABLE') {
      return res.status(409).json({
        success: false,
        status: 'CARE_GIVER_UNAVAILABLE',
        message: 'Caregiver is not available at selected time',
      });
    }
    throw error;
  }

  res.status(201).json(
    new ApiResponse(201, { booking }, 'Booking reservation created successfully')
  );
});

/**
 * Check availability before booking
 * POST /api/bookings/check-availability
 */
export const checkAvailability = asyncHandler(async (req, res) => {
  const { caregiverId, schedule } = req.body;
  const normalizedSchedule = normalizeScheduleInput(schedule);

  if (!caregiverId || !normalizedSchedule) {
    throw ApiError.badRequest('caregiverId and schedule are required');
  }

  if (
    !normalizedSchedule.startDate ||
    !normalizedSchedule.startTime ||
    !normalizedSchedule.endTime
  ) {
    throw ApiError.badRequest(
      'schedule.startDate/schedule.startTime/schedule.endTime (or legacy schedule.date/startTime/endTime) are required',
    );
  }

  const availability = await bookingService.checkAvailability(caregiverId, normalizedSchedule);

  res.status(200).json(
    new ApiResponse(200, availability, 'Availability check completed')
  );
});

/**
 * Submit reservation - converts RESERVED to PENDING
 * POST /api/bookings/:bookingId/submit
 */
export const submitReservation = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const careSeekerId = req.user._id;

  if (req.user.role !== USER_ROLES.CARESEEKER) {
    throw ApiError.forbidden('Only care seekers can submit reservations');
  }

  let booking;
  try {
    booking = await bookingService.submitReservation(bookingId, careSeekerId);
  } catch (error) {
    if (error?.code === 'CARE_GIVER_UNAVAILABLE') {
      return res.status(409).json({
        success: false,
        status: 'CARE_GIVER_UNAVAILABLE',
        message: 'Caregiver is not available at selected time',
      });
    }

    if (error?.code === 'AGREEMENT_ACCEPTANCE_REQUIRED') {
      return res.status(409).json({
        success: false,
        status: 'AGREEMENT_ACCEPTANCE_REQUIRED',
        message:
          'Agreement must be accepted by family before submitting booking request',
      });
    }

    throw error;
  }

  res.status(200).json(
    new ApiResponse(200, { booking }, 'Booking request submitted successfully')
  );
});

/**
 * Extend reservation time
 * POST /api/bookings/:bookingId/extend-reservation
 */
export const extendReservation = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const careSeekerId = req.user._id;

  if (req.user.role !== USER_ROLES.CARESEEKER) {
    throw ApiError.forbidden('Only care seekers can extend reservations');
  }

  const booking = await bookingService.extendReservation(bookingId, careSeekerId);

  res.status(200).json(
    new ApiResponse(200, { booking }, 'Reservation extended successfully')
  );
});

/**
 * Get booking by ID
 * GET /api/bookings/:bookingId
 */
export const getBookingById = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const userId = req.user._id;

  const booking = await bookingService.getBookingById(bookingId, userId);

  res.status(200).json(
    new ApiResponse(200, { booking }, 'Booking fetched successfully')
  );
});

/**
 * Get booking agreement details
 * GET /api/bookings/:bookingId/agreement
 */
export const getAgreement = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const userId = req.user._id;
  const isAdmin = req.user.role === USER_ROLES.ADMIN;

  const agreement = await agreementService.getAgreement(bookingId, userId, isAdmin);

  res.status(200).json(
    new ApiResponse(200, agreement, 'Agreement fetched successfully')
  );
});

/**
 * Accept booking agreement
 * POST /api/bookings/:bookingId/agreement/accept
 */
export const acceptAgreement = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const userId = req.user._id;
  const userRole = req.user.role;

  if (![USER_ROLES.CARESEEKER, USER_ROLES.CAREGIVER].includes(userRole)) {
    throw ApiError.forbidden('Only booking parties can accept agreements');
  }

  const booking = await bookingService.acceptAgreement(bookingId, userId, userRole);

  const responseStatus =
    booking?.status === BOOKING_STATUS.PAYMENT_PENDING
      ? 'PAYMENT_ENABLED'
      : booking?.status === BOOKING_STATUS.AGREEMENT_PENDING
        ? 'AGREEMENT_PENDING'
        : 'AGREEMENT_UPDATED';

  res.status(200).json({
    success: true,
    status: responseStatus,
    message:
      responseStatus === 'PAYMENT_ENABLED'
        ? 'Agreement accepted by both parties. Payment is now enabled.'
        : 'Agreement accepted successfully',
    data: { booking },
  });
});

/**
 * Download booking agreement PDF
 * GET /api/bookings/:bookingId/agreement/pdf
 */
export const downloadAgreementPDF = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const userId = req.user._id;
  const isAdmin = req.user.role === USER_ROLES.ADMIN;

  // Reuse agreement access control before generating file.
  await agreementService.getAgreement(bookingId, userId, isAdmin);

  const pdfBuffer = await agreementService.generateAgreementPDF(bookingId);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="agreement-${bookingId}.pdf"`);
  res.status(200).send(pdfBuffer);
});

/**
 * Get user's bookings
 * GET /api/bookings
 */
export const getMyBookings = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const role = req.user.role;

  const result = await bookingService.getUserBookings(userId, role, req.query);

  res.status(200).json(
    new ApiResponse(200, result, 'Bookings fetched successfully')
  );
});

/**
 * Confirm a booking (Caregiver)
 * POST /api/bookings/:bookingId/confirm
 */
export const confirmBooking = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const caregiverId = req.user._id;

  if (req.user.role !== USER_ROLES.CAREGIVER) {
    throw ApiError.forbidden('Only caregivers can confirm bookings');
  }

  // New flow: caregiver accepts booking, then agreement must be accepted by both parties.
  const booking = await bookingService.acceptBookingByCaregiver(
    bookingId,
    caregiverId,
  );

  res.status(200).json(
    new ApiResponse(200, { booking }, 'Booking accepted successfully')
  );
});

/**
 * Reject a booking (Caregiver)
 * POST /api/bookings/:bookingId/reject
 */
export const rejectBooking = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const caregiverId = req.user._id;
  const { reason } = req.body;

  if (req.user.role !== USER_ROLES.CAREGIVER) {
    throw ApiError.forbidden('Only caregivers can reject bookings');
  }

  const booking = await bookingService.rejectBooking(bookingId, caregiverId, reason);

  res.status(200).json(
    new ApiResponse(200, { booking }, 'Booking rejected')
  );
});

/**
 * Cancel a booking
 * POST /api/bookings/:bookingId/cancel
 */
export const cancelBooking = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const userId = req.user._id;
  const { reason } = req.body;

  const booking = await bookingService.cancelBooking(bookingId, userId, reason);

  res.status(200).json(
    new ApiResponse(200, { booking }, 'Booking cancelled successfully')
  );
});

/**
 * Check in for a booking (Caregiver)
 * POST /api/bookings/:bookingId/check-in
 */
export const checkIn = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const caregiverId = req.user._id;

  if (req.user.role !== USER_ROLES.CAREGIVER) {
    throw ApiError.forbidden('Only caregivers can check in');
  }

  const booking = await bookingService.checkIn(bookingId, caregiverId, req.body);

  res.status(200).json(
    new ApiResponse(200, { booking }, 'Checked in successfully')
  );
});

/**
 * Check out from a booking (Caregiver)
 * POST /api/bookings/:bookingId/check-out
 */
export const checkOut = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const caregiverId = req.user._id;

  if (req.user.role !== USER_ROLES.CAREGIVER) {
    throw ApiError.forbidden('Only caregivers can check out');
  }

  const booking = await bookingService.checkOut(bookingId, caregiverId, req.body);

  res.status(200).json(
    new ApiResponse(200, { booking }, 'Checked out successfully')
  );
});

/**
 * Submit care report (Caregiver)
 * POST /api/bookings/:bookingId/care-report
 */
export const submitCareReport = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const caregiverId = req.user._id;

  if (req.user.role !== USER_ROLES.CAREGIVER) {
    throw ApiError.forbidden('Only caregivers can submit care reports');
  }

  const booking = await bookingService.submitCareReport(bookingId, caregiverId, req.body);

  res.status(200).json(
    new ApiResponse(200, { booking }, 'Care report submitted successfully')
  );
});

/**
 * Get care reports for a booking
 * GET /api/bookings/:bookingId/care-reports
 */
export const getCareReports = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const userId = req.user._id;

  const booking = await bookingService.getBookingById(bookingId, userId);

  res.status(200).json(
    new ApiResponse(200, { 
      careReports: booking.careReports,
      bookingNumber: booking.bookingNumber,
    }, 'Care reports fetched successfully')
  );
});

/**
 * Request modification to booking
 * POST /api/bookings/:bookingId/modify
 */
export const requestModification = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const userId = req.user._id;

  const booking = await bookingService.requestModification(bookingId, userId, req.body);

  res.status(200).json(
    new ApiResponse(200, { booking }, 'Modification request submitted')
  );
});

/**
 * Respond to modification request
 * POST /api/bookings/:bookingId/modifications/:modificationId/respond
 */
export const respondToModification = asyncHandler(async (req, res) => {
  const { bookingId, modificationId } = req.params;
  const userId = req.user._id;
  const { approved, response } = req.body;

  const booking = await bookingService.respondToModification(
    bookingId,
    modificationId,
    userId,
    approved,
    response
  );

  res.status(200).json(
    new ApiResponse(200, { booking }, approved ? 'Modification approved' : 'Modification rejected')
  );
});

/**
 * Raise a dispute
 * POST /api/bookings/:bookingId/dispute
 */
export const raiseDispute = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const userId = req.user._id;

  const booking = await bookingService.raiseDispute(bookingId, userId, req.body);

  res.status(200).json(
    new ApiResponse(200, { booking }, 'Dispute raised successfully')
  );
});

/**
 * Get booking statistics for current user
 * GET /api/bookings/stats
 */
export const getMyBookingStats = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const role = req.user.role;

  const query = role === USER_ROLES.CAREGIVER
    ? { caregiverId: userId }
    : { careSeekerId: userId };

  const [total, pending, confirmed, inProgress, completed, cancelled] = await Promise.all([
    Booking.countDocuments(query),
    Booking.countDocuments({ ...query, status: BOOKING_STATUS.PENDING }),
    Booking.countDocuments({ ...query, status: BOOKING_STATUS.CONFIRMED }),
    Booking.countDocuments({ ...query, status: BOOKING_STATUS.IN_PROGRESS }),
    Booking.countDocuments({ ...query, status: BOOKING_STATUS.COMPLETED }),
    Booking.countDocuments({ ...query, status: BOOKING_STATUS.CANCELLED }),
  ]);

  res.status(200).json(
    new ApiResponse(200, {
      total,
      pending,
      confirmed,
      inProgress,
      completed,
      cancelled,
    }, 'Booking stats fetched successfully')
  );
});

// ============================================
// ADMIN BOOKING CONTROLLERS
// ============================================

/**
 * Get all bookings (Admin)
 * GET /api/admin/bookings
 */
export const getAllBookings = asyncHandler(async (req, res) => {
  const result = await bookingService.getAllBookings(req.query);

  res.status(200).json(
    new ApiResponse(200, result, 'Bookings fetched successfully')
  );
});

/**
 * Get booking details (Admin)
 * GET /api/admin/bookings/:bookingId
 */
export const getBookingDetails = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;

  const booking = await bookingService.getBookingById(bookingId);

  res.status(200).json(
    new ApiResponse(200, { booking }, 'Booking details fetched successfully')
  );
});

/**
 * Update booking status (Admin)
 * PATCH /api/admin/bookings/:bookingId/status
 */
export const updateBookingStatus = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const { status } = req.body;
  const adminId = req.user._id;

  const booking = await Booking.findById(bookingId);

  if (!booking) {
    throw ApiError.notFound('Booking not found');
  }

  const nextStatus = String(status || '').toLowerCase();
  if (!nextStatus) {
    throw ApiError.badRequest('Status is required');
  }

  if (booking.status !== nextStatus) {
    if (!booking.canTransitionTo(nextStatus)) {
      throw ApiError.badRequest(
        `Invalid booking status transition ${booking.status} -> ${nextStatus}`,
      );
    }

    await bookingStateTransitionService.transition(
      booking,
      nextStatus,
      {
        actorId: adminId,
        actorRole: USER_ROLES.ADMIN,
        source: 'booking.updateBookingStatus.admin',
        reason: 'Admin manual status update',
      },
    );
  }

  res.status(200).json(
    new ApiResponse(200, { booking }, 'Booking status updated')
  );
});

/**
 * Resolve dispute (Admin)
 * POST /api/admin/bookings/:bookingId/resolve-dispute
 */
export const resolveDispute = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const adminId = req.user._id;
  const { resolution, refundAmount } = req.body;

  const booking = await bookingService.resolveDispute(
    bookingId,
    adminId,
    resolution,
    refundAmount
  );

  res.status(200).json(
    new ApiResponse(200, { booking }, 'Dispute resolved successfully')
  );
});

/**
 * Get calendar events
 * GET /api/bookings/calendar
 */
export const getCalendarEvents = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const role = req.user.role;
  const { startDate, endDate } = req.query;

  const events = await bookingService.getCalendarEvents(userId, role, startDate, endDate);

  res.status(200).json(
    new ApiResponse(200, { events }, 'Calendar events fetched successfully')
  );
});

/**
 * Get all calendar events (Admin)
 * GET /api/admin/bookings/calendar
 */
export const getAdminCalendarEvents = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const events = await bookingService.getCalendarEvents(null, null, startDate, endDate);

  res.status(200).json(
    new ApiResponse(200, { events }, 'Calendar events fetched successfully')
  );
});

/**
 * Get booking statistics (Admin)
 * GET /api/admin/bookings/stats
 */
export const getBookingStats = asyncHandler(async (req, res) => {
  const stats = await bookingService.getBookingStats();

  res.status(200).json(
    new ApiResponse(200, { stats }, 'Booking statistics fetched successfully')
  );
});

/**
 * Cancel booking as admin
 * POST /api/admin/bookings/:bookingId/cancel
 */
export const adminCancelBooking = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const adminId = req.user._id;
  const { reason } = req.body;

  const booking = await Booking.findById(bookingId);

  if (!booking) {
    throw ApiError.notFound('Booking not found');
  }

  if (!reason || !String(reason).trim()) {
    throw ApiError.badRequest('Cancellation reason is required');
  }

  if (!booking.canBeCancelled()) {
    throw ApiError.badRequest(
      `Booking cannot be cancelled from current status: ${booking.status}`,
    );
  }

  await bookingStateTransitionService.transition(
    booking,
    BOOKING_STATUS.CANCELLED,
    {
      actorId: adminId,
      actorRole: USER_ROLES.ADMIN,
      source: 'booking.adminCancelBooking',
      reason: reason ? `Admin cancellation: ${reason}` : 'Admin cancellation',
      metadata: {
        refundAmount: 0,
      },
    },
  );

  booking.cancellation = {
    cancelledBy: adminId,
    reason: `Admin cancellation: ${reason}`,
    cancelledAt: new Date(),
    refundRequestedAt: new Date(),
    refundProcessedAt: null,
    refundDecisionReason: 'Admin cancellation does not issue refunds',
    refundWindowHours: 4,
    refundAmount: 0,
    refundStatus: 'rejected',
  };

  await booking.save();

  // Notify both parties
  await bookingService.sendBookingNotification(
    booking,
    'booking_cancelled',
    booking.careSeekerId
  );
  await bookingService.sendBookingNotification(
    booking,
    'booking_cancelled',
    booking.caregiverId
  );

  res.status(200).json(
    new ApiResponse(200, { booking }, 'Booking cancelled by admin')
  );
});

