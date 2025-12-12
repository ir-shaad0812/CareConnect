// ============================================
// ADMIN USER ACTIVITY CONTROLLER
// Endpoints for admin activity tracking dashboard
// ============================================

import { asyncHandler, ApiResponse } from '../../utils/apiResponse.js';
import userActivityService from '../../services/userActivity.service.js';

/**
 * Get activity timeline with pagination and filters
 * GET /api/admin/activities/timeline
 */
export const getActivityTimeline = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 50,
    category,
    action,
    userRole,
    userId,
    startDate,
    endDate,
    search,
  } = req.query;

  const result = await userActivityService.getActivityTimeline({
    page: parseInt(page),
    limit: parseInt(limit),
    category,
    action,
    userRole,
    userId,
    startDate,
    endDate,
    search,
  });

  res.status(200).json(new ApiResponse(200, result, 'Activity timeline fetched'));
});

/**
 * Get activity statistics by category
 * GET /api/admin/activities/stats
 */
export const getActivityStats = asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;
  const stats = await userActivityService.getCategoryStats(parseInt(days));
  res.status(200).json(new ApiResponse(200, stats, 'Activity stats fetched'));
});

/**
 * Get login analytics
 * GET /api/admin/activities/logins
 */
export const getLoginAnalytics = asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;
  const analytics = await userActivityService.getLoginAnalytics(parseInt(days));
  res.status(200).json(new ApiResponse(200, analytics, 'Login analytics fetched'));
});

/**
 * Get user engagement metrics
 * GET /api/admin/activities/engagement
 */
export const getUserEngagement = asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;
  const engagement = await userActivityService.getUserEngagement(parseInt(days));
  res.status(200).json(new ApiResponse(200, engagement, 'User engagement fetched'));
});

/**
 * Get platform activity stats
 * GET /api/admin/activities/platform
 */
export const getPlatformStats = asyncHandler(async (req, res) => {
  const { days = 7 } = req.query;
  const stats = await userActivityService.getPlatformStats(parseInt(days));
  res.status(200).json(new ApiResponse(200, stats, 'Platform stats fetched'));
});

/**
 * Get activity summary for a specific user
 * GET /api/admin/activities/user/:userId
 */
export const getUserActivitySummary = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { days = 30 } = req.query;
  const summary = await userActivityService.getUserActivitySummary(userId, parseInt(days));
  res.status(200).json(new ApiResponse(200, summary, 'User activity summary fetched'));
});
