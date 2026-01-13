// ============================================
// TRACKING ENFORCEMENT CRON
// Enforces daily tracking accountability:
// 1) Auto-flag missed days (LOG_MISSED)
// 2) Ping caregiver when today's log is still pending
// ============================================

import Booking from '../models/booking.model.js';
import bookingService from '../services/booking.service.js';
import bookingDayService from '../services/bookingDay.service.js';
import { BOOKING_STATUS } from '../constants/booking.constants.js';
import { eventBus, SYSTEM_EVENTS } from '../utils/eventBus.js';
import { isConnected } from '../config/database.js';

const toDateOnly = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const isDateWithinSchedule = (targetDate, schedule = {}) => {
  if (!schedule.startDate) return false;
  const target = toDateOnly(targetDate);
  const start = toDateOnly(schedule.startDate);
  const end = toDateOnly(schedule.endDate || schedule.startDate);
  return target >= start && target <= end;
};

class TrackingEnforcementCron {
  constructor() {
    this.interval = null;
  }

  start() {
    console.log('[CRON] Tracking enforcement job scheduled (60m)');
    this.interval = setInterval(() => {
      this.run().catch((err) => {
        console.error('[CRON] Tracking enforcement interval failed:', err.message);
      });
    }, 60 * 60 * 1000);

    setTimeout(() => {
      this.run().catch((err) => {
        console.error('[CRON] Tracking warm-up failed:', err.message);
      });
    }, 20_000);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    console.log('[CRON] Tracking enforcement job stopped');
  }

  async run() {
    if (!isConnected()) {
      return;
    }

    const now = new Date();

    const monitoredStatuses = [
      BOOKING_STATUS.CONFIRMED,
      BOOKING_STATUS.ACTIVE,
      BOOKING_STATUS.IN_PROGRESS,
      BOOKING_STATUS.COMPLETED,
    ];

    const bookings = await Booking.find({
      status: { $in: monitoredStatuses },
      'agreement.accepted': true,
      'agreement.status': 'accepted',
      'schedule.startDate': { $lte: now },
    });

    let touchedBookings = 0;
    let missedSignals = 0;
    let remindersSent = 0;
    let bookingDaysMissed = 0;

    for (const booking of bookings) {
      try {
        const bookingDayResult = await bookingDayService.markMissedDaysForBooking(booking, now);
        bookingDaysMissed += bookingDayResult?.modifiedCount || 0;

        const beforeMissed = (booking.trackingLogs || []).filter(
          (log) => log.missed,
        ).length;

        const changed = bookingService.upsertMissedTrackingLogs(booking, now);
        if (changed) {
          await booking.save();
          touchedBookings += 1;

          const afterMissed = (booking.trackingLogs || []).filter(
            (log) => log.missed,
          ).length;
          missedSignals += Math.max(afterMissed - beforeMissed, 1);

          eventBus.emitToBookingParties(booking, SYSTEM_EVENTS.TRACKING_MISSED, {
            bookingId: booking._id,
            bookingNumber: booking.bookingNumber,
            source: 'tracking_enforcement_cron',
            message: 'One or more daily tracking logs were missed and auto-flagged.',
          });
        }

        // Reminder is only relevant for ongoing sessions, not completed bookings.
        if (
          ![
            BOOKING_STATUS.CONFIRMED,
            BOOKING_STATUS.ACTIVE,
            BOOKING_STATUS.IN_PROGRESS,
          ].includes(booking.status)
        ) {
          continue;
        }

        if (!isDateWithinSchedule(now, booking.schedule)) {
          continue;
        }

        const reminderResult = await bookingService.sendTrackingReminder(
          booking._id,
          now,
          null,
          {
            source: 'system',
          },
        );

        if (reminderResult?.sent) {
          remindersSent += 1;
        }
      } catch (bookingError) {
        console.error(
          `[CRON] Tracking enforcement failed for booking ${booking.bookingNumber}:`,
          bookingError.message,
        );
      }
    }

    if (touchedBookings > 0 || remindersSent > 0 || bookingDaysMissed > 0) {
      console.log(
        `[CRON] Tracking enforcement: touched=${touchedBookings}, missed=${missedSignals}, reminders=${remindersSent}, bookingDaysMissed=${bookingDaysMissed}`,
      );
    }
  }
}

export default new TrackingEnforcementCron();
