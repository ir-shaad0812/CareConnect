// ============================================
// NOTIFICATION CONTROLLER
// Handles all notification-related HTTP requests
// ============================================

import notificationService from '../../services/notification.service.js';
import { ApiResponse, asyncHandler } from '../../utils/apiResponse.js';

/**
 * Get user notifications
 * GET /api/notifications
 */
export const getNotifications = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const result = await notificationService.getUserNotifications(userId, req.query);

  res.status(200).json(
    new ApiResponse(200, result, 'Notifications fetched successfully')
  );
});

/**
 * Get unread notification count
 * GET /api/notifications/unread-count
 */
export const getUnreadCount = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const count = await notificationService.getUnreadCount(userId);

  res.status(200).json(
    new ApiResponse(200, { count, unreadCount: count }, 'Unread count fetched')
  );
});

/**
 * Mark notification as read
 * PATCH /api/notifications/:notificationId/read
 */
export const markAsRead = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;
  const userId = req.user._id;

  const notification = await notificationService.markAsRead(notificationId, userId);

  res.status(200).json(
    new ApiResponse(200, { notification }, 'Notification marked as read')
  );
});

/**
 * Mark all notifications as read
 * PATCH /api/notifications/read-all
 */
export const markAllAsRead = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  await notificationService.markAllAsRead(userId);

  res.status(200).json(
    new ApiResponse(200, null, 'All notifications marked as read')
  );
});

/**
 * Delete a notification
 * DELETE /api/notifications/:notificationId
 */
export const deleteNotification = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;
  const userId = req.user._id;

  await notificationService.deleteNotification(notificationId, userId);

  res.status(200).json(
    new ApiResponse(200, null, 'Notification deleted')
  );
});

/**
 * Get notification preferences
 * GET /api/notifications/preferences
 */
export const getPreferences = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const preferences = await notificationService.getNotificationPreferences(userId);

  res.status(200).json(
    new ApiResponse(200, { preferences }, 'Preferences fetched')
  );
});

/**
 * Update notification preferences
 * PUT /api/notifications/preferences
 */
export const updatePreferences = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const preferences = await notificationService.updateNotificationPreferences(
    userId,
    req.body
  );

  res.status(200).json(
    new ApiResponse(200, { preferences }, 'Preferences updated')
  );
});
