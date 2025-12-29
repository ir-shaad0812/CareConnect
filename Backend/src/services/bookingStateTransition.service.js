// ============================================
// BOOKING STATE TRANSITION SERVICE
// Enforces lifecycle transitions in service layer
// and writes immutable transition audit logs.
// ============================================

import Booking from '../models/booking.model.js';
import BookingStateTransition from '../models/bookingStateTransition.model.js';
import { STATE_TRANSITIONS } from '../constants/booking.constants.js';

const normalizeStatus = (value) => String(value || '').trim().toLowerCase();

class BookingStateTransitionService {
  getAllowedNextStatuses(currentStatus) {
    return STATE_TRANSITIONS[normalizeStatus(currentStatus)] || [];
  }

  assertTransitionAllowed(currentStatus, nextStatus) {
    const current = normalizeStatus(currentStatus);
    const next = normalizeStatus(nextStatus);

    const allowed = this.getAllowedNextStatuses(current);
    if (!allowed.includes(next)) {
      throw new Error(
        `Invalid booking transition ${current} -> ${next}. Allowed: [${allowed.join(', ')}]`,
      );
    }
  }

  async recordTransition(booking, fromStatus, toStatus, options = {}) {
    await BookingStateTransition.create({
      bookingId: booking._id,
      bookingNumber: booking.bookingNumber,
      fromStatus: normalizeStatus(fromStatus),
      toStatus: normalizeStatus(toStatus),
      reason: options.reason || '',
      actorId: options.actorId || null,
      actorRole: options.actorRole || 'system',
      source: options.source || 'service-layer',
      metadata: options.metadata || null,
      transitionedAt: options.transitionedAt || new Date(),
    });
  }

  async transition(bookingOrId, nextStatus, options = {}) {
    const next = normalizeStatus(nextStatus);

    const booking = typeof bookingOrId === 'string' || bookingOrId?._id == null
      ? await Booking.findById(bookingOrId)
      : bookingOrId;

    if (!booking) {
      throw new Error('Booking not found for transition');
    }

    const from = normalizeStatus(booking.status);

    if (from === next) {
      if (options.allowNoop) {
        return booking;
      }
      throw new Error(`Booking is already in status: ${next}`);
    }

    this.assertTransitionAllowed(from, next);

    booking.status = next;

    const transitionTime = options.transitionedAt || new Date();

    if (next === 'confirmed' && !booking.confirmedAt) {
      booking.confirmedAt = transitionTime;
    }

    if ((next === 'active' || next === 'in_progress') && !booking.startedAt) {
      booking.startedAt = transitionTime;
    }

    if (next === 'completed' && !booking.completedAt) {
      booking.completedAt = transitionTime;
    }

    if (next === 'cancelled') {
      booking.cancellation = {
        ...(booking.cancellation || {}),
        cancelledAt: booking.cancellation?.cancelledAt || transitionTime,
        cancelledBy: booking.cancellation?.cancelledBy || options.actorId || null,
      };
    }

    if (options.save !== false) {
      if (options.session) {
        await booking.save({ session: options.session });
      } else {
        await booking.save();
      }
    }

    await this.recordTransition(booking, from, next, {
      reason: options.reason,
      actorId: options.actorId,
      actorRole: options.actorRole,
      source: options.source,
      metadata: options.metadata,
      transitionedAt: transitionTime,
    });

    return booking;
  }
}

export default new BookingStateTransitionService();
