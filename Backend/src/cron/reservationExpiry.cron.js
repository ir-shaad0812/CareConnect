// ============================================
// RESERVATION EXPIRY CRON
// Automatic expiration of timed-out reservations
// ============================================

import Booking from '../models/booking.model.js';
import Notification from '../models/notification.model.js';
import bookingStateTransitionService from '../services/bookingStateTransition.service.js';
import { BOOKING_STATUS, NOTIFICATION_TYPE, RESERVATION_CONFIG } from '../constants/booking.constants.js';
import { isConnected } from '../config/database.js';

const MINUTE_MS = 60 * 1000;
const WARNING_THRESHOLD_SECONDS = 120; // 2 minutes warning

class ReservationExpiryCron {
  constructor() {
    this.expiryInterval = null;
    this.warningInterval = null;
    this.io = null;
  }

  /**
   * Start the cron job
   * @param {Object} io - Socket.io instance for real-time notifications
   */
  start(io = null) {
    this.io = io;
    console.log('[CRON] Reservation expiry job scheduled');

    // Process expired reservations every minute
    this.expiryInterval = setInterval(async () => {
      await this.processExpiredReservations();
    }, MINUTE_MS);

    // Send expiring soon warnings every 30 seconds
    this.warningInterval = setInterval(async () => {
      await this.sendExpiringWarnings();
    }, 30 * 1000);

    // Run once on startup after a short delay
    setTimeout(async () => {
      await this.processExpiredReservations();
    }, 5000);
  }

  /**
   * Process and expire reservations past their deadline
   */
  async processExpiredReservations() {
    if (!isConnected()) {
      return;
    }

    try {
      const now = new Date();

      // Find all expired reservations
      const expiredReservations = await Booking.find({
        status: BOOKING_STATUS.RESERVED,
        reservationExpiry: { $lt: now },
      }).select('_id bookingNumber careSeekerId caregiverId schedule');

      if (expiredReservations.length === 0) return;

      for (const booking of expiredReservations) {
        try {
          const bookingDoc = await Booking.findById(booking._id);
          if (!bookingDoc || bookingDoc.status !== BOOKING_STATUS.RESERVED) {
            continue;
          }

          await bookingStateTransitionService.transition(
            bookingDoc,
            BOOKING_STATUS.EXPIRED,
            {
              source: 'cron.reservationExpiry',
              reason: 'Reservation expired automatically after hold timeout',
              transitionedAt: now,
              metadata: {
                reservationExpiry: bookingDoc.reservationExpiry || null,
              },
            },
          );

          // Create notification for care seeker
          await Notification.createNotification({
            userId: booking.careSeekerId,
            type: NOTIFICATION_TYPE.RESERVATION_EXPIRED,
            title: 'Reservation Expired',
            message: `Your reservation #${booking.bookingNumber} has expired. The time slot is now available for other bookings.`,
            priority: 'normal',
            data: {
              referenceId: booking._id,
              referenceType: 'booking',
              actionUrl: `/book/${booking.caregiverId}`,
              metadata: {
                bookingNumber: booking.bookingNumber,
              },
            },
          });

          // Emit socket event if io is available
          if (this.io) {
            this.emitReservationExpired(booking);
          }

          console.log(`[CRON] Expired reservation: ${booking.bookingNumber}`);
        } catch (error) {
          console.error(`[CRON] Error expiring reservation ${booking.bookingNumber}:`, error.message);
        }
      }

      console.log(`[CRON] Processed ${expiredReservations.length} expired reservations`);
    } catch (error) {
      console.error('[CRON] Error processing expired reservations:', error.message);
    }
  }

  /**
   * Send warnings for reservations about to expire
   */
  async sendExpiringWarnings() {
    if (!isConnected()) {
      return;
    }

    try {
      const now = new Date();
      const warningThreshold = new Date(now.getTime() + WARNING_THRESHOLD_SECONDS * 1000);

      // Find reservations expiring within the warning threshold
      const expiringReservations = await Booking.find({
        status: BOOKING_STATUS.RESERVED,
        reservationExpiry: {
          $gt: now,
          $lte: warningThreshold,
        },
        // Don't send multiple warnings (check if we've already warned)
        'remindersSent.type': { $ne: 'reservation_expiring' },
      }).select('_id bookingNumber careSeekerId reservationExpiry');

      for (const booking of expiringReservations) {
        try {
          const remainingSeconds = Math.floor(
            (new Date(booking.reservationExpiry).getTime() - now.getTime()) / 1000
          );

          // Emit socket warning
          if (this.io) {
            this.emitReservationExpiringSoon(booking, remainingSeconds);
          }

          // Mark that we've sent a warning
          await Booking.findByIdAndUpdate(booking._id, {
            $push: {
              remindersSent: {
                type: 'reservation_expiring',
                sentAt: new Date(),
                channel: 'in_app',
              },
            },
          });
        } catch (error) {
          console.error(`[CRON] Error sending warning for ${booking.bookingNumber}:`, error.message);
        }
      }
    } catch (error) {
      console.error('[CRON] Error sending expiring warnings:', error.message);
    }
  }

  /**
   * Emit socket event when reservation expires
   */
  emitReservationExpired(booking) {
    if (!this.io) return;

    try {
      // Get online users and send to care seeker
      const careSeekerId = booking.careSeekerId.toString();

      this.io.to(`user_${careSeekerId}`).emit('reservation_expired', {
        bookingId: booking._id,
        bookingNumber: booking.bookingNumber,
        message: 'Your reservation has expired',
        timestamp: new Date(),
      });
      this.io.to(`user:${careSeekerId}`).emit('reservation_expired', {
        bookingId: booking._id,
        bookingNumber: booking.bookingNumber,
        message: 'Your reservation has expired',
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('[CRON] Socket emit error:', error.message);
    }
  }

  /**
   * Emit socket event when reservation is about to expire
   */
  emitReservationExpiringSoon(booking, remainingSeconds) {
    if (!this.io) return;

    try {
      const careSeekerId = booking.careSeekerId.toString();

      this.io.to(`user_${careSeekerId}`).emit('reservation_expiring_soon', {
        bookingId: booking._id,
        bookingNumber: booking.bookingNumber,
        remainingSeconds,
        expiresAt: booking.reservationExpiry,
        message: `Your reservation expires in ${Math.ceil(remainingSeconds / 60)} minutes`,
        timestamp: new Date(),
      });
      this.io.to(`user:${careSeekerId}`).emit('reservation_expiring_soon', {
        bookingId: booking._id,
        bookingNumber: booking.bookingNumber,
        remainingSeconds,
        expiresAt: booking.reservationExpiry,
        message: `Your reservation expires in ${Math.ceil(remainingSeconds / 60)} minutes`,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('[CRON] Socket emit error:', error.message);
    }
  }

  /**
   * Stop the cron job
   */
  stop() {
    if (this.expiryInterval) {
      clearInterval(this.expiryInterval);
      this.expiryInterval = null;
    }
    if (this.warningInterval) {
      clearInterval(this.warningInterval);
      this.warningInterval = null;
    }
    console.log('[CRON] Reservation expiry job stopped');
  }
}

export default new ReservationExpiryCron();
