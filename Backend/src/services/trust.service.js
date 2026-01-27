// ============================================
// TRUST SERVICE — Sprint C
// Caregiver strike system + careseeker abuse detection.
//
// Rules (spec):
//   - On caregiver cancel → increment consecutiveCancellationCount
//   - At count == 4 → warning ("one more = suspension")
//   - At count >= 5 → auto-suspend, block new bookings, notify admin
//   - On caregiver completed booking → reset count = 0
// ============================================

import User from '../models/user.model.js';
import Notification from '../models/notification.model.js';
import { NOTIFICATION_TYPE } from '../constants/booking.constants.js';

export const TRUST_CONFIG = {
  WARNING_THRESHOLD: 4,
  SUSPEND_THRESHOLD: 5,
  SUSPENSION_DAYS: 30,
  CARESEEKER_ABUSE_THRESHOLD: 3, // >3 cancels/30d flags for admin review
};

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

class TrustService {
  /**
   * Record a caregiver cancellation. Increments the strike counter
   * and triggers warning / suspension as needed.
   * Returns { strikes, warned, suspended }.
   */
  async onCaregiverCancel(caregiverId, { reason = '' } = {}) {
    const caregiver = await User.findById(caregiverId);
    if (!caregiver) throw new Error('Caregiver not found');

    caregiver.caregiverTrust = caregiver.caregiverTrust || {};
    const trust = caregiver.caregiverTrust;
    trust.consecutiveCancellationCount = (trust.consecutiveCancellationCount || 0) + 1;
    trust.totalCancellations = (trust.totalCancellations || 0) + 1;
    trust.lastCancellationAt = new Date();

    const strikes = trust.consecutiveCancellationCount;
    let warned = false;
    let suspended = false;

    if (strikes === TRUST_CONFIG.WARNING_THRESHOLD) {
      trust.lastWarningAt = new Date();
      warned = true;

      await Notification.createNotification({
        userId: caregiver._id,
        type: NOTIFICATION_TYPE.ACCOUNT_SUSPENDED, // reuse system alert
        title: '⚠️ Warning: One more cancellation will lead to suspension',
        message: `You have cancelled ${strikes} bookings in a row. One more cancellation will auto-suspend your account for ${TRUST_CONFIG.SUSPENSION_DAYS} days.`,
        priority: 'urgent',
        data: { referenceType: 'trust', metadata: { strikes } },
      }).catch(() => null);
    }

    if (strikes >= TRUST_CONFIG.SUSPEND_THRESHOLD) {
      const until = new Date();
      until.setDate(until.getDate() + TRUST_CONFIG.SUSPENSION_DAYS);
      trust.suspendedUntil = until;
      trust.suspensionReason = `Auto-suspended after ${strikes} consecutive cancellations`;
      suspended = true;

      await Notification.createNotification({
        userId: caregiver._id,
        type: NOTIFICATION_TYPE.ACCOUNT_SUSPENDED,
        title: 'Account Suspended',
        message: `Your account has been auto-suspended until ${until.toDateString()} due to ${strikes} consecutive cancellations. Contact support to appeal.`,
        priority: 'urgent',
        data: { referenceType: 'trust', metadata: { strikes, suspendedUntil: until } },
      }).catch(() => null);

      // Notify admins
      const admins = await User.find({ role: 'admin' }).select('_id');
      for (const admin of admins) {
        await Notification.createNotification({
          userId: admin._id,
          type: NOTIFICATION_TYPE.ACCOUNT_SUSPENDED,
          title: 'Caregiver auto-suspended',
          message: `${caregiver.fullName} auto-suspended after ${strikes} consecutive cancellations.`,
          priority: 'high',
          data: { referenceId: caregiver._id, referenceType: 'user', metadata: { strikes } },
        }).catch(() => null);
      }
    }

    await caregiver.save();
    return { strikes, warned, suspended, suspendedUntil: trust.suspendedUntil };
  }

  /**
   * Reset strike count when a caregiver completes a booking.
   */
  async onCaregiverCompleteBooking(caregiverId) {
    const caregiver = await User.findById(caregiverId);
    if (!caregiver) return;
    caregiver.caregiverTrust = caregiver.caregiverTrust || {};
    caregiver.caregiverTrust.consecutiveCancellationCount = 0;
    caregiver.caregiverTrust.totalCompletedBookings =
      (caregiver.caregiverTrust.totalCompletedBookings || 0) + 1;
    await caregiver.save();
  }

  /**
   * Check if a caregiver is currently suspended.
   * Auto-clears expired suspensions.
   */
  async isCaregiverSuspended(caregiverId) {
    const caregiver = await User.findById(caregiverId).select('caregiverTrust');
    if (!caregiver?.caregiverTrust?.suspendedUntil) return false;
    const until = new Date(caregiver.caregiverTrust.suspendedUntil);
    if (Date.now() > until.getTime()) {
      // Expired — clear it
      await User.updateOne(
        { _id: caregiverId },
        { $unset: { 'caregiverTrust.suspendedUntil': '', 'caregiverTrust.suspensionReason': '' } }
      );
      return false;
    }
    return true;
  }

  /**
   * Record a careseeker cancellation. Flags if threshold exceeded.
   */
  async onCareseekerCancel(careseekerId) {
    const user = await User.findById(careseekerId);
    if (!user) return;

    user.careseekerTrust = user.careseekerTrust || {};
    const trust = user.careseekerTrust;

    // Recompute 30-day window based on lastCancellationAt decay
    if (trust.lastCancellationAt &&
        (Date.now() - new Date(trust.lastCancellationAt).getTime()) > THIRTY_DAYS_MS) {
      trust.cancellationsLast30Days = 0;
      trust.abuseFlagged = false;
      trust.abuseFlaggedAt = null;
    }

    trust.cancellationsLast30Days = (trust.cancellationsLast30Days || 0) + 1;
    trust.totalCancellations = (trust.totalCancellations || 0) + 1;
    trust.lastCancellationAt = new Date();

    if (trust.cancellationsLast30Days > TRUST_CONFIG.CARESEEKER_ABUSE_THRESHOLD && !trust.abuseFlagged) {
      trust.abuseFlagged = true;
      trust.abuseFlaggedAt = new Date();

      const admins = await User.find({ role: 'admin' }).select('_id');
      for (const admin of admins) {
        await Notification.createNotification({
          userId: admin._id,
          type: NOTIFICATION_TYPE.SYSTEM_UPDATE,
          title: 'Careseeker cancellation abuse flagged',
          message: `${user.fullName} has cancelled ${trust.cancellationsLast30Days} bookings in the last 30 days.`,
          priority: 'high',
          data: { referenceId: user._id, referenceType: 'user' },
        }).catch(() => null);
      }
    }

    await user.save();
    return trust;
  }

  /**
   * True when a care seeker is temporarily restricted from creating/submitting
   * new bookings due to repeated cancellations within the 30-day abuse window.
   * Automatically clears stale flags once the window passes.
   */
  async isCareSeekerRestricted(careseekerId) {
    const user = await User.findById(careseekerId).select('careseekerTrust');
    const trust = user?.careseekerTrust;

    if (!trust?.abuseFlagged) {
      return false;
    }

    if (!trust.lastCancellationAt) {
      return true;
    }

    const elapsed = Date.now() - new Date(trust.lastCancellationAt).getTime();
    if (elapsed <= THIRTY_DAYS_MS) {
      return true;
    }

    await User.updateOne(
      { _id: careseekerId },
      {
        $set: {
          'careseekerTrust.cancellationsLast30Days': 0,
          'careseekerTrust.abuseFlagged': false,
          'careseekerTrust.abuseFlaggedAt': null,
        },
      },
    );

    return false;
  }
}

const trustService = new TrustService();
export default trustService;
