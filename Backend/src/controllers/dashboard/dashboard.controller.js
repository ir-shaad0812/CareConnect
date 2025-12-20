// ============================================
// DASHBOARD CONTROLLER
// Real-time analytics endpoints for dashboards
// ============================================

import dashboardService from '../../services/dashboard.service.js';
import { ApiResponse, asyncHandler, ApiError } from '../../utils/apiResponse.js';
import { USER_ROLES } from '../../constants/index.js';

/**
 * Get caregiver earnings chart data
 * GET /api/dashboard/caregiver/earnings
 */
export const getCaregiverEarnings = asyncHandler(async (req, res) => {
  const data = await dashboardService.getCaregiverEarnings(req.user._id);
  res.status(200).json(new ApiResponse(200, { earnings: data }, 'Earnings fetched'));
});

/**
 * Get caregiver bookings by type
 * GET /api/dashboard/caregiver/bookings-by-type
 */
export const getCaregiverBookingsByType = asyncHandler(async (req, res) => {
  const data = await dashboardService.getCaregiverBookingsByType(req.user._id);
  res.status(200).json(new ApiResponse(200, { distribution: data }, 'Distribution fetched'));
});

/**
 * Get caregiver weekly activity
 * GET /api/dashboard/caregiver/weekly-activity
 */
export const getCaregiverWeeklyActivity = asyncHandler(async (req, res) => {
  const data = await dashboardService.getCaregiverWeeklyActivity(req.user._id);
  res.status(200).json(new ApiResponse(200, { activity: data }, 'Weekly activity fetched'));
});

/**
 * Get caregiver recent activity (notifications)
 * GET /api/dashboard/caregiver/recent-activity
 */
export const getCaregiverRecentActivity = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const data = await dashboardService.getCaregiverRecentActivity(req.user._id, limit);
  res.status(200).json(new ApiResponse(200, { activities: data }, 'Activities fetched'));
});

/**
 * Get caregiver conversations
 * GET /api/dashboard/caregiver/conversations
 */
export const getCaregiverConversations = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 5;
  const data = await dashboardService.getCaregiverConversations(req.user._id, limit);
  res.status(200).json(new ApiResponse(200, { conversations: data }, 'Conversations fetched'));
});

/**
 * Get available jobs for caregiver
 * GET /api/dashboard/caregiver/available-jobs
 */
export const getCaregiverAvailableJobs = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 5;
  const data = await dashboardService.getCaregiverAvailableJobs(req.user._id, limit);
  res.status(200).json(new ApiResponse(200, { jobs: data }, 'Jobs fetched'));
});

/**
 * Get caregiver full stats
 * GET /api/dashboard/caregiver/stats
 */
export const getCaregiverFullStats = asyncHandler(async (req, res) => {
  const data = await dashboardService.getCaregiverFullStats(req.user._id);
  res.status(200).json(new ApiResponse(200, { stats: data }, 'Stats fetched'));
});

/**
 * Get careseeker spending chart
 * GET /api/dashboard/careseeker/spending
 */
export const getCareseekerSpending = asyncHandler(async (req, res) => {
  const data = await dashboardService.getCareseekerSpending(req.user._id);
  res.status(200).json(new ApiResponse(200, { spending: data }, 'Spending fetched'));
});

/**
 * Get careseeker service distribution
 * GET /api/dashboard/careseeker/service-distribution
 */
export const getCareseekerServiceDistribution = asyncHandler(async (req, res) => {
  const data = await dashboardService.getCareseekerServiceDistribution(req.user._id);
  res.status(200).json(new ApiResponse(200, { distribution: data }, 'Distribution fetched'));
});

/**
 * Get careseeker recent activity
 * GET /api/dashboard/careseeker/recent-activity
 */
export const getCareseekerRecentActivity = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const data = await dashboardService.getCareseekerRecentActivity(req.user._id, limit);
  res.status(200).json(new ApiResponse(200, { activities: data }, 'Activities fetched'));
});

/**
 * Get careseeker stats
 * GET /api/dashboard/careseeker/stats
 */
export const getCareseekerStats = asyncHandler(async (req, res) => {
  const data = await dashboardService.getCareseekerStats(req.user._id);
  res.status(200).json(new ApiResponse(200, { stats: data }, 'Stats fetched'));
});
