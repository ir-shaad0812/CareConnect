// ============================================
// NOTIFICATION ROUTES
// Routes for notification management
// ============================================

import { Router } from 'express';
import * as notificationController from '../controllers/notification/notification.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// All notification routes require authentication
router.use(authenticate);

// Get user notifications
router.get('/', notificationController.getNotifications);

// Get unread count
router.get('/unread-count', notificationController.getUnreadCount);

// Get notification preferences
router.get('/preferences', notificationController.getPreferences);

// Update notification preferences
router.put('/preferences', notificationController.updatePreferences);

// Mark all as read
router.patch('/read-all', notificationController.markAllAsRead);

// Mark single notification as read
router.patch('/:notificationId/read', notificationController.markAsRead);

// Delete notification
router.delete('/:notificationId', notificationController.deleteNotification);

export default router;
