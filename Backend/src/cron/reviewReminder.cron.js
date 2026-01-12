// ============================================
// REVIEW REMINDER CRON
// Sends review reminders for completed bookings
// ============================================

import Booking from '../models/booking.model.js';
import Notification from '../models/notification.model.js';
import { BOOKING_STATUS, NOTIFICATION_TYPE } from '../constants/booking.constants.js';
import { isConnected } from '../config/database.js';

const HOUR_MS = 60 * 60 * 1000;
const REVIEW_REMINDER_DELAY_HOURS = 2; // Send reminder 2 hours after completion

class ReviewReminderCron {
  constructor() {
    this.interval = null;
    this.io = null;
  }

  /**
   * Start the cron job
   * @param {Object} io - Socket.io instance for real-time notifications
   */
  start(io = null) {
    this.io = io;
    console.log('[CRON] Review reminder job scheduled');

    // Check for bookings needing review reminders every 15 minutes
    this.interval = setInterval(async () => {
      await this.processReviewReminders();
    }, 15 * 60 * 1000); // 15 minutes

    // Run once on startup after a short delay
    setTimeout(async () => {
      await this.processReviewReminders();
    }, 10000);
  }

  /**
   * Process and send review reminders for completed bookings
   */
  async processReviewReminders() {
    if (!isConnected()) {
      return;
    }

    try {
      const now = new Date();
      const reminderThreshold = new Date(now.getTime() - REVIEW_REMINDER_DELAY_HOURS * HOUR_MS);

      // Find completed bookings that:
      // 1. Were completed at least 2 hours ago
      // 2. Haven't had a review reminder sent yet
      // 3. Don't already have a review from the care seeker
      const eligibleBookings = await Booking.find({
        status: BOOKING_STATUS.COMPLETED,
        completedAt: { $lte: reminderThreshold },
        'remindersSent.type': { $ne: 'review_reminder' },
        // Only send if no review exists yet
        'review.rating': { $exists: false },
      })
        .select('_id bookingNumber careSeekerId caregiverId completedAt')
        .populate('caregiverId', 'fullName')
        .limit(50); // Process in batches

      if (eligibleBookings.length === 0) return;

      let successCount = 0;

      for (const booking of eligibleBookings) {
        try {
          // Create notification for care seeker
          await Notification.createNotification({
            userId: booking.careSeekerId,
            type: NOTIFICATION_TYPE.REVIEW_REMINDER,
            title: 'Share Your Experience',
            message: `How was your experience with ${booking.caregiverId?.fullName || 'your caregiver'}? Leave a review for booking #${booking.bookingNumber}`,
            priority: 'normal',
            data: {
              referenceId: booking._id,
              referenceType: 'booking',
              actionUrl: `/bookings/${booking._id}/review`,
              metadata: {
                bookingNumber: booking.bookingNumber,
                caregiverName: booking.caregiverId?.fullName || 'Caregiver',
              },
            },
          });

          // Mark that we've sent the review reminder
          await Booking.findByIdAndUpdate(booking._id, {
            $push: {
              remindersSent: {
                type: 'review_reminder',
                sentAt: new Date(),
                channel: 'in_app',
              },
            },
          });

          // Emit socket event if io is available
          if (this.io) {
            this.emitReviewReminder(booking);
          }

          successCount++;
        } catch (error) {
          console.error(`[CRON] Error sending review reminder for ${booking.bookingNumber}:`, error.message);
        }
      }

      if (successCount > 0) {
        console.log(`[CRON] Sent ${successCount} review reminders`);
      }
    } catch (error) {
      console.error('[CRON] Error processing review reminders:', error.message);
    }
  }

  /**
   * Emit socket event for review reminder
   */
  emitReviewReminder(booking) {
    if (!this.io) return;

    try {
      const careSeekerId = booking.careSeekerId.toString();

      this.io.to(`user_${careSeekerId}`).emit('review_reminder', {
        bookingId: booking._id,
        bookingNumber: booking.bookingNumber,
        caregiverName: booking.caregiverId?.fullName || 'Caregiver',
        message: 'Please share your experience!',
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
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    console.log('[CRON] Review reminder job stopped');
  }
}

export default new ReviewReminderCron();
