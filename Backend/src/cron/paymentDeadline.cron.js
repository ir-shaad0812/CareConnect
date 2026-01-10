// ============================================
// PAYMENT DEADLINE CRON
// Granular 12h / 6h / 1h reminders
// Auto-cancel/expire overdue bookings
// Auto-creates Task records for payment_due
// ============================================

import paymentService from '../services/payment.service.js';
import taskService from '../services/task.service.js';
import notificationService from '../services/notification.service.js';
import emailService from '../integrations/email/email.service.js';
import Booking from '../models/booking.model.js';
import { isConnected } from '../config/database.js';
import { NOTIFICATION_TYPE } from '../constants/booking.constants.js';

// Reminder checkpoints in hours before deadline
const REMINDER_HOURS = [12, 6, 1];

class PaymentDeadlineCron {
  constructor() {
    this.deadlineInterval = null;
    this.reminderInterval = null;
  }

  start() {
    console.log('[CRON] Payment deadline job scheduled (30m)');

    // Check expired deadlines every hour
    this.deadlineInterval = setInterval(() => this._processExpiredDeadlines(), 60 * 60 * 1000);

    // Check reminders every 30 minutes for granular 12h/6h/1h alerts
    this.reminderInterval = setInterval(() => this._sendGranularReminders(), 30 * 60 * 1000);

    // Warm-up run after 15 seconds
    setTimeout(() => {
      this._processExpiredDeadlines().catch(e => console.error('[CRON] Startup expired check:', e.message));
      this._sendGranularReminders().catch(e => console.error('[CRON] Startup reminder check:', e.message));
    }, 15_000);
  }

  stop() {
    if (this.deadlineInterval) { clearInterval(this.deadlineInterval); this.deadlineInterval = null; }
    if (this.reminderInterval) { clearInterval(this.reminderInterval); this.reminderInterval = null; }
    console.log('[CRON] Payment deadline job stopped');
  }

  // ─── Expired deadlines: expire/cancel + create tasks ───────────────────────

  async _processExpiredDeadlines() {
    if (!isConnected()) {
      return;
    }

    try {
      const results = await paymentService.handleExpiredDeadlines();
      if (results.length > 0) {
        console.log(`[CRON] Processed ${results.length} expired payment deadlines`);
      }

      // Ensure payment_due tasks are resolved for newly expired bookings
      for (const r of results) {
        if (r.action === 'auto_cancelled') {
          await taskService.resolvePaymentTask(r.bookingId).catch(() => null);
        }
      }
    } catch (err) {
      console.error('[CRON] Error processing expired deadlines:', err.message);
    }
  }

  // ─── Granular reminders: 12h / 6h / 1h before deadline ────────────────────

  async _sendGranularReminders() {
    if (!isConnected()) {
      return;
    }

    const now = new Date();

    for (const hoursAhead of REMINDER_HOURS) {
      try {
        const windowStart = new Date(now.getTime() + (hoursAhead - 0.5) * 60 * 60 * 1000);
        const windowEnd   = new Date(now.getTime() + (hoursAhead + 0.5) * 60 * 60 * 1000);

        const bookings = await Booking.find({
          paymentDeadline: { $gte: windowStart, $lte: windowEnd },
          paymentStatus: { $in: ['unpaid', 'payment_pending', 'partially_paid'] },
          status: { $in: ['confirmed', 'in_progress'] },
          amountDue: { $gt: 0 },
        }).populate('careSeekerId', 'fullName email');

        for (const booking of bookings) {
          await this._sendSingleReminder(booking, hoursAhead);
        }

        if (bookings.length > 0) {
          console.log(`[CRON] Sent ${bookings.length} payment reminders (${hoursAhead}h window)`);
        }
      } catch (err) {
        console.error(`[CRON] Error in ${hoursAhead}h reminder window:`, err.message);
      }
    }

    // Also create payment_due tasks for all partially-paid bookings that don't have one yet
    try {
      await this._ensurePaymentDueTasks();
    } catch (err) {
      console.error('[CRON] Error ensuring payment_due tasks:', err.message);
    }
  }

  // ─── Send one reminder notification + email ─────────────────────────────────

  async _sendSingleReminder(booking, hoursLeft) {
    const careSeeker = booking.careSeekerId;
    if (!careSeeker) return;

    const isUrgent = hoursLeft <= 1;
    const priority = hoursLeft <= 1 ? 'urgent' : hoursLeft <= 6 ? 'high' : 'normal';
    const amountStr = `NPR ${(booking.amountDue || 0).toFixed(2)}`;

    await notificationService.createNotification({
      userId: careSeeker._id,
      type: NOTIFICATION_TYPE.PAYMENT_DUE,
      title: isUrgent ? '⚠️ Payment Due in 1 Hour!' : `Payment Reminder – ${hoursLeft} hours left`,
      message: `Booking #${booking.bookingNumber} has ${amountStr} outstanding. Deadline in ${hoursLeft} hour${hoursLeft !== 1 ? 's' : ''}.`,
      priority,
      data: {
        referenceId: booking._id,
        referenceType: 'booking',
        actionUrl: `/booking/${booking._id}/payment`,
        metadata: { bookingNumber: booking.bookingNumber, amountDue: booking.amountDue, hoursLeft },
      },
      channels: { inApp: true, email: isUrgent || hoursLeft <= 6, push: true },
    }).catch(() => null);

    // Email for 6h and 1h checkpoints
    if (hoursLeft <= 6 && careSeeker.email) {
      await emailService.sendGenericNotificationEmail(
        careSeeker.email,
        careSeeker.fullName,
        isUrgent ? '⚠️ Final Warning: Payment Due in 1 Hour' : `Payment Reminder – ${hoursLeft} Hours Left`,
        `Your booking #${booking.bookingNumber} has an outstanding payment of ${amountStr}. ` +
        `The deadline expires in ${hoursLeft} hour${hoursLeft !== 1 ? 's' : ''}. ` +
        `Please pay to avoid automatic cancellation.`
      ).catch(() => null);
    }

    // Update task due date to keep it current
    await taskService.createPaymentDueTask(
      careSeeker._id, booking._id, booking.amountDue, booking.paymentDeadline
    ).catch(() => null);
  }

  // ─── Ensure payment_due tasks exist for all partial/unpaid confirmed bookings

  async _ensurePaymentDueTasks() {
    const bookings = await Booking.find({
      paymentStatus: { $in: ['unpaid', 'payment_pending', 'partially_paid'] },
      status: { $in: ['confirmed', 'in_progress'] },
      paymentDeadline: { $gt: new Date() },
      amountDue: { $gt: 0 },
    }).select('_id careSeekerId amountDue paymentDeadline');

    for (const b of bookings) {
      await taskService.createPaymentDueTask(
        b.careSeekerId, b._id, b.amountDue, b.paymentDeadline
      ).catch(() => null);
    }
  }
}

export default new PaymentDeadlineCron();
