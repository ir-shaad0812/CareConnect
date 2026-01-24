// ============================================
// SLOT SERVICE — Sprint A
// Atomize a booking into daily slots and allocate money per slot.
// ============================================

import Slot, { SLOT_STATUS } from '../models/slot.model.js';
import Booking from '../models/booking.model.js';
import ledgerService from './ledger.service.js';
import { PLATFORM_FEE_PERCENTAGE } from '../constants/booking.constants.js';

const round2 = (n) => Math.round(n * 100) / 100;

class SlotService {
  /**
   * Parse an HH:MM string onto a given date.
   * Returns a new Date in the server's local time.
   */
  _applyTime(date, hhmm) {
    if (!hhmm || typeof hhmm !== 'string') return new Date(date);
    const [h, m] = hhmm.split(':').map(n => parseInt(n, 10));
    const out = new Date(date);
    out.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0, 0);
    return out;
  }

  /**
   * Enumerate each calendar day from start to end inclusive.
   */
  _eachDay(startDate, endDate) {
    const days = [];
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);

    const cursor = new Date(start);
    while (cursor.getTime() <= end.getTime()) {
      days.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return days;
  }

  /**
   * Start/end timestamps for a calendar day.
   */
  _dayBounds(dateValue) {
    const start = new Date(dateValue);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  /**
   * Build slot documents from a booking — does NOT persist.
   * @param {Object} booking - Booking document (can be plain object)
   * @returns {Array<Object>} slot payloads ready for Slot.insertMany
   */
  buildSlotsFromBooking(booking) {
    if (!booking || !booking.schedule) {
      throw new Error('Booking has no schedule');
    }

    const days = this._eachDay(booking.schedule.startDate, booking.schedule.endDate);
    if (days.length === 0) {
      throw new Error('Booking schedule has zero days');
    }

    const total = Number(booking.totalAmount || booking.pricing?.total || 0);
    // Even allocation across days, with remainder on last slot to avoid fractional loss
    const perSlotBase = Math.floor((total / days.length) * 100) / 100;
    const allocated = [];
    let running = 0;
    for (let i = 0; i < days.length; i++) {
      if (i === days.length - 1) {
        const last = Math.round((total - running) * 100) / 100;
        allocated.push(last);
      } else {
        allocated.push(perSlotBase);
        running += perSlotBase;
      }
    }

    return days.map((day, idx) => {
      const scheduledStart = this._applyTime(day, booking.schedule.startTime);
      const scheduledEnd = this._applyTime(day, booking.schedule.endTime);
      // If endTime < startTime, assume same-day end-of-day
      if (scheduledEnd.getTime() <= scheduledStart.getTime()) {
        scheduledEnd.setHours(23, 59, 0, 0);
      }

      return {
        bookingId: booking._id,
        careSeekerId: booking.careSeekerId,
        caregiverId: booking.caregiverId,
        slotNumber: idx + 1,
        scheduledStart,
        scheduledEnd,
        status: SLOT_STATUS.PENDING,
        amountAllocated: allocated[idx],
        amountPaid: 0,
        amountRefunded: 0,
        amountReleased: 0,
        currency: booking.pricing?.currency || 'NPR',
      };
    });
  }

  /**
   * Create and persist slots for a booking. Idempotent — if slots already
   * exist for this booking, returns the existing ones instead of duplicating.
   */
  async createSlotsForBooking(booking) {
    const existing = await Slot.find({ bookingId: booking._id }).sort({ slotNumber: 1 });
    if (existing.length > 0) return existing;

    const payloads = this.buildSlotsFromBooking(booking);
    const slots = await Slot.insertMany(payloads, { ordered: true });
    return slots;
  }

  /**
   * Fetch all slots for a booking, ordered.
   */
  async getSlotsByBooking(bookingId) {
    return Slot.find({ bookingId }).sort({ slotNumber: 1 });
  }

  /**
   * Distribute a payment amount across slots in order (oldest first).
   * Used by payment.service on successful payment to credit individual slots.
   */
  async allocatePaymentToSlots(bookingId, amount) {
    if (amount <= 0) return [];
    const booking = await Booking.findById(bookingId).select('_id caregiverId');
    const slots = await Slot.find({ bookingId }).sort({ slotNumber: 1 });
    const updated = [];
    let remaining = amount;

    for (const slot of slots) {
      if (remaining <= 0) break;
      const owed = Math.max(0, slot.amountAllocated - slot.amountPaid);
      if (owed <= 0) continue;

      const credit = Math.min(owed, remaining);
      slot.amountPaid = round2(slot.amountPaid + credit);
      remaining = round2(remaining - credit);
      await slot.save();

      // If this slot had already been completed, release newly credited funds immediately.
      if (booking && slot.status === SLOT_STATUS.COMPLETED) {
        await this.releasePaidAmountForSlot(slot, booking);
      }

      updated.push(slot);
    }
    return updated;
  }

  /**
   * Find the slot corresponding to the given calendar day for a booking.
   */
  async getSlotForBookingDate(bookingId, dateValue) {
    const { start, end } = this._dayBounds(dateValue);
    return Slot.findOne({
      bookingId,
      scheduledStart: { $gte: start, $lte: end },
    }).sort({ slotNumber: 1 });
  }

  /**
   * Mark slot in-progress for check-in day.
   */
  async markSlotInProgress(bookingId, dateValue) {
    const slot = await this.getSlotForBookingDate(bookingId, dateValue);
    if (!slot) return null;

    if ([SLOT_STATUS.CANCELLED, SLOT_STATUS.COMPLETED].includes(slot.status)) {
      return slot;
    }

    if (slot.status !== SLOT_STATUS.IN_PROGRESS) {
      slot.status = SLOT_STATUS.IN_PROGRESS;
      await slot.save();
    }

    return slot;
  }

  /**
   * Mark slot completed for check-out day.
   */
  async markSlotCompleted(bookingId, dateValue) {
    const slot = await this.getSlotForBookingDate(bookingId, dateValue);
    if (!slot) return null;

    if (slot.status === SLOT_STATUS.CANCELLED) {
      return slot;
    }

    if (slot.status !== SLOT_STATUS.COMPLETED) {
      slot.status = SLOT_STATUS.COMPLETED;
      slot.completedAt = slot.completedAt || new Date();
      await slot.save();
    }

    return slot;
  }

  /**
   * Release paid amount for a completed slot to caregiver wallet.
   * Idempotent through amountReleased delta calculation.
   */
  async releasePaidAmountForSlot(
    slot,
    booking,
    { commissionPct = PLATFORM_FEE_PERCENTAGE } = {},
  ) {
    if (!slot || !booking || slot.status !== SLOT_STATUS.COMPLETED) {
      return null;
    }

    const releasableGross = round2(Math.max(0, slot.amountPaid - slot.amountReleased));
    if (releasableGross <= 0) {
      return null;
    }

    const releaseResult = await ledgerService.onSlotReleased({
      bookingId: booking._id,
      slotId: slot._id,
      caregiverId: booking.caregiverId,
      amount: releasableGross,
      currency: slot.currency || 'NPR',
      commissionPct,
    });

    slot.amountReleased = round2(slot.amountReleased + releasableGross);
    await slot.save();

    return {
      slotId: slot._id,
      grossReleased: releasableGross,
      ...releaseResult,
    };
  }

  /**
   * Complete today's slot and release any paid amount to caregiver wallet.
   */
  async completeAndReleaseSlotForDate(
    booking,
    dateValue,
    { commissionPct = PLATFORM_FEE_PERCENTAGE } = {},
  ) {
    const slot = await this.markSlotCompleted(booking._id, dateValue);
    if (!slot || slot.status === SLOT_STATUS.CANCELLED) {
      return { slot: null, release: null };
    }

    const release = await this.releasePaidAmountForSlot(slot, booking, { commissionPct });
    return { slot, release };
  }

  /**
   * Summary for a booking — useful for UI and refund preview.
   */
  async getBookingSlotSummary(bookingId) {
    const slots = await this.getSlotsByBooking(bookingId);
    const totalAllocated = slots.reduce((s, x) => s + x.amountAllocated, 0);
    const totalPaid = slots.reduce((s, x) => s + x.amountPaid, 0);
    const totalRefunded = slots.reduce((s, x) => s + x.amountRefunded, 0);
    const byStatus = slots.reduce((acc, s) => {
      acc[s.status] = (acc[s.status] || 0) + 1;
      return acc;
    }, {});

    return {
      slotCount: slots.length,
      totalAllocated: Math.round(totalAllocated * 100) / 100,
      totalPaid: Math.round(totalPaid * 100) / 100,
      totalRefunded: Math.round(totalRefunded * 100) / 100,
      byStatus,
      slots,
    };
  }
}

const slotService = new SlotService();
export default slotService;
