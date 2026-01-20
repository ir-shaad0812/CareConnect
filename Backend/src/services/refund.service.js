// ============================================
// REFUND SERVICE
// Booking-level refund policy with 4-hour cooling period.
// Platform fee is non-refundable. Refunds credit the payer wallet.
// ============================================

import Slot, { SLOT_STATUS, REFUND_ELIGIBILITY } from '../models/slot.model.js';
import Booking from '../models/booking.model.js';
import ledgerService from './ledger.service.js';
import { BOOKING_STATUS } from '../constants/booking.constants.js';

const MS_PER_HOUR = 60 * 60 * 1000;

export const REFUND_CONFIG = {
  COOL_OFF_HOURS: 4,
};

const round2 = (value) => Math.round(Number(value || 0) * 100) / 100;

class RefundService {
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

    return [topLevelTotal, pricingTotalAmount, pricingTotal, computedTotal].find((amount) => amount > 0) || 0;
  }

  resolvePaymentSettled(booking) {
    const paymentStatus = String(
      booking?.paymentStatus ?? booking?.payment?.status ?? '',
    ).toLowerCase();

    if ([
      'fully_paid',
      'paid',
      'completed',
      'refunded',
      'partially_refunded',
      'released',
      'held',
      'success',
      'successful',
      'succeeded',
      'verified',
      'captured',
    ].includes(paymentStatus)) {
      return true;
    }

    const amountPaid = this.toSafeNumber(booking?.amountPaid ?? booking?.payment?.amountPaid);
    const amountDueRaw = booking?.amountDue ?? booking?.payment?.amountDue;
    const parsedAmountDue = Number(amountDueRaw);
    const amountDue = Number.isFinite(parsedAmountDue)
      ? Math.max(0, parsedAmountDue)
      : Math.max(0, this.resolveBookingTotalAmount(booking) - amountPaid);

    return amountPaid > 0 && amountDue <= 0;
  }

  resolveRefundAnchor(booking) {
    const anchor = booking?.confirmedAt || booking?.payment?.paidAt || booking?.createdAt;
    if (!anchor) return null;

    const parsed = new Date(anchor);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  }

  resolveServiceStart(booking) {
    if (booking?.startedAt) {
      const startedAt = new Date(booking.startedAt);
      if (!Number.isNaN(startedAt.getTime())) {
        return startedAt;
      }
    }

    const startDateRaw = booking?.schedule?.startDate;
    if (!startDateRaw) return null;

    const startDate = new Date(startDateRaw);
    if (Number.isNaN(startDate.getTime())) {
      return null;
    }

    const [startHour, startMinute] = String(booking?.schedule?.startTime || '')
      .split(':')
      .map((value) => Number(value));

    if (Number.isInteger(startHour) && Number.isInteger(startMinute)) {
      startDate.setUTCHours(startHour, startMinute, 0, 0);
    } else {
      startDate.setUTCHours(0, 0, 0, 0);
    }

    return startDate;
  }

  hasServiceStarted(booking, now = new Date()) {
    const serviceStart = this.resolveServiceStart(booking);
    if (!serviceStart) return false;
    return serviceStart.getTime() <= now.getTime();
  }

  resolvePlatformFee(booking, totalPaid) {
    const explicitPlatformFee = this.toSafeNumber(
      booking?.pricing?.platformFee ?? booking?.payment?.platformFee,
    );

    if (explicitPlatformFee > 0) {
      return Math.min(explicitPlatformFee, totalPaid);
    }

    const platformFeePercentage = this.toSafeNumber(
      booking?.pricing?.platformFeePercentage ?? booking?.payment?.platformFeePercentage,
    );

    if (platformFeePercentage > 0 && totalPaid > 0) {
      return round2((totalPaid * platformFeePercentage) / 100);
    }

    return 0;
  }

  buildRefundOutcome(booking, { cancelledByRole = 'careseeker', now = new Date() } = {}) {
    const totalPaid = round2(this.resolveBookingTotalAmount(booking));
    const refundAnchor = this.resolveRefundAnchor(booking);
    const refundWindowEndsAt = refundAnchor
      ? new Date(refundAnchor.getTime() + REFUND_CONFIG.COOL_OFF_HOURS * MS_PER_HOUR)
      : null;
    const serviceStarted = this.hasServiceStarted(booking, now);
    const paymentSettled = this.resolvePaymentSettled(booking);
    const bookingCancelled = String(booking?.status || '').toLowerCase() === BOOKING_STATUS.CANCELLED;
    const adminCancellation = cancelledByRole === 'admin';
    const withinRefundWindow = refundWindowEndsAt
      ? now.getTime() <= refundWindowEndsAt.getTime()
      : false;
    const platformFee = round2(this.resolvePlatformFee(booking, totalPaid));
    const refundableMaximum = round2(Math.max(totalPaid - platformFee, 0));

    let refundEligible = false;
    let refundDecisionReason = 'Refund not eligible';

    if (bookingCancelled) {
      refundDecisionReason = 'Booking is already cancelled';
    } else if (adminCancellation) {
      refundDecisionReason = 'Admin cancellation does not issue refunds';
    } else if (!paymentSettled) {
      refundDecisionReason = 'Booking payment must be fully settled before refund';
    } else if (!refundAnchor) {
      refundDecisionReason = 'Refund window could not be determined';
    } else if (!withinRefundWindow) {
      refundDecisionReason = 'Refund window expired after 4 hours';
    } else if (serviceStarted) {
      refundDecisionReason = 'Service already started';
    } else if (refundableMaximum <= 0) {
      refundDecisionReason = 'No refundable amount remains after platform fee';
    } else {
      refundEligible = true;
      refundDecisionReason = 'Eligible for automatic refund';
    }

    const refundAmount = refundEligible ? refundableMaximum : 0;

    return {
      cancelledByRole,
      refundEligible,
      refundStatus: refundEligible ? 'auto_approved' : 'rejected',
      refundDecisionReason,
      refundWindowEndsAt,
      refundWindowHours: REFUND_CONFIG.COOL_OFF_HOURS,
      serviceStarted,
      paymentSettled,
      totalPaid,
      platformFee,
      totalRefund: refundAmount,
      totalNonRefundable: round2(Math.max(totalPaid - refundAmount, 0)),
      currency: booking?.pricing?.currency || booking?.payment?.currency || 'NPR',
    };
  }

  buildBreakdown(slots, outcome) {
    const reason = outcome.refundDecisionReason;

    if (!Array.isArray(slots) || slots.length === 0) {
      return [{
        slotNumber: 1,
        scheduledStart: outcome.refundWindowEndsAt || new Date(),
        status: outcome.refundEligible ? 'eligible' : 'not_eligible',
        amountAllocated: outcome.totalPaid,
        amountPaid: outcome.totalPaid,
        refundAmount: outcome.totalRefund,
        refundPercentage: outcome.totalPaid > 0
          ? Math.round((outcome.totalRefund / outcome.totalPaid) * 100)
          : 0,
        eligibility: outcome.refundEligible ? REFUND_ELIGIBILITY.FULL : REFUND_ELIGIBILITY.NONE,
        reason,
      }];
    }

    const totalPaid = slots.reduce((sum, slot) => sum + this.toSafeNumber(slot.amountPaid ?? slot.amountAllocated), 0);
    let remainingRefund = outcome.totalRefund;

    return slots.map((slot, index) => {
      const amountPaid = this.toSafeNumber(slot.amountPaid ?? slot.amountAllocated);
      let refundAmount = 0;

      if (outcome.totalRefund > 0 && amountPaid > 0 && totalPaid > 0) {
        refundAmount = index === slots.length - 1
          ? remainingRefund
          : round2(outcome.totalRefund * (amountPaid / totalPaid));
        remainingRefund = round2(Math.max(0, remainingRefund - refundAmount));
      }

      return {
        slotId: slot._id,
        slotNumber: slot.slotNumber,
        scheduledStart: slot.scheduledStart,
        status: slot.status,
        amountAllocated: this.toSafeNumber(slot.amountAllocated),
        amountPaid,
        refundAmount,
        refundPercentage: amountPaid > 0 ? Math.round((refundAmount / amountPaid) * 100) : 0,
        eligibility: outcome.refundEligible ? REFUND_ELIGIBILITY.FULL : REFUND_ELIGIBILITY.NONE,
        reason,
      };
    });
  }

  async previewRefund(bookingId, { cancelledByRole = 'careseeker' } = {}) {
    const booking = await Booking.findById(bookingId);
    if (!booking) throw new Error('Booking not found');

    const now = new Date();
    const outcome = this.buildRefundOutcome(booking, { cancelledByRole, now });
    const slots = await Slot.find({ bookingId }).sort({ slotNumber: 1 });

    return {
      bookingId,
      cancelledByRole,
      coolOffActive: outcome.refundEligible,
      coolOffHours: outcome.refundWindowHours,
      refundWindowEndsAt: outcome.refundWindowEndsAt,
      refundEligible: outcome.refundEligible,
      refundStatus: outcome.refundStatus,
      refundDecisionReason: outcome.refundDecisionReason,
      slotCount: slots.length,
      totalPaid: outcome.totalPaid,
      totalRefund: outcome.totalRefund,
      totalNonRefundable: outcome.totalNonRefundable,
      platformFee: outcome.platformFee,
      currency: outcome.currency,
      breakdown: this.buildBreakdown(slots, outcome),
    };
  }

  async applyCancellation(bookingId, { cancelledBy, cancelledByRole, reason }) {
    const booking = await Booking.findById(bookingId);
    if (!booking) throw new Error('Booking not found');

    const cancellationReason = String(reason || '').trim();
    if (!cancellationReason) {
      throw new Error('Cancellation reason is required');
    }

    const now = new Date();
    const outcome = this.buildRefundOutcome(booking, { cancelledByRole, now });
    const slots = await Slot.find({ bookingId }).sort({ slotNumber: 1 });
    const breakdown = this.buildBreakdown(slots, outcome);

    for (const slot of slots) {
      const breakdownItem = breakdown.find((item) => item.slotId?.toString?.() === slot._id.toString())
        || breakdown.find((item) => item.slotNumber === slot.slotNumber)
        || null;

      const refundAmount = this.toSafeNumber(breakdownItem?.refundAmount);

      slot.status = SLOT_STATUS.CANCELLED;
      slot.refundEligibility = outcome.refundEligible ? REFUND_ELIGIBILITY.FULL : REFUND_ELIGIBILITY.NONE;
      slot.cancellation = {
        cancelledBy,
        cancelledByRole,
        reason: cancellationReason,
        cancelledAt: now,
        refundAmount,
        refundPercentage: breakdownItem?.refundPercentage || 0,
      };
      slot.amountRefunded = round2(this.toSafeNumber(slot.amountRefunded) + refundAmount);

      await slot.save();
    }

    if (outcome.totalRefund > 0) {
      await ledgerService.onRefundIssued({
        bookingId,
        careSeekerId: booking.careSeekerId,
        amount: outcome.totalRefund,
        currency: outcome.currency,
      });
    }

    return {
      bookingId,
      cancelledByRole,
      refundRequestedAt: now,
      refundProcessedAt: outcome.totalRefund > 0 ? now : null,
      refundWindowEndsAt: outcome.refundWindowEndsAt,
      refundWindowHours: outcome.refundWindowHours,
      refundEligible: outcome.refundEligible,
      refundStatus: outcome.refundStatus,
      refundDecisionReason: outcome.refundDecisionReason,
      totalPaid: outcome.totalPaid,
      totalRefund: outcome.totalRefund,
      totalNonRefundable: outcome.totalNonRefundable,
      platformFee: outcome.platformFee,
      currency: outcome.currency,
      breakdown,
    };
  }
}

const refundService = new RefundService();
export default refundService;
