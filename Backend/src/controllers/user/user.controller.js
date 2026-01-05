import userService from '../../services/user.service.js';
import { ApiResponse, ApiError, asyncHandler } from '../../utils/apiResponse.js';
import { emitProfileCompletion } from '../../config/socket.js';

/**
 * Get public list of caregivers
 * GET /api/users/caregivers
 */
export const getPublicCaregivers = asyncHandler(async (req, res) => {
  const result = await userService.getPublicCaregivers(req.query);

  res.status(200).json(
    new ApiResponse(200, result, req.t('user', 'profileFetched'))
  );
});

/**
 * Get public caregiver market context (location/rates/registered counts)
 * GET /api/users/caregivers/market-context
 */
export const getCaregiverMarketContext = asyncHandler(async (req, res) => {
  const marketContext = await userService.getCaregiverMarketContext(req.query);

  res.status(200).json(
    new ApiResponse(200, { marketContext }, 'Caregiver market context fetched')
  );
});

/**
 * Get public caregiver profile with view tracking
 * GET /api/users/caregivers/:userId
 */
export const getPublicCaregiverProfile = asyncHandler(async (req, res) => {
  const viewerId = req.user?._id || null;
  const caregiver = await userService.getPublicCaregiverProfileWithTracking(
    req.params.userId,
    viewerId
  );

  res.status(200).json(
    new ApiResponse(200, { caregiver }, req.t('user', 'profileFetched'))
  );
});

/**
 * Get current user profile
 * GET /api/users/profile
 */
export const getProfile = asyncHandler(async (req, res) => {
  const result = await userService.getUserWithDocuments(req.user._id);

  res.status(200).json(
    new ApiResponse(200, result, req.t('user', 'profileFetched'))
  );
});

/**
 * Update user profile
 * PATCH /api/users/profile
 */
export const updateProfile = asyncHandler(async (req, res) => {
  const user = await userService.updateProfile(req.user._id, req.body);

  // Real-time profile completion broadcast
  const io = req.app.get('io');
  if (io && user.completionPercentage !== undefined) {
    emitProfileCompletion(io, req.user._id, user.completionPercentage);
  }

  res.status(200).json(
    new ApiResponse(200, { user }, req.t('user', 'profileUpdated'))
  );
});

/**
 * Upload/Update avatar
 * POST /api/users/avatar
 */
export const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw ApiError.badRequest('Avatar image file is required');
  }

  const user = await userService.updateAvatar(req.user._id, req.file);

  res.status(200).json(
    new ApiResponse(200, { user }, req.t('user', 'avatarUpdated'))
  );
});

/**
 * Remove avatar
 * DELETE /api/users/avatar
 */
export const removeAvatar = asyncHandler(async (req, res) => {
  const user = await userService.removeAvatar(req.user._id);

  res.status(200).json(
    new ApiResponse(200, { user }, 'Profile photo removed successfully')
  );
});

/**
 * Complete profile (for OAuth users)
 * POST /api/users/complete-profile
 */
export const completeProfile = asyncHandler(async (req, res) => {
  const user = await userService.completeProfile(req.user._id, req.body);

  res.status(200).json(
    new ApiResponse(200, { user }, req.t('user', 'profileUpdated'))
  );
});

/**
 * Delete user account
 * DELETE /api/users/account
 */
export const deleteAccount = asyncHandler(async (req, res) => {
  const result = await userService.deleteAccount(req.user._id);

  res.status(200).json(new ApiResponse(200, null, req.t('common', 'success')));
});

/**
 * Get caregiver dashboard stats
 * GET /api/users/caregiver/dashboard
 */
export const getCaregiverDashboard = asyncHandler(async (req, res) => {
  const stats = await userService.getCaregiverDashboardStats(req.user._id);

  res.status(200).json(
    new ApiResponse(200, { stats }, 'Dashboard stats fetched successfully')
  );
});

/**
 * Update caregiver availability calendar
 * PUT /api/users/caregiver/availability
 */
export const updateAvailability = asyncHandler(async (req, res) => {
  const user = await userService.updateAvailabilityCalendar(req.user._id, req.body);

  res.status(200).json(
    new ApiResponse(200, { user }, 'Availability updated successfully')
  );
});

/**
 * Update caregiver rates
 * PUT /api/users/caregiver/rates
 */
export const updateRates = asyncHandler(async (req, res) => {
  const user = await userService.updateCaregiverRates(req.user._id, req.body);

  res.status(200).json(
    new ApiResponse(200, { user }, 'Rates updated successfully')
  );
});

/**
 * Get all users (Admin)
 * GET /api/users
 */
export const getAllUsers = asyncHandler(async (req, res) => {
  const result = await userService.getAllUsers(req.query);

  res.status(200).json(
    new ApiResponse(200, result, req.t('admin', 'usersFetched'))
  );
});

/**
 * Get caregivers for admin
 * GET /api/users/admin/caregivers
 */
export const getCaregiversForAdmin = asyncHandler(async (req, res) => {
  const result = await userService.getCaregiversForAdmin(req.query);

  res.status(200).json(
    new ApiResponse(200, result, 'Caregivers fetched successfully')
  );
});

/**
 * Get user by ID (Admin)
 * GET /api/users/:userId
 */
export const getUserById = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.params.userId);

  res.status(200).json(
    new ApiResponse(200, { user }, req.t('user', 'profileFetched'))
  );
});

/**
 * Update user status (Admin)
 * PATCH /api/users/:userId/status
 */
export const updateUserStatus = asyncHandler(async (req, res) => {
  const user = await userService.updateUserStatus(
    req.params.userId,
    req.body.status
  );

  res.status(200).json(
    new ApiResponse(200, { user }, req.t('admin', 'userUpdated'))
  );
});

/**
 * Update background check status (Admin)
 * PATCH /api/users/:userId/background-check
 */
export const updateBackgroundCheck = asyncHandler(async (req, res) => {
  const user = await userService.updateBackgroundCheckStatus(
    req.params.userId,
    req.body
  );

  res.status(200).json(
    new ApiResponse(200, { user }, 'Background check status updated')
  );
});

/**
 * Toggle featured status (Admin)
 * PATCH /api/users/:userId/featured
 */
export const toggleFeatured = asyncHandler(async (req, res) => {
  const user = await userService.toggleFeaturedStatus(
    req.params.userId,
    req.body.featured
  );

  res.status(200).json(
    new ApiResponse(200, { user }, 'Featured status updated')
  );
});
