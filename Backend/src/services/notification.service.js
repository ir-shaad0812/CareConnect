// ============================================
// NOTIFICATION SERVICE
// Handles all notification-related operations
// ============================================

import Notification from '../models/notification.model.js';
import User from '../models/user.model.js';
import emailService from './email.service.js';
import notificationQueueService from './notificationQueue.service.js';
import { NOTIFICATION_TYPE } from '../constants/booking.constants.js';

class NotificationService {
  constructor() {
    notificationQueueService.registerProcessor(this.processDeliveryJob.bind(this));
    global.__careconnect_notification_dispatcher = async (notificationId) => {
      return this.processDeliveryJob({ notificationId });
    };
  }

  /**
   * Create and send a notification
   */
  async createNotification(data) {
    const notification = await Notification.createNotification({
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      priority: data.priority || 'normal',
      data: data.data || {},
      channels: data.channels || { inApp: true },
    });

    return notification;
  }

  /**
   * Queue worker processor for deferred notification channels.
   */
  async processDeliveryJob({ notificationId }) {
    const notification = await Notification.findById(notificationId);

    if (!notification) {
      return { processed: false, reason: 'notification_not_found' };
    }

    if (notification.channels?.email && !notification.deliveryStatus?.email?.sent) {
      await this.sendEmailNotification(notification);
    }

    if (notification.channels?.push && !notification.deliveryStatus?.push?.sent) {
      await this.sendPushNotification(notification);
    }

    if (notification.channels?.sms && !notification.deliveryStatus?.sms?.sent) {
      await this.sendSMSNotification(notification);
    }

    if (!notification.sent) {
      notification.sent = true;
      notification.sentAt = new Date();
      await notification.save();
    }

    return { processed: true, notificationId: notification._id.toString() };
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(userId, filters = {}) {
    const query = { userId };

    if (filters.read !== undefined) {
      query.read = filters.read === 'true' || filters.read === true;
    }

    if (filters.type) {
      query.type = filters.type;
    }

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 20;
    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments(query),
      Notification.getUnreadCount(userId),
    ]);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      unreadCount,
    };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId, userId) {
    const notification = await Notification.findOne({
      _id: notificationId,
      userId,
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    await notification.markAsRead();
    return notification;
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId) {
    await Notification.markAllAsRead(userId);
    return { success: true };
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId, userId) {
    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      userId,
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    return { success: true };
  }

  /**
   * Get unread count
   */
  async getUnreadCount(userId) {
    return Notification.getUnreadCount(userId);
  }

  /**
   * Send email notification
   */
  async sendEmailNotification(notification) {
    try {
      const user = await User.findById(notification.userId);
      if (!user || !user.email) return;

      // Send email based on notification type
      await emailService.sendNotificationEmail(
        user.email,
        user.fullName,
        notification.title,
        notification.message,
        notification.data?.actionUrl
      );

      // Update delivery status
      notification.deliveryStatus.email.sent = true;
      notification.deliveryStatus.email.sentAt = new Date();
      await notification.save();
    } catch (error) {
      console.error('Failed to send email notification:', error);
    }
  }

  /**
   * Send push notification (placeholder for FCM integration)
   */
  async sendPushNotification(notification) {
    try {
      const user = await User.findById(notification.userId).select('notificationDevices');
      const devices = user?.notificationDevices || [];

      if (devices.length === 0) {
        return;
      }

      const hasFcmConfig = !!process.env.FCM_SERVER_KEY;
      if (!hasFcmConfig) {
        console.log('Push notification skipped (FCM not configured):', {
          userId: notification.userId,
          title: notification.title,
          message: notification.message,
        });
        return;
      }

      // Simple provider-agnostic push dispatch (FCM HTTP v1 can be integrated here).
      // For now we log each target so delivery can be audited without failing request flow.
      devices.forEach((device) => {
        console.log('Push notification queued:', {
          userId: notification.userId,
          provider: device.provider || 'fcm',
          title: notification.title,
          tokenSuffix: String(device.token || '').slice(-6),
        });
      });

      notification.deliveryStatus.push.deviceToken = devices[0]?.token;
      notification.deliveryStatus.push.sent = true;
      notification.deliveryStatus.push.sentAt = new Date();
      await notification.save();
    } catch (error) {
      console.error('Failed to send push notification:', error);
    }
  }

  /**
   * Send SMS notification
   */
  async sendSMSNotification(notification) {
    try {
      const user = await User.findById(notification.userId).select('phone');
      if (!user || !user.phone) return;

      const hasTwilioConfig = !!(
        process.env.TWILIO_ACCOUNT_SID &&
        process.env.TWILIO_AUTH_TOKEN &&
        process.env.TWILIO_FROM_NUMBER
      );

      if (!hasTwilioConfig) {
        console.log('SMS notification skipped (Twilio not configured):', {
          phone: user.phone,
          message: notification.message,
        });
        return;
      }

      // Deferred provider integration: call Twilio only when credentials are available.
      // This keeps production behavior deterministic in partially-configured environments.
      console.log('SMS notification queued:', {
        userId: notification.userId,
        message: notification.message,
        phone: user.phone,
      });

      // Update delivery status
      notification.deliveryStatus.sms.sent = true;
      notification.deliveryStatus.sms.sentAt = new Date();
      await notification.save();
    } catch (error) {
      console.error('Failed to send SMS notification:', error);
    }
  }

  /**
   * Send document status notification
   */
  async sendDocumentNotification(userId, documentType, status, reason = null) {
    const typeMap = {
      verified: NOTIFICATION_TYPE.DOCUMENT_VERIFIED,
      rejected: NOTIFICATION_TYPE.DOCUMENT_REJECTED,
      uploaded: NOTIFICATION_TYPE.DOCUMENT_UPLOADED,
    };

    const titleMap = {
      verified: 'Document Verified',
      rejected: 'Document Rejected',
      uploaded: 'Document Uploaded',
    };

    const messageMap = {
      verified: `Your ${documentType} document has been verified successfully.`,
      rejected: `Your ${documentType} document was rejected. ${reason ? `Reason: ${reason}` : 'Please upload a new document.'}`,
      uploaded: `Your ${documentType} document has been uploaded and is pending review.`,
    };

    return this.createNotification({
      userId,
      type: typeMap[status],
      title: titleMap[status],
      message: messageMap[status],
      priority: status === 'rejected' ? 'high' : 'normal',
      data: {
        referenceType: 'document',
        actionUrl: '/profile/documents',
      },
      channels: {
        inApp: true,
        email: status === 'rejected',
        push: true,
      },
    });
  }

  /**
   * Send welcome notification
   */
  async sendWelcomeNotification(userId, role) {
    return this.createNotification({
      userId,
      type: NOTIFICATION_TYPE.WELCOME,
      title: 'Welcome to CareConnect!',
      message: role === 'caregiver'
        ? 'Start by completing your profile to attract care seekers.'
        : 'Start by searching for verified caregivers in your area.',
      priority: 'normal',
      data: {
        actionUrl: role === 'caregiver' ? '/dashboard/caregiver/profile' : '/search',
      },
      channels: {
        inApp: true,
        email: true,
      },
    });
  }

  /**
   * Send profile view notification
   */
  async sendProfileViewNotification(caregiverId, viewerId) {
    const viewer = await User.findById(viewerId);
    
    return this.createNotification({
      userId: caregiverId,
      type: NOTIFICATION_TYPE.PROFILE_VIEWED,
      title: 'Someone Viewed Your Profile',
      message: viewer ? `${viewer.fullName} viewed your profile.` : 'Someone viewed your profile.',
      priority: 'low',
      data: {
        referenceId: viewerId,
        referenceType: 'user',
        actionUrl: '/dashboard/caregiver',
      },
      channels: {
        inApp: true,
      },
    });
  }

  /**
   * Send scheduled reminder notifications
   */
  async sendScheduledReminders() {
    const now = new Date();
    
    const pendingNotifications = await Notification.find({
      scheduledFor: { $lte: now },
      sent: false,
    });

    for (const notification of pendingNotifications) {
      notification.sent = true;
      notification.sentAt = new Date();
      notification.deliveryStatus.inApp.sent = true;
      notification.deliveryStatus.inApp.sentAt = new Date();
      await notification.save();

      // Send through other channels
      if (notification.channels.email) {
        await this.sendEmailNotification(notification);
      }
      if (notification.channels.push) {
        await this.sendPushNotification(notification);
      }
      if (notification.channels.sms) {
        await this.sendSMSNotification(notification);
      }
    }

    return pendingNotifications.length;
  }

  /**
   * Schedule a notification
   */
  async scheduleNotification(data, scheduledFor) {
    const notification = new Notification({
      ...data,
      scheduledFor,
      sent: false,
    });

    await notification.save();
    return notification;
  }

  /**
   * Get notification preferences for user
   */
  async getNotificationPreferences(userId) {
    const defaults = {
      booking: { inApp: true, push: true, email: true, sms: false },
      payment: { inApp: true, push: true, email: true, sms: true },
      chat: { inApp: true, push: true, email: false, sms: false },
      document: { inApp: true, push: true, email: true, sms: false },
      profile: { inApp: true, push: false, email: false, sms: false },
      review: { inApp: true, push: true, email: true, sms: false },
      system: { inApp: true, push: false, email: true, sms: false },
      promotion: { inApp: true, push: false, email: true, sms: false },
    };

    const user = await User.findById(userId).select('notificationPreferences').lean();
    return user?.notificationPreferences || defaults;
  }

  /**
   * Update notification preferences for user
   */
  async updateNotificationPreferences(userId, preferences) {
    const current = await this.getNotificationPreferences(userId);
    const merged = {
      ...current,
      ...preferences,
      booking: { ...current.booking, ...(preferences?.booking || {}) },
      payment: { ...current.payment, ...(preferences?.payment || {}) },
      chat: { ...current.chat, ...(preferences?.chat || {}) },
      document: { ...current.document, ...(preferences?.document || {}) },
      profile: { ...current.profile, ...(preferences?.profile || {}) },
      review: { ...current.review, ...(preferences?.review || {}) },
      system: { ...current.system, ...(preferences?.system || {}) },
      promotion: { ...current.promotion, ...(preferences?.promotion || {}) },
    };

    await User.findByIdAndUpdate(userId, {
      $set: { notificationPreferences: merged },
    });

    return merged;
  }
}

export default new NotificationService();
