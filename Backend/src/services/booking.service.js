// ============================================
// BOOKING SERVICE
// Business logic for booking operations
// ============================================

import mongoose from "mongoose";
import Booking from "../models/booking.model.js";
import User from "../models/user.model.js";
import Caregiver from "../models/caregiver.model.js";
import CareSeeker from "../models/careseeker.model.js";
import Notification from "../models/notification.model.js";
import {
  BOOKING_STATUS,
  BOOKING_TYPE,
  CANCELLATION_POLICY,
  NOTIFICATION_TYPE,
  PLATFORM_FEE_PERCENTAGE,
  RESERVATION_CONFIG,
  STATE_TRANSITIONS,
} from "../constants/booking.constants.js";
import { USER_ROLES } from "../constants/index.js";
import { ApiError } from "../utils/apiResponse.js";
import emailService from "./email.service.js";
import chatService from "./chat.service.js";
import chatAccessService from "./chatAccess.service.js";
import availabilityService from "./availability.service.js";
import slotService from "./slot.service.js";
import refundService from "./refund.service.js";
import ledgerService from "./ledger.service.js";
import trustService from "./trust.service.js";
import autoReplacementService from "./autoReplacement.service.js";
import bookingStateTransitionService from "./bookingStateTransition.service.js";
import bookingDayService from "./bookingDay.service.js";
import { emitWalletUpdate } from "../config/socket.js";
import {
  CONVERSATION_STATUS,
  CHAT_ACCESS_REASON,
} from "../constants/chat.constants.js";
import { eventBus, SYSTEM_EVENTS } from "../utils/eventBus.js";
import agreementService from "./agreement.service.js";

const TRACKING_STATUS = {
  PENDING: "PENDING",
  SUBMITTED: "SUBMITTED",
  FLAGGED: "FLAGGED",
};

const TRACKING_WORKFLOW_STATUS = {
  LOG_PENDING: "LOG_PENDING",
  LOG_SUBMITTED: "LOG_SUBMITTED",
  LOG_MISSED: "LOG_MISSED",
};

const TRACKING_ALLOWED_STATUSES = [
  BOOKING_STATUS.CONFIRMED,
  BOOKING_STATUS.ACTIVE,
  BOOKING_STATUS.IN_PROGRESS,
  BOOKING_STATUS.COMPLETED,
];

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const toDateOnly = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const toDateKey = (value) => {
  const date = toDateOnly(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const inDateRange = (targetDate, startDate, endDate) => {
  const target = toDateOnly(targetDate);
  const start = toDateOnly(startDate);
  const end = toDateOnly(endDate || startDate);
  return target >= start && target <= end;
};

const toDayBounds = (dateValue) => {
  const start = toDateOnly(dateValue);
  const end = new Date(start.getTime() + ONE_DAY_MS - 1);
  return { start, end };
};

class BookingService {
  emitAvailabilityRealtimeUpdate(caregiverId, schedule, type, bookingId = null) {
    try {
      const io = global.__careconnect_io;
      if (!io || !caregiverId) return;

      const caregiverKey = caregiverId.toString();
      io.to(`caregiver_availability_${caregiverKey}`).emit('availability_updated', {
        caregiverId: caregiverKey,
        changes: {
          type,
          schedule,
          bookingId: bookingId ? bookingId.toString() : null,
        },
        timestamp: new Date(),
      });
    } catch (error) {
      console.error(
        '[BookingService] Failed to emit availability realtime update:',
        error.message,
      );
    }
  }

  toSafeNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  resolveBookingTotalAmount(booking) {
    if (!booking) return 0;

    const topLevelTotal = this.toSafeNumber(booking.totalAmount);
    const pricingTotalAmount = this.toSafeNumber(booking.pricing?.totalAmount);
    const pricingTotal = this.toSafeNumber(booking.pricing?.total);
    const subtotal = this.toSafeNumber(booking.pricing?.subtotal);
    const platformFee = this.toSafeNumber(booking.pricing?.platformFee);
    const taxes = this.toSafeNumber(booking.pricing?.taxes);
    const computedTotal = subtotal + platformFee + taxes;

    return (
      [topLevelTotal, pricingTotalAmount, pricingTotal, computedTotal].find(
        (amount) => amount > 0,
      ) || 0
    );
  }

  normalizeBookingFinancials(booking) {
    if (!booking) return booking;

    const resolvedTotal = this.resolveBookingTotalAmount(booking);
    const amountPaid = this.toSafeNumber(
      booking.amountPaid ?? booking.payment?.amountPaid,
    );
    const amountDue = Math.max(resolvedTotal - amountPaid, 0);

    booking.totalAmount = resolvedTotal;
    booking.amountPaid = amountPaid;

    if (booking.pricing) {
      booking.pricing.totalAmount = resolvedTotal;
      if (this.toSafeNumber(booking.pricing.total) <= 0 && resolvedTotal > 0) {
        booking.pricing.total = resolvedTotal;
      }
    }

    booking.amountDue = amountDue;

    if (booking.payment) {
      booking.payment.amountPaid = amountPaid;
      booking.payment.amountDue = amountDue;
    }

    return booking;
  }

  isBookingPaymentSettled(booking) {
    if (!booking) return false;

    const paymentStatus = String(
      booking.paymentStatus ?? booking.payment?.status ?? "",
    ).toLowerCase();

    if (
      ["fully_paid", "completed", "paid", "refunded", "released"].includes(
        paymentStatus,
      )
    ) {
      return true;
    }

    const amountPaid = this.toSafeNumber(
      booking.amountPaid ?? booking.payment?.amountPaid,
    );
    const amountDueRaw = booking.amountDue ?? booking.payment?.amountDue;
    const parsedAmountDue = Number(amountDueRaw);
    const amountDue = Number.isFinite(parsedAmountDue)
      ? Math.max(0, parsedAmountDue)
      : Math.max(0, this.resolveBookingTotalAmount(booking) - amountPaid);
    const hasReachedConfirmedLifecycle = [
      BOOKING_STATUS.CONFIRMED,
      BOOKING_STATUS.ACTIVE,
      BOOKING_STATUS.IN_PROGRESS,
      BOOKING_STATUS.COMPLETED,
    ].includes(booking.status);

    return amountDue <= 0 && (amountPaid > 0 || hasReachedConfirmedLifecycle);
  }

  async assertCareSeekerBookingAccess(careSeekerId) {
    const restricted = await trustService.isCareSeekerRestricted(careSeekerId);
    if (restricted) {
      throw new Error(
        "Booking creation is temporarily restricted due to repeated cancellations in the last 30 days. Please contact support.",
      );
    }
  }

  async assertCaregiverAcceptingBookings(caregiverUserId) {
    const suspended = await trustService.isCaregiverSuspended(caregiverUserId);
    if (suspended) {
      throw new Error(
        "This caregiver is currently suspended and cannot accept new bookings.",
      );
    }
  }

  /**
   * Create a new booking request with RESERVATION flow
   * Uses MongoDB transaction to prevent double-booking
   */
  async createBooking(bookingData, careSeekerId) {
    await this.assertCareSeekerBookingAccess(careSeekerId);

    // Check concurrent reservations limit for this user
    const activeReservations = await Booking.countDocuments({
      careSeekerId,
      status: BOOKING_STATUS.RESERVED,
    });

    if (activeReservations >= RESERVATION_CONFIG.MAX_CONCURRENT_RESERVATIONS) {
      throw new Error(
        `You have ${activeReservations} active reservations. Please complete or cancel existing reservations before creating new ones.`,
      );
    }

    // Get caregiver details for pricing
    const caregiver = await Caregiver.findById(bookingData.caregiverId);
    if (!caregiver) {
      throw new Error("Caregiver not found");
    }

    // The Booking model references the User, not the Caregiver document
    const caregiverUserId = caregiver.userId;

    // Sprint C: block bookings for suspended caregivers
    await this.assertCaregiverAcceptingBookings(caregiverUserId);

    // Check slot availability with conflict detection
    const availabilityCheck = await availabilityService.checkSlotAvailability(
      caregiverUserId,
      bookingData.schedule,
      null,
    );

    if (!availabilityCheck.available) {
      const unavailableError = new Error(
        availabilityCheck.blockedDate
          ? `The caregiver has blocked this date. ${availabilityCheck.reason}`
          : `Time slot is not available. ${availabilityCheck.reason}. Conflicting bookings: ${availabilityCheck.conflicts.map((c) => c.bookingNumber).join(", ")}`,
      );
      unavailableError.code = 'CARE_GIVER_UNAVAILABLE';
      unavailableError.statusCode = 409;

      if (availabilityCheck.blockedDate) {
        throw unavailableError;
      }
      throw unavailableError;
    }

    // Generate unique booking number
    const bookingNumber = await Booking.generateBookingNumber();

    // Get care seeker details
    const careSeeker = await CareSeeker.findOne({ userId: careSeekerId });

    // Get User model as fallback for rates
    const caregiverUser = await User.findById(caregiverUserId);

    // Build pricing object with fallback to User model rates
    const caregiverPricing = {
      hourly: caregiver.hourlyRate || caregiverUser?.hourlyRate || 0,
      daily: caregiver.dailyRate || caregiverUser?.dailyRate || 0,
      weekly: caregiver.weeklyRate || caregiverUser?.weeklyRate || 0,
      monthly: caregiver.monthlyRate || caregiverUser?.monthlyRate || 0,
      currency: caregiver.currency || caregiverUser?.currency || "NPR",
    };

    // Determine rate type from booking data
    const rateType =
      bookingData.pricing?.rateType || bookingData.durationType || "hourly";

    // Validate that the caregiver has a rate set
    const rateForType =
      caregiverPricing[
        rateType === "half_day" || rateType === "full_day" ? "daily" : rateType
      ] ||
      caregiverPricing.hourly ||
      caregiverPricing.daily;

    if (!rateForType || rateForType <= 0) {
      throw new Error(
        `Caregiver has not set their ${rateType} rate. Please contact the caregiver to set their pricing before booking.`,
      );
    }

    // Calculate pricing
    const pricing = this.calculatePricing(
      bookingData.durationType,
      bookingData.schedule,
      caregiverPricing,
      rateType,
    );

    if (!pricing.total || pricing.total <= 0) {
      throw new Error(
        "Unable to calculate booking price. Please ensure the caregiver has set their service rates.",
      );
    }

    // Calculate reservation expiry time
    const reservationExpiry = new Date();
    reservationExpiry.setMinutes(
      reservationExpiry.getMinutes() + RESERVATION_CONFIG.HOLD_DURATION_MINUTES,
    );

    // Create booking with RESERVED status
    const booking = new Booking({
      bookingNumber,
      careSeekerId,
      caregiverId: caregiverUserId,
      careRecipient: bookingData.careRecipient,
      serviceType: bookingData.serviceType,
      bookingType: bookingData.bookingType || BOOKING_TYPE.ONE_TIME,
      status: BOOKING_STATUS.RESERVED,
      reservedAt: new Date(),
      reservationExpiry,
      extensionCount: 0,
      schedule: bookingData.schedule,
      durationType: bookingData.durationType,
      location: bookingData.location,
      pricing,
      agreement: {
        agreementId: `AGR-${bookingNumber}`,
        status: "pending",
        accepted: false,
        version: "v1",
      },
      careInstructions: bookingData.careInstructions,
      notes: bookingData.notes,
    });

    await booking.save();

    // Family-side agreement must be available before request submission.
    await agreementService.ensureAgreementDraft(booking._id);

    this.emitAvailabilityRealtimeUpdate(
      caregiverUserId,
      booking.schedule,
      'slot_reserved',
      booking._id,
    );

    // Return booking with reservation info
    return {
      ...booking.toObject(),
      reservationInfo: {
        expiresAt: reservationExpiry,
        remainingSeconds: booking.getReservationRemainingSeconds(),
        maxExtensions: RESERVATION_CONFIG.MAX_EXTENSIONS,
        extensionsUsed: 0,
      },
    };
  }

  /**
   * Submit reservation - converts RESERVED to PENDING
   * Called when user is ready to submit the booking request
   */
  async submitReservation(bookingId, careSeekerId) {
    await this.assertCareSeekerBookingAccess(careSeekerId);

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      throw new Error("Booking not found");
    }

    if (booking.careSeekerId.toString() !== careSeekerId.toString()) {
      throw new Error("Not authorized to submit this reservation");
    }

    if (booking.status !== BOOKING_STATUS.RESERVED) {
      throw new Error(
        `Cannot submit reservation with status: ${booking.status}`,
      );
    }

    // Check if reservation has expired
    if (booking.isReservationExpired()) {
      await bookingStateTransitionService.transition(
        booking,
        BOOKING_STATUS.EXPIRED,
        {
          actorId: careSeekerId,
          actorRole: 'careseeker',
          source: 'booking.submitReservation',
          reason: 'Reservation expired before submit',
        },
      );
      throw new Error("Reservation has expired. Please create a new booking.");
    }

    // Family-side agreement acceptance is mandatory before request submission.
    if (!booking.agreement?.content) {
      await agreementService.ensureAgreementDraft(booking._id);
    }

    if (!booking.agreement?.seekerAccepted) {
      const agreementError = new Error(
        'Please review and accept the agreement before submitting your booking request.',
      );
      agreementError.code = 'AGREEMENT_ACCEPTANCE_REQUIRED';
      agreementError.statusCode = 409;
      throw agreementError;
    }

    // Re-check availability (in case of race condition during reservation period)
    const availabilityCheck = await availabilityService.checkSlotAvailability(
      booking.caregiverId,
      booking.schedule,
      booking._id, // Exclude this booking from conflict check
    );

    if (!availabilityCheck.available) {
      // Mark as expired since slot is no longer available
      await bookingStateTransitionService.transition(
        booking,
        BOOKING_STATUS.EXPIRED,
        {
          actorId: careSeekerId,
          actorRole: 'careseeker',
          source: 'booking.submitReservation',
          reason: 'Reservation slot became unavailable during submit',
          metadata: {
            availabilityReason: availabilityCheck.reason,
          },
        },
      );
      const unavailableError = new Error(
        `Time slot is no longer available. ${availabilityCheck.reason}`,
      );
      unavailableError.code = 'CARE_GIVER_UNAVAILABLE';
      unavailableError.statusCode = 409;
      throw unavailableError;
    }

    // Convert to PENDING status
    booking.reservationExpiry = null; // Clear expiry
    await bookingStateTransitionService.transition(
      booking,
      BOOKING_STATUS.PENDING,
      {
        actorId: careSeekerId,
        actorRole: 'careseeker',
        source: 'booking.submitReservation',
        reason: 'Reservation submitted by care seeker',
      },
    );

    this.emitAvailabilityRealtimeUpdate(
      booking.caregiverId,
      booking.schedule,
      'slot_pending',
      booking._id,
    );

    // Emit real-time booking-created event to both parties
    try {
      eventBus.emitToBookingParties(booking, SYSTEM_EVENTS.BOOKING_CREATED, {
        bookingNumber: booking.bookingNumber,
        status: booking.status,
        serviceType: booking.serviceType,
        startDate: booking.schedule?.startDate,
        message:
          "A new booking request has been submitted and is awaiting caregiver response.",
      });
    } catch (emitErr) {
      console.error(
        "[BookingService] Failed to emit BOOKING_CREATED:",
        emitErr.message,
      );
    }

    // Get caregiver user for notifications
    const caregiverUser = await User.findById(booking.caregiverId);
    const careSeekerUser = await User.findById(careSeekerId);

    // Send notification to caregiver
    await this.sendBookingNotification(
      booking,
      NOTIFICATION_TYPE.BOOKING_REQUEST,
      booking.caregiverId,
    );

    // Send email to caregiver
    if (caregiverUser) {
      try {
        await emailService.sendBookingRequestEmail(
          caregiverUser.email,
          caregiverUser.fullName,
          {
            _id: booking._id,
            bookingNumber: booking.bookingNumber,
            careSeekerName: careSeekerUser?.fullName || "A care seeker",
            serviceType: booking.serviceType,
            startDate: booking.schedule.startDate,
            endDate: booking.schedule.endDate,
            location: booking.location.city,
            totalAmount: this.resolveBookingTotalAmount(booking),
          },
        );
      } catch (emailError) {
        console.error("Failed to send booking request email:", emailError);
      }
    }

    return booking;
  }

  /**
   * Extend reservation time
   * Adds additional time before expiry
   */
  async extendReservation(bookingId, careSeekerId) {
    await this.assertCareSeekerBookingAccess(careSeekerId);

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      throw new Error("Booking not found");
    }

    if (booking.careSeekerId.toString() !== careSeekerId.toString()) {
      throw new Error("Not authorized to extend this reservation");
    }

    if (booking.status !== BOOKING_STATUS.RESERVED) {
      throw new Error("Can only extend reservations in reserved status");
    }

    if (!booking.canExtendReservation(RESERVATION_CONFIG.MAX_EXTENSIONS)) {
      throw new Error(
        `Maximum extension limit reached (${RESERVATION_CONFIG.MAX_EXTENSIONS} extensions allowed)`,
      );
    }

    // Check if already expired
    if (booking.isReservationExpired()) {
      await bookingStateTransitionService.transition(
        booking,
        BOOKING_STATUS.EXPIRED,
        {
          actorId: careSeekerId,
          actorRole: 'careseeker',
          source: 'booking.extendReservation',
          reason: 'Reservation expired before extension',
        },
      );
      throw new Error("Reservation has already expired");
    }

    // Extend expiry time
    const newExpiry = new Date(booking.reservationExpiry);
    newExpiry.setMinutes(
      newExpiry.getMinutes() + RESERVATION_CONFIG.EXTENSION_MINUTES,
    );

    booking.reservationExpiry = newExpiry;
    booking.extensionCount += 1;

    await booking.save();

    return {
      ...booking.toObject(),
      reservationInfo: {
        expiresAt: newExpiry,
        remainingSeconds: booking.getReservationRemainingSeconds(),
        maxExtensions: RESERVATION_CONFIG.MAX_EXTENSIONS,
        extensionsUsed: booking.extensionCount,
      },
    };
  }

  /**
   * Check availability for a time slot (public API)
   */
  async checkAvailability(caregiverId, schedule) {
    // Resolve caregiver user ID if a Caregiver document ID is provided
    let caregiverUserId = caregiverId;

    const caregiver = await Caregiver.findById(caregiverId);
    if (caregiver) {
      caregiverUserId = caregiver.userId;
    }

    const isSuspended = await trustService.isCaregiverSuspended(caregiverUserId);
    if (isSuspended) {
      return {
        available: false,
        status: 'CARE_GIVER_UNAVAILABLE',
        reason: "This caregiver is currently suspended and cannot accept new bookings.",
        conflicts: [],
      };
    }

    return availabilityService.checkSlotAvailability(caregiverUserId, schedule);
  }

  /**
   * Expire a reservation (called by cron job or timeout)
   */
  async expireReservation(bookingId) {
    const booking = await Booking.findById(bookingId);

    if (!booking || booking.status !== BOOKING_STATUS.RESERVED) {
      return null;
    }

    await bookingStateTransitionService.transition(
      booking,
      BOOKING_STATUS.EXPIRED,
      {
        source: 'booking.expireReservation',
        reason: 'Reservation expired by scheduler',
      },
    );

    this.emitAvailabilityRealtimeUpdate(
      booking.caregiverId,
      booking.schedule,
      'slot_released',
      booking._id,
    );

    // Notify user
    await this.sendBookingNotification(
      booking,
      NOTIFICATION_TYPE.RESERVATION_EXPIRED,
      booking.careSeekerId,
    );

    return booking;
  }

  /**
   * Calculate pricing for booking
   * Uses smart fallback: if requested rate type is not set, falls back to hourly rate
   */
  calculatePricing(durationType, schedule, caregiverPricing, rateType) {
    const startDate = new Date(schedule.startDate);
    const endDate = new Date(schedule.endDate);

    // Calculate duration - ensure minimum 1 hour/day
    const diffMs = Math.max(endDate - startDate, 0);
    const diffHours = Math.max(diffMs / (1000 * 60 * 60), 1);
    const diffDays = Math.max(diffMs / (1000 * 60 * 60 * 24), 1);

    let rate = 0;
    let subtotal = 0;
    let totalHours = diffHours;
    let totalDays = Math.ceil(diffDays);
    let effectiveRateType = rateType;

    // Smart rate selection with fallback
    // Priority: requested rate type > hourly > daily > any available rate
    const getEffectiveRate = (requestedType) => {
      const rateMap = {
        hourly: caregiverPricing?.hourly || 0,
        daily: caregiverPricing?.daily || 0,
        weekly: caregiverPricing?.weekly || 0,
        monthly: caregiverPricing?.monthly || 0,
      };

      // Try requested rate type first
      if (rateMap[requestedType] > 0) {
        return { rate: rateMap[requestedType], type: requestedType };
      }

      // Fallback to hourly if available
      if (rateMap.hourly > 0) {
        return { rate: rateMap.hourly, type: "hourly" };
      }

      // Fallback to daily rate converted to hourly equivalent
      if (rateMap.daily > 0) {
        return { rate: rateMap.daily / 8, type: "hourly" }; // Assume 8-hour day
      }

      // Find any available rate
      for (const [type, rateValue] of Object.entries(rateMap)) {
        if (rateValue > 0) {
          return { rate: rateValue, type };
        }
      }

      return { rate: 0, type: requestedType };
    };

    const { rate: effectiveRate, type: resolvedType } =
      getEffectiveRate(rateType);
    rate = effectiveRate;
    effectiveRateType = resolvedType;

    switch (effectiveRateType) {
      case "hourly":
        subtotal = rate * diffHours;
        break;
      case "daily":
      case "half_day":
      case "full_day":
        subtotal = rate * totalDays;
        totalHours = totalDays * 24;
        break;
      case "weekly":
        const weeks = Math.ceil(diffDays / 7);
        subtotal = rate * weeks;
        totalHours = weeks * 7 * 24;
        break;
      case "monthly":
        const months = Math.ceil(diffDays / 30);
        subtotal = rate * months;
        totalHours = months * 30 * 24;
        break;
      default:
        subtotal = rate * diffHours;
    }

    // Ensure subtotal is a valid positive number
    subtotal = Math.max(subtotal, 0);

    const platformFee = (subtotal * PLATFORM_FEE_PERCENTAGE) / 100;
    const total = subtotal + platformFee;

    return {
      rateType: effectiveRateType, // Use the actual rate type that was applied
      baseRate: rate, // Original rate for display
      rate, // Rate per unit
      totalHours: Math.max(totalHours, 0),
      totalDays, // Total days for daily calculations
      subtotal: Math.round(subtotal * 100) / 100, // Round to 2 decimal places
      platformFee: Math.round(platformFee * 100) / 100,
      platformFeePercentage: PLATFORM_FEE_PERCENTAGE,
      taxes: 0,
      total: Math.round(total * 100) / 100,
      currency: caregiverPricing?.currency || "NPR",
    };
  }

  /**
   * Get booking by ID with populated references
   */
  async getBookingById(bookingId, userId = null) {
    const booking = await Booking.findById(bookingId)
      .populate("careSeekerId", "fullName email phone avatar")
      .populate(
        "caregiverId",
        "fullName email phone avatar hourlyRate dailyRate weeklyRate monthlyRate",
      );

    if (!booking) {
      throw new Error("Booking not found");
    }

    // Check access rights if userId provided
    if (userId) {
      const user = await User.findById(userId);
      const isInvolved =
        booking.careSeekerId._id.toString() === userId.toString() ||
        booking.caregiverId._id.toString() === userId.toString() ||
        user?.role === USER_ROLES.ADMIN;

      if (!isInvolved) {
        throw new Error("Not authorized to view this booking");
      }
    }

    const bookingObj = booking.toObject();

    if (
      bookingObj.agreement &&
      (bookingObj.agreement.accepted === true ||
        bookingObj.agreement.status === "accepted")
    ) {
      const acceptedAt =
        bookingObj.agreement.acceptedAt ||
        bookingObj.agreement.caregiverAcceptedAt ||
        bookingObj.agreement.seekerAcceptedAt ||
        new Date().toISOString();

      bookingObj.agreement.accepted = true;
      bookingObj.agreement.status = "accepted";
      bookingObj.agreement.seekerAccepted = true;
      bookingObj.agreement.caregiverAccepted = true;
      bookingObj.agreement.acceptedAt = bookingObj.agreement.acceptedAt || acceptedAt;
      bookingObj.agreement.seekerAcceptedAt =
        bookingObj.agreement.seekerAcceptedAt || acceptedAt;
      bookingObj.agreement.caregiverAcceptedAt =
        bookingObj.agreement.caregiverAcceptedAt || acceptedAt;
    }

    // If pricing.rate is 0, try to get caregiver's current rate as fallback
    if (
      bookingObj.pricing &&
      (!bookingObj.pricing.rate || bookingObj.pricing.rate === 0)
    ) {
      const caregiverRates = {
        hourly: bookingObj.caregiverId?.hourlyRate || 0,
        daily: bookingObj.caregiverId?.dailyRate || 0,
        weekly: bookingObj.caregiverId?.weeklyRate || 0,
        monthly: bookingObj.caregiverId?.monthlyRate || 0,
      };

      // Set the fallback rate based on rateType
      const rateType = bookingObj.pricing.rateType || "hourly";
      const fallbackRate =
        caregiverRates[rateType] || caregiverRates.hourly || 0;

      // Add fallback rate info to the booking object (without modifying DB)
      bookingObj.caregiverCurrentRate = fallbackRate;
      bookingObj.caregiverRates = caregiverRates;
    }

    return this.normalizeBookingFinancials(bookingObj);
  }

  /**
   * Get bookings for a user (caregiver or care seeker)
   */
  async getUserBookings(userId, role, filters = {}) {
    const query = {};

    // Filter by role
    if (role === USER_ROLES.CAREGIVER) {
      query.caregiverId = userId;
    } else if (role === USER_ROLES.CARESEEKER) {
      query.careSeekerId = userId;
    }

    // Apply status filter
    if (filters.status) {
      query.status = filters.status;
    }

    // Apply date filters
    if (filters.startDate) {
      query["schedule.startDate"] = { $gte: new Date(filters.startDate) };
    }
    if (filters.endDate) {
      query["schedule.endDate"] = { $lte: new Date(filters.endDate) };
    }

    // Pagination
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 10;
    const skip = (page - 1) * limit;

    // Sorting
    const sortBy = filters.sortBy || "createdAt";
    const sortOrder = filters.sortOrder === "asc" ? 1 : -1;

    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .populate("careSeekerId", "fullName email avatar")
        .populate(
          "caregiverId",
          "fullName email avatar hourlyRate dailyRate weeklyRate monthlyRate",
        )
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit),
      Booking.countDocuments(query),
    ]);

    // Add caregiver rate fallback for bookings with zero rate
    const enhancedBookings = bookings.map((booking) => {
      const bookingObj = booking.toObject();

      if (
        bookingObj.agreement &&
        (bookingObj.agreement.accepted === true ||
          bookingObj.agreement.status === "accepted")
      ) {
        const acceptedAt =
          bookingObj.agreement.acceptedAt ||
          bookingObj.agreement.caregiverAcceptedAt ||
          bookingObj.agreement.seekerAcceptedAt ||
          new Date().toISOString();

        bookingObj.agreement.accepted = true;
        bookingObj.agreement.status = "accepted";
        bookingObj.agreement.seekerAccepted = true;
        bookingObj.agreement.caregiverAccepted = true;
        bookingObj.agreement.acceptedAt =
          bookingObj.agreement.acceptedAt || acceptedAt;
        bookingObj.agreement.seekerAcceptedAt =
          bookingObj.agreement.seekerAcceptedAt || acceptedAt;
        bookingObj.agreement.caregiverAcceptedAt =
          bookingObj.agreement.caregiverAcceptedAt || acceptedAt;
      }

      if (
        bookingObj.pricing &&
        (!bookingObj.pricing.rate || bookingObj.pricing.rate === 0)
      ) {
        const caregiverRates = {
          hourly: bookingObj.caregiverId?.hourlyRate || 0,
          daily: bookingObj.caregiverId?.dailyRate || 0,
          weekly: bookingObj.caregiverId?.weeklyRate || 0,
          monthly: bookingObj.caregiverId?.monthlyRate || 0,
        };

        const rateType = bookingObj.pricing.rateType || "hourly";
        bookingObj.caregiverCurrentRate =
          caregiverRates[rateType] || caregiverRates.hourly || 0;
        bookingObj.caregiverRates = caregiverRates;
      }

      this.normalizeBookingFinancials(bookingObj);

      return bookingObj;
    });

    return {
      bookings: enhancedBookings,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get calendar events for bookings
   */
  async getCalendarEvents(userId, role, startDate, endDate) {
    const query = {};

    // Filter by role
    if (role === USER_ROLES.CAREGIVER) {
      query.caregiverId = userId;
    } else if (role === USER_ROLES.CARESEEKER) {
      query.careSeekerId = userId;
    }
    // Admin sees all bookings

    // Date range filter
    if (startDate && endDate) {
      query["schedule.startDate"] = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Include reserved bookings on calendar for the user who made them
    query.status = {
      $in: ["reserved", "pending", "confirmed", "in_progress", "completed"],
    };

    const bookings = await Booking.find(query)
      .populate("careSeekerId", "fullName email avatar")
      .populate("caregiverId", "fullName email avatar")
      .select(
        "bookingNumber status schedule serviceType careSeekerId caregiverId pricing reservationExpiry",
      )
      .sort({ "schedule.startDate": 1 });

    // Transform to calendar event format
    return bookings.map((booking) => ({
      id: booking._id,
      title: `${booking.bookingNumber} - ${booking.serviceType.replace("_", " ")}`,
      start: booking.schedule.startDate,
      end: booking.schedule.endDate,
      startTime: booking.schedule.startTime,
      endTime: booking.schedule.endTime,
      status: booking.status,
      serviceType: booking.serviceType,
      careSeeker: booking.careSeekerId,
      caregiver: booking.caregiverId,
      pricing: booking.pricing,
      bookingNumber: booking.bookingNumber,
      reservationExpiry: booking.reservationExpiry,
    }));
  }

  /**
   * Reject a booking (by caregiver)
   */
  async rejectBooking(bookingId, caregiverId, reason) {
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      throw new Error("Booking not found");
    }

    // Handle both populated and non-populated caregiverId
    const bookingCaregiverId = booking.caregiverId._id
      ? booking.caregiverId._id.toString()
      : booking.caregiverId.toString();

    if (bookingCaregiverId !== caregiverId.toString()) {
      throw new Error("Not authorized to reject this booking");
    }

    if (booking.status !== BOOKING_STATUS.PENDING) {
      throw new Error(`Cannot reject booking with status: ${booking.status}`);
    }

    booking.cancellation = {
      cancelledBy: caregiverId,
      reason,
      cancelledAt: new Date(),
    };
    await bookingStateTransitionService.transition(
      booking,
      BOOKING_STATUS.REJECTED,
      {
        actorId: caregiverId,
        actorRole: 'caregiver',
        source: 'booking.rejectBooking',
        reason: reason || 'Booking rejected by caregiver',
      },
    );

    this.emitAvailabilityRealtimeUpdate(
      booking.caregiverId,
      booking.schedule,
      'slot_released',
      booking._id,
    );

    // Notify care seeker
    await this.sendBookingNotification(
      booking,
      NOTIFICATION_TYPE.BOOKING_REJECTED,
      booking.careSeekerId,
    );

    return booking;
  }

  /**
   * Cancel a booking
   */
  async cancelBooking(bookingId, userId, reason) {
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      throw new Error("Booking not found");
    }

    // Check if user is involved in booking
    const bookingCareSeekerId = booking.careSeekerId._id
      ? booking.careSeekerId._id.toString()
      : booking.careSeekerId.toString();
    const bookingCaregiverId = booking.caregiverId._id
      ? booking.caregiverId._id.toString()
      : booking.caregiverId.toString();

    const isCareSeeker = bookingCareSeekerId === userId.toString();
    const isCaregiver = bookingCaregiverId === userId.toString();

    if (!isCareSeeker && !isCaregiver) {
      throw new Error("Not authorized to cancel this booking");
    }

    // Allow cancelling reserved bookings without refund calculation
    if (booking.status === BOOKING_STATUS.RESERVED) {
      booking.cancellation = {
        cancelledBy: userId,
        reason: reason || "Reservation cancelled",
        cancelledAt: new Date(),
        refundAmount: 0,
        refundStatus: "denied",
        cancellationFee: 0,
      };
      await bookingStateTransitionService.transition(
        booking,
        BOOKING_STATUS.CANCELLED,
        {
          actorId: userId,
          actorRole: isCaregiver ? 'caregiver' : 'careseeker',
          source: 'booking.cancelBooking',
          reason: reason || 'Reservation cancelled',
        },
      );
      this.emitAvailabilityRealtimeUpdate(
        booking.caregiverId,
        booking.schedule,
        'slot_released',
        booking._id,
      );
      return booking;
    }

    this.normalizeBookingFinancials(booking);

    if (!booking.canBeCancelled()) {
      throw new Error(`Cannot cancel booking with status: ${booking.status}`);
    }

    if (!reason || !String(reason).trim()) {
      throw new Error('Cancellation reason is required');
    }

    if (booking.status === BOOKING_STATUS.CANCELLED) {
      throw new Error('Booking has already been cancelled');
    }

    const cancelledByRole = isCaregiver ? "caregiver" : "careseeker";
    const refundResult = await refundService.applyCancellation(booking._id, {
      cancelledBy: userId,
      cancelledByRole,
      reason: String(reason).trim(),
    });

    booking.cancellation = {
      cancelledBy: userId,
      reason: String(reason).trim(),
      cancelledAt: new Date(),
      refundRequestedAt: refundResult.refundRequestedAt || new Date(),
      refundProcessedAt: refundResult.refundProcessedAt || (refundResult.totalRefund > 0 ? new Date() : null),
      refundDecisionReason: refundResult.refundDecisionReason,
      refundWindowEndsAt: refundResult.refundWindowEndsAt || null,
      refundWindowHours: refundResult.refundWindowHours || 4,
      refundAmount: refundResult.totalRefund,
      refundStatus: refundResult.totalRefund > 0 ? 'processed' : 'rejected',
      cancellationFee: Math.max(
        0,
        (booking.amountPaid || 0) - refundResult.totalRefund,
      ),
    };
    await bookingStateTransitionService.transition(
      booking,
      BOOKING_STATUS.CANCELLED,
      {
        actorId: userId,
        actorRole: cancelledByRole,
        source: 'booking.cancelBooking',
        reason: reason || 'Booking cancelled',
        metadata: {
          refundAmount: refundResult.totalRefund,
        },
      },
    );

    if (refundResult.totalRefund > 0) {
      try {
        const io = global.__careconnect_io;
        if (io) {
          const updatedWallet = await ledgerService.getWallet(bookingCareSeekerId);
          if (updatedWallet) {
            emitWalletUpdate(io, bookingCareSeekerId, {
              wallet: updatedWallet,
              event: 'refund_processed',
              bookingId: booking._id,
              amount: refundResult.totalRefund,
            });
          }
        }

        await Notification.createNotification({
          userId: bookingCareSeekerId,
          type: NOTIFICATION_TYPE.REFUND_PROCESSED,
          title: 'Refund Processed',
          message: `Refund of NPR ${refundResult.totalRefund.toFixed(2)} has been credited to your wallet.`,
          priority: 'normal',
          data: {
            referenceId: booking._id,
            referenceType: 'payment',
            actionUrl: '/dashboard/careseeker/wallet',
            metadata: {
              refundAmount: refundResult.totalRefund,
              refundStatus: refundResult.refundStatus,
              refundDecisionReason: refundResult.refundDecisionReason,
            },
          },
          channels: { inApp: true, email: true, push: true },
        });
      } catch (refundNotifyErr) {
        console.error('Failed to notify refund recipient:', refundNotifyErr.message);
      }
    } else if (cancelledByRole === 'careseeker') {
      try {
        await Notification.createNotification({
          userId: bookingCareSeekerId,
          type: NOTIFICATION_TYPE.SYSTEM_UPDATE,
          title: 'Cancellation Processed',
          message: 'Your cancellation was processed without a refund because the 4-hour refund window had expired or the service had already started.',
          priority: 'normal',
          data: {
            referenceId: booking._id,
            referenceType: 'booking',
            actionUrl: `/dashboard/bookings/${booking._id}`,
          },
          channels: { inApp: true, email: true, push: true },
        });
      } catch (refundNotifyErr) {
        console.error('Failed to notify cancellation outcome:', refundNotifyErr.message);
      }
    }

    this.emitAvailabilityRealtimeUpdate(
      booking.caregiverId,
      booking.schedule,
      'slot_released',
      booking._id,
    );

    // Sprint C: trust / strike handling + auto-replacement
    try {
      if (cancelledByRole === "caregiver") {
        const trustResult = await trustService.onCaregiverCancel(
          bookingCaregiverId,
          { reason },
        );
        console.log(
          `[TRUST] Caregiver ${bookingCaregiverId} strikes=${trustResult.strikes} suspended=${trustResult.suspended}`,
        );

        // Suggest replacements to the careseeker
        await autoReplacementService
          .notifyReplacementOptions(booking._id)
          .catch(() => null);
      } else if (cancelledByRole === "careseeker") {
        await trustService.onCareseekerCancel(bookingCareSeekerId);
      }
    } catch (trustErr) {
      console.error("Trust/replacement hook failed:", trustErr.message);
    }

    // Release slots if booking was confirmed
    try {
      await availabilityService.releaseSlotsForBooking(
        bookingCaregiverId,
        booking._id,
      );
    } catch (error) {
      console.error("Failed to release slots:", error);
    }

    // Notify the other party
    const notifyUserId = isCareSeeker
      ? booking.caregiverId
      : booking.careSeekerId;
    await this.sendBookingNotification(
      booking,
      NOTIFICATION_TYPE.BOOKING_CANCELLED,
      notifyUserId,
    );

    // Send automated chat message
    try {
      await chatService.sendBookingSystemMessage(
        booking._id,
        "booking_cancelled",
      );
    } catch (chatError) {
      console.error("Failed to send booking chat message:", chatError);
    }

    // Close the chat when booking is cancelled
    try {
      await chatAccessService.updateChatStatus(
        booking._id,
        CHAT_ACCESS_REASON.BOOKING_CANCELLED,
        CONVERSATION_STATUS.CLOSED,
      );
      console.log(`[Booking] Chat closed for cancelled booking ${booking._id}`);
    } catch (chatError) {
      console.error("Failed to close chat for cancelled booking:", chatError);
    }

    return booking;
  }

  /**
   * Calculate refund amount based on cancellation policy
   */
  calculateRefund(booking) {
    const now = new Date();
    const startDate = new Date(booking.schedule.startDate);
    const hoursUntilStart = (startDate - now) / (1000 * 60 * 60);

    let refundPercentage = 0;
    let cancellationFee = 0;

    if (hoursUntilStart >= CANCELLATION_POLICY.FREE_CANCELLATION_HOURS) {
      // Full refund
      refundPercentage = 100;
    } else if (hoursUntilStart >= CANCELLATION_POLICY.PARTIAL_REFUND_HOURS) {
      // Partial refund
      refundPercentage = CANCELLATION_POLICY.PARTIAL_REFUND_PERCENTAGE;
    } else if (hoursUntilStart >= CANCELLATION_POLICY.NO_REFUND_HOURS) {
      // No refund but no extra fee
      refundPercentage = 0;
    } else {
      // No refund
      refundPercentage = 0;
    }

    const refundAmount = (booking.pricing.total * refundPercentage) / 100;
    cancellationFee = booking.pricing.total - refundAmount;

    return {
      refundAmount,
      refundPercentage,
      cancellationFee,
    };
  }

  /**
   * Start a booking (check-in)
   */
  async checkIn(bookingId, caregiverId, checkInData) {
    const result = await this.checkInTracking(
      bookingId,
      caregiverId,
      checkInData || {},
    );
    return result.booking;
  }

  /**
   * Complete a booking (check-out)
   */
  async checkOut(bookingId, caregiverId, checkOutData) {
    const result = await this.checkOutTracking(
      bookingId,
      caregiverId,
      checkOutData || {},
    );
    return result.booking;
  }

  trackingBadRequest(message, code = "TRACKING_VALIDATION_FAILED") {
    return ApiError.badRequest(message).withCode(code);
  }

  trackingForbidden(message, code = "TRACKING_FORBIDDEN") {
    return ApiError.forbidden(message).withCode(code);
  }

  trackingNotFound(message, code = "TRACKING_NOT_FOUND") {
    return ApiError.notFound(message).withCode(code);
  }

  normalizeTrackingDate(dateInput) {
    let baseDate;

    if (typeof dateInput === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
      const [yearPart, monthPart, dayPart] = dateInput.trim().split("-");
      const year = Number.parseInt(yearPart, 10);
      const month = Number.parseInt(monthPart, 10);
      const day = Number.parseInt(dayPart, 10);
      baseDate = new Date(year, month - 1, day);
    } else {
      baseDate = dateInput ? new Date(dateInput) : new Date();
    }

    if (Number.isNaN(baseDate.getTime())) {
      throw this.trackingBadRequest("Invalid tracking date", "TRACKING_INVALID_DATE");
    }
    baseDate.setHours(0, 0, 0, 0);
    return baseDate;
  }

  findTrackingLog(booking, dateValue) {
    const targetKey = toDateKey(dateValue);
    return booking.trackingLogs.find(
      (log) => toDateKey(log.date) === targetKey,
    );
  }

  ensureTrackingBookingAccess(booking, userId, role) {
    if (role === USER_ROLES.ADMIN) {
      return;
    }

    const caregiverId = booking.caregiverId?._id
      ? booking.caregiverId._id.toString()
      : booking.caregiverId.toString();
    const careSeekerId = booking.careSeekerId?._id
      ? booking.careSeekerId._id.toString()
      : booking.careSeekerId.toString();

    if (
      caregiverId !== userId.toString() &&
      careSeekerId !== userId.toString()
    ) {
      throw this.trackingForbidden(
        "Not authorized to access tracking logs for this booking",
        "TRACKING_ACCESS_DENIED",
      );
    }
  }

  ensureTrackingEnabled(booking) {
    if (!TRACKING_ALLOWED_STATUSES.includes(booking.status)) {
      throw this.trackingBadRequest(
        `Tracking is unavailable for booking status: ${booking.status}`,
        "TRACKING_STATUS_INVALID",
      );
    }

    if (
      !booking.agreement?.accepted ||
      booking.agreement?.status !== "accepted"
    ) {
      throw this.trackingBadRequest(
        "Tracking requires an accepted agreement",
        "TRACKING_AGREEMENT_REQUIRED",
      );
    }
  }

  resolveTrackingWorkflowStatus(log) {
    if (!log) {
      return TRACKING_WORKFLOW_STATUS.LOG_PENDING;
    }

    if (log.missed) {
      return TRACKING_WORKFLOW_STATUS.LOG_MISSED;
    }

    if (
      log.status === TRACKING_STATUS.SUBMITTED ||
      (log.status === TRACKING_STATUS.FLAGGED && Boolean(log.submittedAt))
    ) {
      return TRACKING_WORKFLOW_STATUS.LOG_SUBMITTED;
    }

    return TRACKING_WORKFLOW_STATUS.LOG_PENDING;
  }

  resolveBookingTrackingStatus(booking, referenceDate = new Date()) {
    const targetDate = this.normalizeTrackingDate(referenceDate);
    if (
      !inDateRange(targetDate, booking.schedule.startDate, booking.schedule.endDate)
    ) {
      return TRACKING_WORKFLOW_STATUS.LOG_PENDING;
    }

    const log = this.findTrackingLog(booking, targetDate);
    return this.resolveTrackingWorkflowStatus(log);
  }

  emitTrackingRealtimeEvent(booking, eventName, payload = {}) {
    try {
      eventBus.emitToBookingParties(booking, eventName, {
        bookingId: booking._id,
        bookingNumber: booking.bookingNumber,
        ...payload,
      });
    } catch (emitErr) {
      console.error(
        '[BookingService] Failed to emit tracking realtime event:',
        emitErr.message,
      );
    }
  }

  upsertMissedTrackingLogs(booking, referenceDate = new Date()) {
    const startDate = toDateOnly(booking.schedule.startDate);
    const scheduleEndDate = toDateOnly(
      booking.schedule.endDate || booking.schedule.startDate,
    );
    const markUntil = toDateOnly(referenceDate);
    markUntil.setDate(markUntil.getDate() - 1);

    const endDate = scheduleEndDate < markUntil ? scheduleEndDate : markUntil;
    if (endDate < startDate) {
      return false;
    }

    let changed = false;

    for (
      let cursor = new Date(startDate);
      cursor <= endDate;
      cursor = new Date(cursor.getTime() + ONE_DAY_MS)
    ) {
      const existing = this.findTrackingLog(booking, cursor);
      if (!existing) {
        booking.trackingLogs.push({
          date: new Date(cursor),
          status: TRACKING_STATUS.FLAGGED,
          missed: true,
          lateSubmission: true,
          issueFlag: true,
          issues: "Auto-flagged: missed daily tracking entry",
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        changed = true;
        continue;
      }

      if (
        existing.status === TRACKING_STATUS.PENDING &&
        !existing.submittedAt
      ) {
        existing.missed = true;
        existing.lateSubmission = true;
        existing.issueFlag = true;
        existing.status = TRACKING_STATUS.FLAGGED;
        if (!existing.issues) {
          existing.issues = "Auto-flagged: pending daily tracking entry";
        }
        existing.updatedAt = new Date();
        changed = true;
      }
    }

    return changed;
  }

  getPreviousMissingDate(booking, targetDate) {
    const startDate = toDateOnly(booking.schedule.startDate);
    const previousDate = toDateOnly(targetDate);
    previousDate.setDate(previousDate.getDate() - 1);

    if (previousDate < startDate) {
      return null;
    }

    for (
      let cursor = new Date(startDate);
      cursor <= previousDate;
      cursor = new Date(cursor.getTime() + ONE_DAY_MS)
    ) {
      const log = this.findTrackingLog(booking, cursor);
      const completed = Boolean(
        log &&
        (log.status === TRACKING_STATUS.SUBMITTED ||
          log.status === TRACKING_STATUS.FLAGGED),
      );

      if (!completed) {
        return toDateKey(cursor);
      }
    }

    return null;
  }

  buildTrackingSummary(booking) {
    const summary = {
      submitted: 0,
      pending: 0,
      flagged: 0,
      missed: 0,
      lateSubmissions: 0,
      expectedDays: 0,
      lastSubmittedAt: null,
      workflow: {
        LOG_PENDING: 0,
        LOG_SUBMITTED: 0,
        LOG_MISSED: 0,
      },
    };

    const startDate = toDateOnly(booking.schedule.startDate);
    const endDate = toDateOnly(
      booking.schedule.endDate || booking.schedule.startDate,
    );
    const today = toDateOnly(new Date());
    const effectiveEndDate = today < endDate ? today : endDate;

    if (effectiveEndDate >= startDate) {
      summary.expectedDays =
        Math.floor(
          (effectiveEndDate.getTime() - startDate.getTime()) / ONE_DAY_MS,
        ) + 1;
    }

    for (const log of booking.trackingLogs) {
      const workflowStatus = this.resolveTrackingWorkflowStatus(log);
      summary.workflow[workflowStatus] += 1;

      if (log.status === TRACKING_STATUS.SUBMITTED) {
        summary.submitted += 1;
      }
      if (log.status === TRACKING_STATUS.PENDING) {
        summary.pending += 1;
      }
      if (log.status === TRACKING_STATUS.FLAGGED) {
        summary.flagged += 1;
      }
      if (log.missed) {
        summary.missed += 1;
      }
      if (log.lateSubmission) {
        summary.lateSubmissions += 1;
      }
      if (log.submittedAt) {
        if (
          !summary.lastSubmittedAt ||
          log.submittedAt > summary.lastSubmittedAt
        ) {
          summary.lastSubmittedAt = log.submittedAt;
        }
      }
    }

    return summary;
  }

  async checkInTracking(bookingId, caregiverId, payload = {}) {
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      throw this.trackingNotFound("Booking not found", "TRACKING_BOOKING_NOT_FOUND");
    }

    if (booking.caregiverId.toString() !== caregiverId.toString()) {
      throw this.trackingForbidden(
        "Not authorized to check in for this booking",
        "TRACKING_CAREGIVER_MISMATCH",
      );
    }

    if (
      ![
        BOOKING_STATUS.CONFIRMED,
        BOOKING_STATUS.ACTIVE,
        BOOKING_STATUS.IN_PROGRESS,
      ].includes(
        booking.status,
      )
    ) {
      throw this.trackingBadRequest(
        `Cannot check in for booking with status: ${booking.status}`,
        "TRACKING_CHECKIN_STATUS_INVALID",
      );
    }

    this.ensureTrackingEnabled(booking);

    const targetDate = this.normalizeTrackingDate(payload.date || new Date());
    if (
      !inDateRange(
        targetDate,
        booking.schedule.startDate,
        booking.schedule.endDate,
      )
    ) {
      throw this.trackingBadRequest(
        "Tracking date is outside the booking schedule window",
        "TRACKING_DATE_OUTSIDE_WINDOW",
      );
    }

    const changed = this.upsertMissedTrackingLogs(booking, targetDate);
    const missingDate = this.getPreviousMissingDate(booking, targetDate);
    if (missingDate) {
      throw this.trackingBadRequest(
        `Cannot skip days. Submit tracking for ${missingDate} first.`,
        "TRACKING_MISSING_PREVIOUS_DAYS",
      );
    }

    let trackingLog = this.findTrackingLog(booking, targetDate);
    if (!trackingLog) {
      booking.trackingLogs.push({
        date: new Date(targetDate),
        status: TRACKING_STATUS.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      trackingLog = booking.trackingLogs[booking.trackingLogs.length - 1];
    }

    if (
      trackingLog.submittedAt ||
      [TRACKING_STATUS.SUBMITTED, TRACKING_STATUS.FLAGGED].includes(
        trackingLog.status,
      )
    ) {
      throw this.trackingBadRequest(
        `Tracking log for ${toDateKey(targetDate)} has already been submitted and is immutable`,
        "TRACKING_LOG_IMMUTABLE",
      );
    }

    if (trackingLog.checkInTime) {
      return { booking, trackingLog };
    }

    const now = new Date();
    trackingLog.checkInTime = now;
    trackingLog.status = TRACKING_STATUS.PENDING;
    trackingLog.missed = false;
    trackingLog.updatedAt = now;

    if (payload.notes && !trackingLog.notes) {
      trackingLog.notes = payload.notes;
    }

    booking.checkIn = {
      time: now,
      location: payload.location,
      notes: payload.notes,
      verifiedBy: payload.verifiedBy || "manual",
    };

    if (booking.status === BOOKING_STATUS.CONFIRMED) {
      await bookingStateTransitionService.transition(
        booking,
        BOOKING_STATUS.ACTIVE,
        {
          actorId: caregiverId,
          actorRole: 'caregiver',
          source: 'booking.checkInTracking',
          reason: 'Caregiver checked in',
          transitionedAt: now,
        },
      );
    }

    if (changed || trackingLog.checkInTime) {
      await booking.save();
    }

    try {
      await bookingDayService.markCheckIn(booking, targetDate, {
        at: now,
        source: payload.verifiedBy || 'manual',
        coordinates: payload.location?.coordinates || null,
        updatedBy: caregiverId,
      });
    } catch (bookingDayError) {
      console.error('[BookingService] Failed to update BookingDay check-in:', bookingDayError.message);
    }

    try {
      await slotService.markSlotInProgress(booking._id, targetDate);
    } catch (slotError) {
      console.error('[BookingService] Failed to mark slot in progress:', slotError.message);
    }

    await this.sendBookingNotification(
      booking,
      NOTIFICATION_TYPE.CHECK_IN,
      booking.careSeekerId,
    );

    return { booking, trackingLog };
  }

  async checkOutTracking(bookingId, caregiverId, payload = {}) {
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      throw this.trackingNotFound("Booking not found", "TRACKING_BOOKING_NOT_FOUND");
    }

    if (booking.caregiverId.toString() !== caregiverId.toString()) {
      throw this.trackingForbidden(
        "Not authorized to check out for this booking",
        "TRACKING_CAREGIVER_MISMATCH",
      );
    }

    if (
      [
        BOOKING_STATUS.ACTIVE,
        BOOKING_STATUS.IN_PROGRESS,
        BOOKING_STATUS.COMPLETED,
      ].includes(
        booking.status,
      ) === false
    ) {
      throw this.trackingBadRequest(
        `Cannot check out for booking with status: ${booking.status}`,
        "TRACKING_CHECKOUT_STATUS_INVALID",
      );
    }

    this.ensureTrackingEnabled(booking);

    const targetDate = this.normalizeTrackingDate(payload.date || new Date());
    if (
      !inDateRange(
        targetDate,
        booking.schedule.startDate,
        booking.schedule.endDate,
      )
    ) {
      throw this.trackingBadRequest(
        "Tracking date is outside the booking schedule window",
        "TRACKING_DATE_OUTSIDE_WINDOW",
      );
    }

    let trackingLog = this.findTrackingLog(booking, targetDate);
    if (!trackingLog || !trackingLog.checkInTime) {
      throw this.trackingBadRequest(
        "Cannot check out before check-in for the selected day",
        "TRACKING_CHECKIN_REQUIRED",
      );
    }

    if (trackingLog.checkOutTime) {
      return { booking, trackingLog };
    }

    const now = new Date();
    trackingLog.checkOutTime = now;
    trackingLog.updatedAt = now;

    booking.checkOut = {
      time: now,
      location: payload.location,
      notes: payload.notes,
      verifiedBy: payload.verifiedBy || "manual",
    };

    const bookingEndDate = toDateOnly(
      booking.schedule.endDate || booking.schedule.startDate,
    );
    if (
      toDateOnly(targetDate) >= bookingEndDate &&
      [BOOKING_STATUS.ACTIVE, BOOKING_STATUS.IN_PROGRESS].includes(
        booking.status,
      )
    ) {
      await bookingStateTransitionService.transition(
        booking,
        BOOKING_STATUS.COMPLETED,
        {
          actorId: caregiverId,
          actorRole: 'caregiver',
          source: 'booking.checkOutTracking',
          reason: 'Caregiver checked out on final booking day',
          transitionedAt: now,
        },
      );

      if (booking.payment?.escrowHeld) {
        booking.payment.status = "released";
        booking.payment.releasedAt = now;
      }
    }

    await booking.save();

    try {
      await bookingDayService.markCheckOut(booking, targetDate, {
        at: now,
        source: payload.verifiedBy || 'manual',
        coordinates: payload.location?.coordinates || null,
        updatedBy: caregiverId,
      });
    } catch (bookingDayError) {
      console.error('[BookingService] Failed to update BookingDay check-out:', bookingDayError.message);
    }

    try {
      const { release } = await slotService.completeAndReleaseSlotForDate(booking, targetDate);

      if (release?.grossReleased > 0) {
        const io = global.__careconnect_io;
        if (io) {
          const updatedWallet = await ledgerService.getWallet(booking.caregiverId);
          if (updatedWallet) {
            emitWalletUpdate(io, booking.caregiverId, {
              wallet: updatedWallet,
              event: 'slot_released',
              bookingId: booking._id,
              slotId: release.slotId,
              amount: release.grossReleased,
            });
          }
        }
      }
    } catch (slotError) {
      console.error('[BookingService] Failed to complete/release slot:', slotError.message);
    }

    await this.sendBookingNotification(
      booking,
      NOTIFICATION_TYPE.CHECK_OUT,
      booking.careSeekerId,
    );

    if (booking.status === BOOKING_STATUS.COMPLETED) {
      await this.sendBookingNotification(
        booking,
        NOTIFICATION_TYPE.BOOKING_COMPLETED,
        booking.careSeekerId,
      );

      try {
        await chatService.sendBookingSystemMessage(
          booking._id,
          "booking_completed",
        );
      } catch (chatError) {
        console.error("Failed to send booking chat message:", chatError);
      }

      try {
        await chatAccessService.updateChatStatus(
          booking._id,
          CHAT_ACCESS_REASON.BOOKING_COMPLETED,
          CONVERSATION_STATUS.CLOSED,
        );
      } catch (chatError) {
        console.error("Failed to close chat for booking:", chatError);
      }
    }

    return { booking, trackingLog };
  }

  async submitTrackingLog(bookingId, caregiverId, payload = {}) {
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      throw this.trackingNotFound("Booking not found", "TRACKING_BOOKING_NOT_FOUND");
    }

    if (booking.caregiverId.toString() !== caregiverId.toString()) {
      throw this.trackingForbidden(
        "Not authorized to submit tracking for this booking",
        "TRACKING_CAREGIVER_MISMATCH",
      );
    }

    if (
      [
        BOOKING_STATUS.ACTIVE,
        BOOKING_STATUS.IN_PROGRESS,
        BOOKING_STATUS.COMPLETED,
      ].includes(
        booking.status,
      ) === false
    ) {
      throw this.trackingBadRequest(
        `Cannot submit tracking for booking status: ${booking.status}`,
        "TRACKING_SUBMIT_STATUS_INVALID",
      );
    }

    this.ensureTrackingEnabled(booking);

    const targetDate = this.normalizeTrackingDate(payload.date || new Date());
    if (
      !inDateRange(
        targetDate,
        booking.schedule.startDate,
        booking.schedule.endDate,
      )
    ) {
      throw this.trackingBadRequest(
        "Tracking date is outside the booking schedule window",
        "TRACKING_DATE_OUTSIDE_WINDOW",
      );
    }

    const changed = this.upsertMissedTrackingLogs(booking, new Date());
    const missingDate = this.getPreviousMissingDate(booking, targetDate);
    if (missingDate) {
      throw this.trackingBadRequest(
        `Cannot skip days. Submit tracking for ${missingDate} first.`,
        "TRACKING_MISSING_PREVIOUS_DAYS",
      );
    }

    let trackingLog = this.findTrackingLog(booking, targetDate);
    if (!trackingLog) {
      booking.trackingLogs.push({
        date: new Date(targetDate),
        status: TRACKING_STATUS.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      trackingLog = booking.trackingLogs[booking.trackingLogs.length - 1];
    }

    if (!trackingLog.checkInTime) {
      throw this.trackingBadRequest(
        "Cannot submit tracking without check-in",
        "TRACKING_CHECKIN_REQUIRED",
      );
    }

    const tasksCompleted = Array.isArray(payload.tasksCompleted)
      ? payload.tasksCompleted.join(", ").trim()
      : String(payload.tasksCompleted || "").trim();

    if (!tasksCompleted) {
      throw this.trackingBadRequest(
        "tasksCompleted is required",
        "TRACKING_TASKS_REQUIRED",
      );
    }

    const images = Array.isArray(payload.images)
      ? payload.images
          .filter(
            (value) => typeof value === "string" && value.trim().length > 0,
          )
          .map((imageUrl) => ({
            imageUrl,
            timestamp: new Date(),
            verifiedByAdmin: false,
          }))
      : [];

    const issueFlag = Boolean(payload.issueFlag);
    const issueText = String(payload.issues || "").trim();

    if (issueFlag && images.length === 0) {
      throw this.trackingBadRequest(
        "Proof of work image is required when issue is flagged",
        "TRACKING_IMAGE_REQUIRED_FOR_FLAG",
      );
    }

    const now = new Date();
    const today = toDateOnly(now);

    trackingLog.tasksCompleted = tasksCompleted;
    trackingLog.notes = String(payload.notes || "").trim();
    trackingLog.issues = issueText;
    trackingLog.issueFlag = issueFlag || Boolean(issueText);
    trackingLog.images = images;
    trackingLog.status = trackingLog.issueFlag
      ? TRACKING_STATUS.FLAGGED
      : TRACKING_STATUS.SUBMITTED;
    trackingLog.submittedAt = now;
    trackingLog.submittedBy = caregiverId;
    trackingLog.lateSubmission = toDateOnly(targetDate) < today;
    trackingLog.missed = false;
    trackingLog.updatedAt = now;

    await booking.save();

    await this.sendBookingNotification(
      booking,
      NOTIFICATION_TYPE.CARE_REPORT_SUBMITTED,
      booking.careSeekerId,
    );

    if (changed || trackingLog.status === TRACKING_STATUS.FLAGGED) {
      await this.sendBookingNotification(
        booking,
        NOTIFICATION_TYPE.INCIDENT_REPORTED,
        booking.careSeekerId,
        "urgent",
      );
    }

    const trackingPayload = {
      date: targetDate,
      dateKey: toDateKey(targetDate),
      status: trackingLog.status,
      workflowStatus: this.resolveTrackingWorkflowStatus(trackingLog),
      issueFlag: Boolean(trackingLog.issueFlag),
    };

    if (changed) {
      this.emitTrackingRealtimeEvent(
        booking,
        SYSTEM_EVENTS.TRACKING_MISSED,
        {
          dateKey: toDateKey(targetDate),
          reason: 'Missed daily logs detected and flagged',
        },
      );
    }

    if (trackingLog.status === TRACKING_STATUS.FLAGGED) {
      this.emitTrackingRealtimeEvent(
        booking,
        SYSTEM_EVENTS.TRACKING_FLAGGED,
        trackingPayload,
      );
    } else {
      this.emitTrackingRealtimeEvent(
        booking,
        SYSTEM_EVENTS.TRACKING_SUBMITTED,
        trackingPayload,
      );
    }

    return { booking, trackingLog };
  }

  async getTrackingLogs(bookingId, userId, role) {
    const booking = await Booking.findById(bookingId)
      .populate("careSeekerId", "fullName email avatar")
      .populate("caregiverId", "fullName email avatar");

    if (!booking) {
      throw new Error("Booking not found");
    }

    this.ensureTrackingBookingAccess(booking, userId, role);

    const changed = this.upsertMissedTrackingLogs(booking, new Date());
    if (changed) {
      await booking.save();
    }

    const logs = [...booking.trackingLogs]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((log) => ({
        ...log.toObject(),
        dateKey: toDateKey(log.date),
        workflowStatus: this.resolveTrackingWorkflowStatus(log),
      }));

    const summary = this.buildTrackingSummary(booking);

    return {
      bookingId: booking._id,
      bookingNumber: booking.bookingNumber,
      bookingStatus: booking.status,
      agreement: {
        agreementId:
          booking.agreement?.agreementId || `AGR-${booking.bookingNumber}`,
        status: booking.agreement?.status || "pending",
        accepted: Boolean(booking.agreement?.accepted),
        acceptedAt: booking.agreement?.acceptedAt || null,
        pdfUrl: booking.agreement?.pdfUrl || "",
        version: booking.agreement?.version || "v1",
      },
      schedule: booking.schedule,
      caregiver: booking.caregiverId,
      careSeeker: booking.careSeekerId,
      controls: {
        trackingEnabled:
          TRACKING_ALLOWED_STATUSES.includes(booking.status) &&
          booking.agreement?.accepted === true,
        chatEnabled: [
          BOOKING_STATUS.CONFIRMED,
          BOOKING_STATUS.ACTIVE,
          BOOKING_STATUS.IN_PROGRESS,
        ].includes(booking.status),
        mapVisible: booking.status === BOOKING_STATUS.IN_PROGRESS,
      },
      trackingStatus: this.resolveBookingTrackingStatus(booking, new Date()),
      summary,
      trackingLogs: logs,
    };
  }

  async reviewTrackingLog(
    bookingId,
    dateValue,
    careSeekerId,
    action,
    comment = "",
  ) {
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      throw this.trackingNotFound("Booking not found", "TRACKING_BOOKING_NOT_FOUND");
    }

    if (booking.careSeekerId.toString() !== careSeekerId.toString()) {
      throw this.trackingForbidden(
        "Not authorized to review this tracking log",
        "TRACKING_CARESEEKER_MISMATCH",
      );
    }

    if (!["approve", "flag"].includes(action)) {
      throw this.trackingBadRequest(
        "Invalid review action",
        "TRACKING_REVIEW_ACTION_INVALID",
      );
    }

    const targetDate = this.normalizeTrackingDate(dateValue);
    const trackingLog = this.findTrackingLog(booking, targetDate);
    if (!trackingLog) {
      throw this.trackingNotFound(
        "Tracking log not found for selected date",
        "TRACKING_LOG_NOT_FOUND",
      );
    }

    const now = new Date();
    const approved = action === "approve";

    trackingLog.reviewedByCareSeeker = {
      approved,
      reviewedAt: now,
      reviewerId: careSeekerId,
      comment,
    };

    if (!approved) {
      trackingLog.status = TRACKING_STATUS.FLAGGED;
      trackingLog.issueFlag = true;
      if (comment) {
        const existing = trackingLog.issues ? `${trackingLog.issues} | ` : "";
        trackingLog.issues = `${existing}Care seeker flag: ${comment}`;
      }
    }

    if (approved && trackingLog.status === TRACKING_STATUS.PENDING) {
      trackingLog.status = TRACKING_STATUS.SUBMITTED;
    }

    trackingLog.updatedAt = now;
    await booking.save();

    if (!approved || trackingLog.status === TRACKING_STATUS.FLAGGED) {
      this.emitTrackingRealtimeEvent(
        booking,
        SYSTEM_EVENTS.TRACKING_FLAGGED,
        {
          date: targetDate,
          dateKey: toDateKey(targetDate),
          status: trackingLog.status,
          workflowStatus: this.resolveTrackingWorkflowStatus(trackingLog),
          source: 'careseeker_review',
        },
      );
    }

    await Notification.createNotification({
      userId: booking.caregiverId,
      type: NOTIFICATION_TYPE.SYSTEM_UPDATE,
      title: approved ? "Tracking approved" : "Tracking flagged",
      message: approved
        ? `Care seeker approved tracking log for ${toDateKey(targetDate)}`
        : `Care seeker flagged tracking log for ${toDateKey(targetDate)}`,
      priority: approved ? "normal" : "high",
      data: {
        referenceId: booking._id,
        referenceType: "booking",
        actionUrl: `/dashboard/caregiver/my-work?bookingId=${booking._id}`,
      },
    });

    return {
      booking,
      trackingLog,
    };
  }

  async adminUpdateTrackingLog(
    bookingId,
    dateValue,
    adminId,
    action,
    note = "",
  ) {
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      throw new Error("Booking not found");
    }

    if (!["override", "penalize", "dispute"].includes(action)) {
      throw new Error("Invalid admin tracking action");
    }

    const targetDate = this.normalizeTrackingDate(dateValue);
    const trackingLog = this.findTrackingLog(booking, targetDate);
    if (!trackingLog) {
      throw new Error("Tracking log not found for selected date");
    }

    const now = new Date();
    const adminStatusMap = {
      override: "overridden",
      penalize: "penalized",
      dispute: "dispute_triggered",
    };

    trackingLog.adminReview = {
      status: adminStatusMap[action],
      reviewerId: adminId,
      reviewedAt: now,
      note,
    };

    if (action === "override") {
      trackingLog.status = TRACKING_STATUS.SUBMITTED;
      trackingLog.issueFlag = false;
    }

    if (action === "penalize") {
      trackingLog.status = TRACKING_STATUS.FLAGGED;
      trackingLog.issueFlag = true;
    }

    if (action === "dispute") {
      trackingLog.status = TRACKING_STATUS.FLAGGED;
      trackingLog.issueFlag = true;
      booking.dispute = {
        ...(booking.dispute || {}),
        raisedBy: adminId,
        reason: note || "Admin triggered dispute from tracking review",
        description: note || "Attendance or tracking irregularity detected",
        status: "open",
        createdAt: now,
      };

      await bookingStateTransitionService.transition(
        booking,
        BOOKING_STATUS.DISPUTED,
        {
          actorId: adminId,
          actorRole: 'admin',
          source: 'booking.adminUpdateTrackingLog',
          reason: note || 'Admin triggered dispute from tracking review',
          transitionedAt: now,
        },
      );
    }

    trackingLog.updatedAt = now;
    await booking.save();

    const systemEvent =
      action === 'override'
        ? SYSTEM_EVENTS.TRACKING_SUBMITTED
        : SYSTEM_EVENTS.TRACKING_FLAGGED;

    this.emitTrackingRealtimeEvent(booking, systemEvent, {
      date: targetDate,
      dateKey: toDateKey(targetDate),
      status: trackingLog.status,
      workflowStatus: this.resolveTrackingWorkflowStatus(trackingLog),
      source: 'admin_review',
      adminAction: action,
    });

    return {
      booking,
      trackingLog,
    };
  }

  async getAdminTrackingOverview(filters = {}) {
    const query = {
      status: {
        $in: [
          BOOKING_STATUS.CONFIRMED,
          BOOKING_STATUS.ACTIVE,
          BOOKING_STATUS.IN_PROGRESS,
          BOOKING_STATUS.COMPLETED,
          BOOKING_STATUS.DISPUTED,
        ],
      },
    };

    if (filters.caregiverId) {
      query.caregiverId = new mongoose.Types.ObjectId(filters.caregiverId);
    }

    if (filters.flaggedOnly === "true") {
      query["trackingLogs.status"] = TRACKING_STATUS.FLAGGED;
    }

    const page = Number.parseInt(filters.page, 10) || 1;
    const limit = Math.min(Number.parseInt(filters.limit, 10) || 20, 100);
    const skip = (page - 1) * limit;

    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .populate("careSeekerId", "fullName email avatar")
        .populate("caregiverId", "fullName email avatar")
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit),
      Booking.countDocuments(query),
    ]);

    const toSave = [];
    const rows = [];

    for (const booking of bookings) {
      const changed = this.upsertMissedTrackingLogs(booking, new Date());
      if (changed) {
        toSave.push(booking.save());
      }

      const summary = this.buildTrackingSummary(booking);
      rows.push({
        bookingId: booking._id,
        bookingNumber: booking.bookingNumber,
        bookingStatus: booking.status,
        trackingStatus: this.resolveBookingTrackingStatus(booking, new Date()),
        agreementStatus: booking.agreement?.status || "pending",
        caregiver: booking.caregiverId,
        careSeeker: booking.careSeekerId,
        schedule: booking.schedule,
        summary,
        alerts: {
          flagged: summary.flagged,
          missed: summary.missed,
          lateSubmissions: summary.lateSubmissions,
        },
      });
    }

    if (toSave.length > 0) {
      await Promise.all(toSave);
    }

    const totals = rows.reduce(
      (acc, row) => {
        acc.flagged += row.summary.flagged;
        acc.missed += row.summary.missed;
        acc.pending += row.summary.pending;
        return acc;
      },
      {
        bookings: rows.length,
        flagged: 0,
        missed: 0,
        pending: 0,
      },
    );

    return {
      bookings: rows,
      totals,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async sendTrackingReminder(bookingId, dateValue, actorId = null, options = {}) {
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      throw this.trackingNotFound('Booking not found', 'TRACKING_BOOKING_NOT_FOUND');
    }

    this.ensureTrackingEnabled(booking);

    const targetDate = this.normalizeTrackingDate(dateValue || new Date());
    if (
      !inDateRange(
        targetDate,
        booking.schedule.startDate,
        booking.schedule.endDate,
      )
    ) {
      throw this.trackingBadRequest(
        'Tracking date is outside the booking schedule window',
        'TRACKING_DATE_OUTSIDE_WINDOW',
      );
    }

    const dateKey = toDateKey(targetDate);
    const log = this.findTrackingLog(booking, targetDate);
    const workflowStatus = this.resolveTrackingWorkflowStatus(log);

    if (workflowStatus === TRACKING_WORKFLOW_STATUS.LOG_SUBMITTED) {
      return {
        sent: false,
        skipped: true,
        reason: 'Tracking log already submitted for selected date',
        bookingId: booking._id,
        bookingNumber: booking.bookingNumber,
        dateKey,
        workflowStatus,
      };
    }

    const { start, end } = toDayBounds(targetDate);
    const existingReminder = await Notification.exists({
      userId: booking.caregiverId,
      type: NOTIFICATION_TYPE.DEADLINE_REMINDER,
      'data.referenceId': booking._id,
      'data.metadata.kind': 'daily_tracking_reminder',
      'data.metadata.dateKey': dateKey,
      createdAt: { $gte: start, $lte: end },
    });

    if (existingReminder) {
      return {
        sent: false,
        skipped: true,
        reason: 'Reminder already sent for selected date',
        bookingId: booking._id,
        bookingNumber: booking.bookingNumber,
        dateKey,
        workflowStatus,
      };
    }

    const reminderMessage =
      typeof options.message === 'string' && options.message.trim().length > 0
        ? options.message.trim()
        : 'Daily tracking submission is pending. Please submit on time.';

    await Notification.createNotification({
      userId: booking.caregiverId,
      type: NOTIFICATION_TYPE.DEADLINE_REMINDER,
      title: 'Tracking Submission Pending',
      message: reminderMessage,
      priority: 'high',
      data: {
        referenceId: booking._id,
        referenceType: 'booking',
        actionUrl: `/dashboard/bookings/${booking._id}`,
        metadata: {
          bookingNumber: booking.bookingNumber,
          dateKey,
          kind: 'daily_tracking_reminder',
          source: options.source || 'system',
          actorId: actorId ? actorId.toString() : null,
        },
      },
      channels: {
        inApp: true,
        push: true,
        email: false,
        sms: false,
      },
    });

    this.emitTrackingRealtimeEvent(booking, SYSTEM_EVENTS.TRACKING_MISSED, {
      date: targetDate,
      dateKey,
      workflowStatus,
      source: options.source || 'system',
      reminderSent: true,
      message: reminderMessage,
    });

    return {
      sent: true,
      bookingId: booking._id,
      bookingNumber: booking.bookingNumber,
      caregiverId: booking.caregiverId,
      dateKey,
      workflowStatus,
      message: reminderMessage,
    };
  }

  /**
   * Submit daily care report
   */
  async submitCareReport(bookingId, caregiverId, reportData) {
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      throw new Error("Booking not found");
    }

    if (booking.caregiverId.toString() !== caregiverId.toString()) {
      throw new Error("Not authorized to submit report for this booking");
    }

    if (booking.status !== BOOKING_STATUS.IN_PROGRESS) {
      throw new Error("Can only submit reports for in-progress bookings");
    }

    const report = {
      date: reportData.date || new Date(),
      submittedBy: caregiverId,
      tasksCompleted: reportData.tasksCompleted || [],
      vitals: reportData.vitals || {},
      mood: reportData.mood,
      appetite: reportData.appetite,
      medications: reportData.medications || [],
      activities: reportData.activities || [],
      incidents: reportData.incidents || [],
      notes: reportData.notes,
      photos: reportData.photos || [],
      createdAt: new Date(),
    };

    booking.careReports.push(report);
    await booking.save();

    // Notify care seeker
    await this.sendBookingNotification(
      booking,
      NOTIFICATION_TYPE.CARE_REPORT_SUBMITTED,
      booking.careSeekerId,
    );

    // If there are incidents, send urgent notification
    if (reportData.incidents && reportData.incidents.length > 0) {
      await this.sendBookingNotification(
        booking,
        NOTIFICATION_TYPE.INCIDENT_REPORTED,
        booking.careSeekerId,
        "urgent",
      );
    }

    return booking;
  }

  /**
   * Request modification to booking
   */
  async requestModification(bookingId, userId, modificationData) {
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      throw new Error("Booking not found");
    }

    if (!booking.canBeModified()) {
      throw new Error(`Cannot modify booking with status: ${booking.status}`);
    }

    const modification = {
      requestedBy: userId,
      requestType: modificationData.requestType,
      originalValue: modificationData.originalValue,
      requestedValue: modificationData.requestedValue,
      reason: modificationData.reason,
      status: "pending",
      createdAt: new Date(),
    };

    booking.modificationRequests.push(modification);
    await booking.save();

    // Notify the other party
    const notifyUserId =
      booking.careSeekerId.toString() === userId.toString()
        ? booking.caregiverId
        : booking.careSeekerId;

    await this.sendBookingNotification(
      booking,
      NOTIFICATION_TYPE.BOOKING_MODIFIED,
      notifyUserId,
    );

    return booking;
  }

  /**
   * Respond to modification request
   */
  async respondToModification(
    bookingId,
    modificationId,
    userId,
    approved,
    response,
  ) {
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      throw new Error("Booking not found");
    }

    const modification = booking.modificationRequests.id(modificationId);
    if (!modification) {
      throw new Error("Modification request not found");
    }

    if (modification.requestedBy.toString() === userId.toString()) {
      throw new Error("Cannot respond to your own modification request");
    }

    modification.status = approved ? "approved" : "rejected";
    modification.respondedAt = new Date();

    // Apply modification if approved
    if (approved && modification.requestType === "reschedule") {
      Object.assign(booking.schedule, modification.requestedValue);
      booking.markModified("schedule");
    }

    await booking.save();

    // Notify the requester
    await this.sendBookingNotification(
      booking,
      NOTIFICATION_TYPE.BOOKING_MODIFIED,
      modification.requestedBy,
    );

    return booking;
  }

  /**
   * Raise a dispute
   */
  async raiseDispute(bookingId, userId, disputeData) {
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      throw new Error("Booking not found");
    }

    // Only completed or in-progress bookings can have disputes
    const allowedStatuses = [
      BOOKING_STATUS.COMPLETED,
      BOOKING_STATUS.IN_PROGRESS,
    ];
    if (!allowedStatuses.includes(booking.status)) {
      throw new Error("Cannot raise dispute for this booking status");
    }

    booking.dispute = {
      raisedBy: userId,
      reason: disputeData.reason,
      description: disputeData.description,
      evidence: disputeData.evidence || [],
      status: "open",
      createdAt: new Date(),
    };

    await bookingStateTransitionService.transition(
      booking,
      BOOKING_STATUS.DISPUTED,
      {
        actorId: userId,
        actorRole:
          booking.careSeekerId.toString() === userId.toString()
            ? 'careseeker'
            : 'caregiver',
        source: 'booking.raiseDispute',
        reason: disputeData.reason || 'Dispute raised by booking party',
      },
    );

    // Notify the other party
    const notifyUserId =
      booking.careSeekerId.toString() === userId.toString()
        ? booking.caregiverId
        : booking.careSeekerId;

    await this.sendBookingNotification(
      booking,
      NOTIFICATION_TYPE.BOOKING_CANCELLED, // Using cancelled as dispute notification
      notifyUserId,
    );

    // Also notify admins about the dispute
    const admins = await User.find({ role: USER_ROLES.ADMIN });
    for (const admin of admins) {
      await Notification.createNotification({
        userId: admin._id,
        type: "system_update",
        title: "New Dispute Raised",
        message: `Dispute raised for booking ${booking.bookingNumber}`,
        priority: "high",
        data: {
          referenceId: booking._id,
          referenceType: "booking",
          actionUrl: `/admin/bookings/${booking._id}`,
        },
      });
    }

    return booking;
  }

  /**
   * Send booking notification
   */
  async sendBookingNotification(booking, type, userId, priority = "normal") {
    const titles = {
      [NOTIFICATION_TYPE.BOOKING_REQUEST]: "New Booking Request",
      [NOTIFICATION_TYPE.BOOKING_CAREGIVER_ACCEPTED]: "Booking Confirmed",
      [NOTIFICATION_TYPE.BOOKING_CAREGIVER_REJECTED]:
        "Caregiver Declined Your Request",
      [NOTIFICATION_TYPE.BOOKING_CONFIRMED]: "Booking Confirmed",
      [NOTIFICATION_TYPE.BOOKING_REJECTED]: "Booking Rejected",
      [NOTIFICATION_TYPE.BOOKING_CANCELLED]: "Booking Cancelled",
      [NOTIFICATION_TYPE.BOOKING_MODIFIED]: "Booking Modification",
      [NOTIFICATION_TYPE.BOOKING_REMINDER]: "Booking Reminder",
      [NOTIFICATION_TYPE.BOOKING_STARTED]: "Service Started",
      [NOTIFICATION_TYPE.BOOKING_COMPLETED]: "Service Completed",
      [NOTIFICATION_TYPE.CHECK_IN]: "Caregiver Checked In",
      [NOTIFICATION_TYPE.CHECK_OUT]: "Caregiver Checked Out",
      [NOTIFICATION_TYPE.CARE_REPORT_SUBMITTED]: "Care Report Submitted",
      [NOTIFICATION_TYPE.INCIDENT_REPORTED]: "Incident Reported",
      [NOTIFICATION_TYPE.REVIEW_REMINDER]: "Leave a Review",
    };

    const messages = {
      [NOTIFICATION_TYPE.BOOKING_REQUEST]: `You have a new booking request #${booking.bookingNumber}`,
      [NOTIFICATION_TYPE.BOOKING_CAREGIVER_ACCEPTED]: `Great news! Your booking #${booking.bookingNumber} has been confirmed by the caregiver`,
      [NOTIFICATION_TYPE.BOOKING_CAREGIVER_REJECTED]: `Unfortunately, the caregiver was unable to accept your booking request #${booking.bookingNumber}`,
      [NOTIFICATION_TYPE.BOOKING_CONFIRMED]: `Your booking #${booking.bookingNumber} has been confirmed`,
      [NOTIFICATION_TYPE.BOOKING_REJECTED]: `Your booking #${booking.bookingNumber} was not accepted`,
      [NOTIFICATION_TYPE.BOOKING_CANCELLED]: `Booking #${booking.bookingNumber} has been cancelled`,
      [NOTIFICATION_TYPE.BOOKING_MODIFIED]: `Booking #${booking.bookingNumber} has been modified`,
      [NOTIFICATION_TYPE.BOOKING_REMINDER]: `Reminder: Your booking #${booking.bookingNumber} starts soon`,
      [NOTIFICATION_TYPE.BOOKING_STARTED]: `Service for booking #${booking.bookingNumber} has started`,
      [NOTIFICATION_TYPE.BOOKING_COMPLETED]: `Service for booking #${booking.bookingNumber} is complete`,
      [NOTIFICATION_TYPE.CHECK_IN]: `Caregiver has checked in for booking #${booking.bookingNumber}`,
      [NOTIFICATION_TYPE.CHECK_OUT]: `Caregiver has checked out for booking #${booking.bookingNumber}`,
      [NOTIFICATION_TYPE.CARE_REPORT_SUBMITTED]: `New care report for booking #${booking.bookingNumber}`,
      [NOTIFICATION_TYPE.INCIDENT_REPORTED]: `An incident was reported for booking #${booking.bookingNumber}`,
      [NOTIFICATION_TYPE.REVIEW_REMINDER]: `How was your experience? Leave a review for booking #${booking.bookingNumber}`,
    };

    await Notification.createNotification({
      userId,
      type,
      title: titles[type] || "Booking Update",
      message: messages[type] || `Update for booking #${booking.bookingNumber}`,
      priority,
      data: {
        referenceId: booking._id,
        referenceType: "booking",
        actionUrl: `/dashboard/bookings/${booking._id}`,
        metadata: {
          bookingNumber: booking.bookingNumber,
          status: booking.status,
        },
      },
      channels: {
        inApp: true,
        push: true,
        email: priority === "urgent",
        sms: priority === "urgent",
      },
    });
  }

  /**
   * Get all bookings (Admin)
   */
  async getAllBookings(filters = {}) {
    const query = {};

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.serviceType) {
      query.serviceType = filters.serviceType;
    }

    if (filters.startDate && filters.endDate) {
      query["schedule.startDate"] = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate),
      };
    }

    if (filters.search) {
      query.$or = [
        { bookingNumber: { $regex: filters.search, $options: "i" } },
      ];
    }

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 10;
    const skip = (page - 1) * limit;

    const sortBy = filters.sortBy || "createdAt";
    const sortOrder = filters.sortOrder === "asc" ? 1 : -1;

    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .populate("careSeekerId", "fullName email avatar")
        .populate("caregiverId", "fullName email avatar")
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit),
      Booking.countDocuments(query),
    ]);

    const normalizedBookings = bookings.map((booking) => {
      const bookingObj = booking.toObject();
      this.normalizeBookingFinancials(bookingObj);
      return bookingObj;
    });

    // Get statistics
    const stats = await this.getBookingStats();

    return {
      bookings: normalizedBookings,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      stats,
    };
  }

  /**
   * Get booking statistics
   */
  async getBookingStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));

    const [
      total,
      reserved,
      pending,
      confirmed,
      inProgress,
      completed,
      cancelled,
      disputed,
      expired,
      thisMonth,
      thisWeek,
    ] = await Promise.all([
      Booking.countDocuments(),
      Booking.countDocuments({ status: BOOKING_STATUS.RESERVED }),
      Booking.countDocuments({ status: BOOKING_STATUS.PENDING }),
      Booking.countDocuments({ status: BOOKING_STATUS.CONFIRMED }),
      Booking.countDocuments({ status: BOOKING_STATUS.IN_PROGRESS }),
      Booking.countDocuments({ status: BOOKING_STATUS.COMPLETED }),
      Booking.countDocuments({ status: BOOKING_STATUS.CANCELLED }),
      Booking.countDocuments({ status: BOOKING_STATUS.DISPUTED }),
      Booking.countDocuments({ status: BOOKING_STATUS.EXPIRED }),
      Booking.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Booking.countDocuments({ createdAt: { $gte: startOfWeek } }),
    ]);

    // Calculate revenue
    const revenueAgg = await Booking.aggregate([
      { $match: { status: BOOKING_STATUS.COMPLETED } },
      {
        $group: {
          _id: null,
          total: { $sum: "$pricing.total" },
          platformFees: { $sum: "$pricing.platformFee" },
        },
      },
    ]);

    const revenue = revenueAgg[0] || { total: 0, platformFees: 0 };

    return {
      total,
      reserved,
      pending,
      confirmed,
      inProgress,
      completed,
      cancelled,
      disputed,
      expired,
      thisMonth,
      thisWeek,
      revenue: {
        total: revenue.total,
        platformFees: revenue.platformFees,
      },
    };
  }

  /**
   * Admin resolve dispute
   */
  async resolveDispute(bookingId, adminId, resolution, refundAmount = 0) {
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      throw new Error("Booking not found");
    }

    if (booking.status !== BOOKING_STATUS.DISPUTED) {
      throw new Error("Booking is not in disputed status");
    }

    booking.dispute.status = "resolved";
    booking.dispute.resolution = resolution;
    booking.dispute.resolvedBy = adminId;
    booking.dispute.resolvedAt = new Date();

    // Handle refund if applicable
    if (refundAmount > 0) {
      booking.cancellation = {
        ...booking.cancellation,
        refundAmount,
        refundStatus: 'under_review',
        refundRequestedAt: booking.cancellation?.refundRequestedAt || new Date(),
        refundDecisionReason: resolution || 'Dispute under review',
      };
    }

    // Set final status based on resolution
    await bookingStateTransitionService.transition(
      booking,
      BOOKING_STATUS.COMPLETED,
      {
        actorId: adminId,
        actorRole: 'admin',
        source: 'booking.resolveDispute',
        reason: resolution || 'Dispute resolved',
      },
    );

    // Notify both parties
    await this.sendBookingNotification(
      booking,
      NOTIFICATION_TYPE.BOOKING_COMPLETED,
      booking.careSeekerId,
    );
    await this.sendBookingNotification(
      booking,
      NOTIFICATION_TYPE.BOOKING_COMPLETED,
      booking.caregiverId,
    );

    return booking;
  }

  // ── NEW: acceptBookingByCaregiver ────────────────────────────────────────────

  /**
   * Caregiver explicitly accepts a PENDING booking.
   *
   * Flow:
   *   PENDING → ACCEPTED  (this method)
   *          → AGREEMENT_PENDING  (auto-generated by agreementService)
   *
   * Emits BOOKING_ACCEPTED + BOOKING_AGREEMENT_GENERATED via eventBus.
   * Sends in-app notification to both parties.
   *
   * @param {string} bookingId
   * @param {string} caregiverId  - Authenticated caregiver's user ID
   * @returns {Promise<object>}   Updated booking (in AGREEMENT_PENDING state)
   */
  async acceptBookingByCaregiver(bookingId, caregiverId) {
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      throw new Error("Booking not found");
    }

    // Normalise caregiverId regardless of population state
    const bookingCaregiverId = booking.caregiverId._id
      ? booking.caregiverId._id.toString()
      : booking.caregiverId.toString();

    if (bookingCaregiverId !== caregiverId.toString()) {
      throw new Error("Not authorized to accept this booking");
    }

    await this.assertCaregiverAcceptingBookings(caregiverId);

    if (booking.status !== BOOKING_STATUS.PENDING) {
      throw new Error(
        `Cannot accept booking with status: ${booking.status}. ` +
          `Only PENDING bookings can be accepted.`,
      );
    }

    // ── PENDING → ACCEPTED ──────────────────────────────────────────────
    booking.caregiverAcceptance = {
      status: "accepted",
      respondedAt: new Date(),
    };

    await bookingStateTransitionService.transition(
      booking,
      BOOKING_STATUS.ACCEPTED,
      {
        actorId: caregiverId,
        actorRole: 'caregiver',
        source: 'booking.acceptBookingByCaregiver',
        reason: 'Caregiver accepted booking request',
      },
    );

    // ── Emit BOOKING_ACCEPTED ────────────────────────────────────────────
    try {
      eventBus.emitToBookingParties(booking, SYSTEM_EVENTS.BOOKING_ACCEPTED, {
        bookingNumber: booking.bookingNumber,
        status: booking.status,
        message:
          "The caregiver has accepted your booking request. " +
          "A service agreement is being generated — please review and accept it to proceed.",
      });
    } catch (emitErr) {
      console.error(
        "[BookingService] Failed to emit BOOKING_ACCEPTED:",
        emitErr.message,
      );
    }

    // ── Auto-generate agreement → ACCEPTED → AGREEMENT_PENDING ──────────
    // agreementService.generateAgreement handles the status transition and
    // emits BOOKING_AGREEMENT_GENERATED internally.
    let updatedBooking = booking;
    try {
      updatedBooking = await agreementService.generateAgreement(bookingId);
    } catch (agreementErr) {
      console.error(
        "[BookingService] Agreement generation failed:",
        agreementErr.message,
      );

      // One immediate recovery attempt so users still get agreement preview fast.
      try {
        await agreementService.getAgreement(bookingId, caregiverId, false);
        const recoveredBooking = await Booking.findById(bookingId);
        if (recoveredBooking) {
          updatedBooking = recoveredBooking;
        }
      } catch {
        throw new Error(
          "Booking accepted, but agreement generation failed. Please refresh and try again in a moment.",
        );
      }
    }

    // ── In-app notifications ─────────────────────────────────────────────
    try {
      // Notify care seeker that caregiver accepted
      await this.sendBookingNotification(
        updatedBooking,
        NOTIFICATION_TYPE.BOOKING_CAREGIVER_ACCEPTED,
        updatedBooking.careSeekerId,
      );

      // Notify caregiver to review and accept the agreement
      await Notification.createNotification({
        userId: caregiverId,
        type: NOTIFICATION_TYPE.AGREEMENT_ACCEPTANCE_REQUIRED,
        title: "Service Agreement Ready",
        message: `A service agreement has been generated for booking #${updatedBooking.bookingNumber}. Please review and accept it.`,
        priority: "high",
        data: {
          referenceId: updatedBooking._id,
          referenceType: "booking",
          actionUrl: `/dashboard/bookings/${updatedBooking._id}#agreement-section`,
        },
        channels: { inApp: true, push: true, email: false, sms: false },
      });
    } catch (notifErr) {
      console.error(
        "[BookingService] Notification send failed in acceptBookingByCaregiver:",
        notifErr.message,
      );
    }

    return updatedBooking;
  }

  // ── NEW: getCaregiverBookingsPendingAction ────────────────────────────────────

  /**
   * Returns bookings that require explicit action from the caregiver.
   *
   * Includes:
   *  • PENDING            — caregiver must accept or reject
   *  • AGREEMENT_PENDING  — caregiver must accept the service agreement
   *
   * Each booking is augmented with a `pendingActions` array that describes
   * what the caregiver needs to do next, making it easy for the frontend to
   * render contextual CTAs without duplicating logic.
   *
   * @param {string} caregiverId
   * @returns {Promise<Array>}
   */
  async getCaregiverBookingsPendingAction(caregiverId) {
    const actionableStatuses = [
      BOOKING_STATUS.PENDING,
      BOOKING_STATUS.AGREEMENT_PENDING,
    ];

    const bookings = await Booking.find({
      caregiverId,
      status: { $in: actionableStatuses },
    })
      .populate("careSeekerId", "fullName avatar email phone")
      .sort({ createdAt: -1 })
      .lean();

    return bookings.map((booking) => {
      const actions = [];

      if (booking.status === BOOKING_STATUS.PENDING) {
        actions.push({
          type: "accept_or_reject",
          label: "Accept or Reject Booking",
          urgency: "high",
          actionUrl: `/dashboard/bookings/${booking._id}`,
        });
      }

      if (booking.status === BOOKING_STATUS.AGREEMENT_PENDING) {
        const caregiverAccepted = Boolean(booking.agreement?.caregiverAccepted);

        if (!caregiverAccepted) {
          actions.push({
            type: "accept_agreement",
            label: "Review & Accept Service Agreement",
            urgency: "high",
            actionUrl: `/dashboard/bookings/${booking._id}#agreement-section`,
          });
        } else {
          // Caregiver already accepted; waiting on care seeker
          actions.push({
            type: "waiting_for_seeker",
            label: "Waiting for care seeker to accept agreement",
            urgency: "low",
            actionUrl: `/dashboard/bookings/${booking._id}#agreement-section`,
          });
        }
      }

      return {
        ...booking,
        pendingActions: actions,
        // Convenience flag for quick filtering on the frontend
        requiresImmediateAction: actions.some((a) => a.urgency === "high"),
      };
    });
  }

  // ── NEW: acceptAgreement ─────────────────────────────────────────────────────

  /**
   * Accept/acknowledge the service agreement.
   *
   * Delegates to agreementService.acceptAgreement which handles:
   *  - Recording the caller's acceptance (seeker or caregiver)
   *  - Transitioning booking to PAYMENT_PENDING once both parties have accepted
   *  - Emitting BOOKING_AGREEMENT_ACCEPTED via eventBus
   *
   * @param {string} bookingId
   * @param {string} userId   - Authenticated user's ID
   * @param {string} userRole - 'caregiver' | 'care_seeker'
   * @returns {Promise<object>} Updated booking (or agreement state object)
   */
  async acceptAgreement(bookingId, userId, userRole) {
    return agreementService.acceptAgreement(bookingId, userId, userRole);
  }

  // ── NEW: getCaregiverPendingActions ──────────────────────────────────────────

  /**
   * Unified list of bookings requiring explicit caregiver action.
   *
   * Returns bookings where:
   *  • status === PENDING                                  → must accept or reject
   *  • status === AGREEMENT_PENDING && !caregiverAccepted  → must sign agreement
   *  • status in [ACTIVE, IN_PROGRESS] && today's log missing → must submit tracking log
   *
   * Each booking is augmented with a `pendingActions` array and a
   * `requiresImmediateAction` convenience flag.
   * Bookings with no actionable items are excluded from the result.
   *
   * @param {string} caregiverId
   * @returns {Promise<Array>}
   */
  async getCaregiverPendingActions(caregiverId) {
    const today = toDateKey(new Date());

    const actionableStatuses = [
      BOOKING_STATUS.PENDING,
      BOOKING_STATUS.AGREEMENT_PENDING,
      BOOKING_STATUS.ACTIVE,
      BOOKING_STATUS.IN_PROGRESS,
    ];

    const bookings = await Booking.find({
      caregiverId,
      status: { $in: actionableStatuses },
    })
      .populate("careSeekerId", "fullName avatar email phone")
      .sort({ createdAt: -1 })
      .lean();

    return bookings
      .map((booking) => {
        const actions = [];

        // ── 1. Pending: caregiver must accept or reject ──────────────────
        if (booking.status === BOOKING_STATUS.PENDING) {
          actions.push({
            type: "accept_or_reject",
            label: "Accept or Reject Booking",
            urgency: "high",
            actionUrl: `/dashboard/bookings/${booking._id}`,
          });
        }

        // ── 2. Agreement pending: caregiver hasn't signed yet ────────────
        if (booking.status === BOOKING_STATUS.AGREEMENT_PENDING) {
          const caregiverAccepted = Boolean(
            booking.agreement?.caregiverAccepted,
          );
          if (!caregiverAccepted) {
            actions.push({
              type: "accept_agreement",
              label: "Review & Accept Service Agreement",
              urgency: "high",
              actionUrl: `/dashboard/bookings/${booking._id}#agreement-section`,
            });
          }
        }

        // ── 3. Active / in-progress: today's tracking log missing ────────
        if (
          booking.status === BOOKING_STATUS.ACTIVE ||
          booking.status === BOOKING_STATUS.IN_PROGRESS
        ) {
          const todayLog = (booking.trackingLogs || []).find(
            (log) => toDateKey(log.date) === today,
          );
          const hasTodayLog =
            todayLog &&
            todayLog.status !== TRACKING_STATUS.PENDING &&
            !todayLog.missed;

          if (!hasTodayLog) {
            actions.push({
              type: "submit_tracking_log",
              label: "Submit Today's Tracking Log",
              urgency: "medium",
              actionUrl: `/dashboard/bookings/${booking._id}/tracking`,
            });
          }
        }

        // Exclude bookings that need no action
        if (actions.length === 0) return null;

        return {
          ...booking,
          pendingActions: actions,
          requiresImmediateAction: actions.some((a) => a.urgency === "high"),
        };
      })
      .filter(Boolean);
  }
}

export default new BookingService();
