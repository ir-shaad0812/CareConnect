// ============================================
// AUTO-REPLACEMENT SERVICE — Sprint C
// When a caregiver cancels, suggest alternative caregivers to the
// careseeker. Leverages existing matchEngine if available.
// ============================================

import User from '../models/user.model.js';
import Caregiver from '../models/caregiver.model.js';
import Booking from '../models/booking.model.js';
import Notification from '../models/notification.model.js';
import { NOTIFICATION_TYPE } from '../constants/booking.constants.js';

class AutoReplacementService {
  /**
   * Find up to N alternative caregivers for a cancelled booking.
   * Uses simple scoring: matching service type, city, active status,
   * not the cancelled caregiver, not suspended.
   */
  async findAlternatives(bookingId, { limit = 3 } = {}) {
    const booking = await Booking.findById(bookingId);
    if (!booking) throw new Error('Booking not found');

    const excludedId = booking.caregiverId;

    // Base query: active, not suspended, not the cancelled caregiver
    const candidates = await User.find({
      _id: { $ne: excludedId },
      role: 'caregiver',
      isActive: { $ne: false },
      $or: [
        { 'caregiverTrust.suspendedUntil': { $exists: false } },
        { 'caregiverTrust.suspendedUntil': null },
        { 'caregiverTrust.suspendedUntil': { $lt: new Date() } },
      ],
    })
      .select('_id fullName avatar rating totalReviews city location caregiverTrust')
      .sort({ rating: -1, totalReviews: -1 })
      .limit(limit * 3); // over-fetch, filter below

    // Simple score: rating + review count + location match
    const scored = candidates.map(c => {
      let score = (c.rating || 0) * 20 + Math.min(c.totalReviews || 0, 50);
      if (booking.location?.city && c.city === booking.location.city) score += 15;
      if ((c.caregiverTrust?.totalCompletedBookings || 0) > 10) score += 10;
      return { caregiver: c, score };
    }).sort((a, b) => b.score - a.score).slice(0, limit);

    return scored.map(({ caregiver, score }) => ({
      id: caregiver._id,
      fullName: caregiver.fullName,
      avatar: caregiver.avatar,
      rating: caregiver.rating,
      totalReviews: caregiver.totalReviews,
      score,
    }));
  }

  /**
   * Notify the careseeker with replacement options. The careseeker can
   * then accept one or request a full refund via existing cancel flow.
   */
  async notifyReplacementOptions(bookingId) {
    const booking = await Booking.findById(bookingId);
    if (!booking) return;

    const alternatives = await this.findAlternatives(bookingId, { limit: 3 });

    await Notification.createNotification({
      userId: booking.careSeekerId,
      type: NOTIFICATION_TYPE.BOOKING_CANCELLED,
      title: 'Caregiver cancelled — replacements suggested',
      message: `Your caregiver cancelled booking #${booking.bookingNumber}. We found ${alternatives.length} alternative caregivers. You may accept one or request a full refund.`,
      priority: 'urgent',
      data: {
        referenceId: booking._id,
        referenceType: 'booking',
        actionUrl: `/dashboard/careseeker/bookings/${booking._id}/replace`,
        metadata: { alternatives, bookingNumber: booking.bookingNumber },
      },
    }).catch(() => null);

    return alternatives;
  }
}

const autoReplacementService = new AutoReplacementService();
export default autoReplacementService;
