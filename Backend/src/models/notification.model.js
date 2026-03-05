// ============================================
// NOTIFICATION MODEL
// Handles all platform notifications
// ============================================

import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  // User who receives the notification
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },

  // Notification type
  type: {
    type: String,
    enum: [
      // Booking related
      'booking_request',
      'booking_caregiver_accepted',
      'booking_caregiver_rejected',
      'booking_confirmed',
      'booking_rejected',
      'booking_cancelled',
      'booking_modified',
      'booking_reminder',
      'booking_started',
      'booking_completed',
      'agreement_acceptance_required',

      // Check-in/out
      'check_in',
      'check_out',
      'check_in_reminder',
      'check_out_reminder',

      // Care reports
      'care_report_submitted',
      'care_report_updated',
      'incident_reported',

      // Payment related
      'payment_received',
      'payment_released',
      'payment_pending',
      'payment_failed',
      'refund_processed',
      'payout_sent',

      // Chat related
      'new_message',
      'message_read',

      // Document related
      'document_uploaded',
      'document_verified',
      'document_rejected',
      'document_expiring',

      // Profile related
      'profile_viewed',
      'profile_approved',
      'profile_update_required',

      // Review related
      'review_received',
      'review_response',
      'review_reminder',

      // System notifications
      'account_suspended',
      'account_activated',
      'password_changed',
      'new_match',
      'promotion',
      'system_update',
      'welcome',

      // Safety related
      'emergency_alert',
      'safety_check',

      // Notice board
      'new_notice',

      // Reservation lifecycle
      'reservation_created',
      'reservation_expiring',
      'reservation_expired',
      'reservation_extended',

      // Task center
      'payment_due',
      'task_assigned',
      'deadline_reminder',
    ],
    required: true,
  },

  // Notification title
  title: {
    type: String,
    required: true,
  },

  // Notification message
  message: {
    type: String,
    required: true,
  },

  // Additional data for deep linking and context
  data: {
    // Reference to related entity
    referenceId: mongoose.Schema.Types.ObjectId,
    referenceType: {
      type: String,
      enum: ['booking', 'user', 'document', 'message', 'review', 'payment', 'transaction', 'care_report', 'notice', 'task'],
    },
    // Action URL for web
    actionUrl: String,
    // Deep link for mobile
    deepLink: String,
    // Additional metadata
    metadata: mongoose.Schema.Types.Mixed,
  },

  // Which channels to send notification through
  channels: {
    inApp: {
      type: Boolean,
      default: true,
    },
    push: {
      type: Boolean,
      default: false,
    },
    email: {
      type: Boolean,
      default: false,
    },
    sms: {
      type: Boolean,
      default: false,
    },
  },

  // Delivery status for each channel
  deliveryStatus: {
    inApp: {
      sent: { type: Boolean, default: false },
      sentAt: Date,
    },
    push: {
      sent: { type: Boolean, default: false },
      sentAt: Date,
      deviceToken: String,
    },
    email: {
      sent: { type: Boolean, default: false },
      sentAt: Date,
      emailId: String,
    },
    sms: {
      sent: { type: Boolean, default: false },
      sentAt: Date,
      messageId: String,
    },
  },

  // Read status
  read: {
    type: Boolean,
    default: false,
    index: true,
  },

  readAt: Date,

  // Priority level
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
  },

  // Expiry date (for time-sensitive notifications)
  expiresAt: Date,

  // Grouping key for notification batching
  groupKey: String,

  // Scheduled send time
  scheduledFor: Date,

  // Sent status
  sent: {
    type: Boolean,
    default: false,
  },

  sentAt: Date,

}, {
  timestamps: true,
});

// Virtual: alias isRead → read for frontend compatibility
notificationSchema.virtual('isRead').get(function() {
  return this.read;
});
notificationSchema.set('toJSON', { virtuals: true });
notificationSchema.set('toObject', { virtuals: true });

// Indexes
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, type: 1 });
notificationSchema.index({ scheduledFor: 1, sent: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static method to create and send notification
notificationSchema.statics.createNotification = async function(notificationData) {
  const notification = new this(notificationData);
  await notification.save();
  
  // Mark in-app as sent immediately
  if (notification.channels.inApp) {
    notification.deliveryStatus.inApp.sent = true;
    notification.deliveryStatus.inApp.sentAt = new Date();
    notification.sent = true;
    notification.sentAt = new Date();
    await notification.save();

    try {
      const io = global.__careconnect_io;
      if (io) {
        io.to(`user_${notification.userId.toString()}`).emit('notification:new', notification);
      }
    } catch {
      // Non-fatal realtime delivery failure
    }
  }

  const hasDeferredChannels = Boolean(
    notification.channels.email ||
    notification.channels.push ||
    notification.channels.sms
  );

  if (hasDeferredChannels) {
    try {
      const queueModule = await import('../services/notificationQueue.service.js');
      const queueService = queueModule.default;
      const enqueueResult = await queueService.enqueueDelivery(notification._id);

      if (
        !enqueueResult.queued &&
        typeof global.__careconnect_notification_dispatcher === 'function'
      ) {
        await global.__careconnect_notification_dispatcher(notification._id.toString());
      }
    } catch {
      // Queue failures should never block notification persistence
    }
  }
  
  return notification;
};

// Static method to get unread count for user
notificationSchema.statics.getUnreadCount = async function(userId) {
  return this.countDocuments({ userId, read: false });
};

// Static method to mark all as read for user
notificationSchema.statics.markAllAsRead = async function(userId) {
  return this.updateMany(
    { userId, read: false },
    { $set: { read: true, readAt: new Date() } }
  );
};

// Instance method to mark as read
notificationSchema.methods.markAsRead = async function() {
  if (!this.read) {
    this.read = true;
    this.readAt = new Date();
    await this.save();
  }
  return this;
};

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
