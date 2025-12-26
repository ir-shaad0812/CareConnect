// ============================================
// JOB CONTROLLER
// Public and caregiver-facing endpoints for job marketplace
// ============================================

import jobService from '../../services/job.service.js';
import { ApiResponse, asyncHandler, ApiError } from '../../utils/apiResponse.js';
import { USER_ROLES } from '../../constants/index.js';

// ============================================
// PUBLIC ENDPOINTS (CAREGIVER ACCESS)
// ============================================

/**
 * List active jobs with filters
 * GET /api/jobs
 */
export const listJobs = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    category,
    careType,
    city,
    urgencyLevel,
    minSalary,
    maxSalary,
    sortBy = 'publishedAt',
    sortOrder = 'desc',
  } = req.query;

  const filters = {};
  if (category) filters.category = category;
  if (careType) filters.careType = careType;
  if (city) filters.city = city;
  if (urgencyLevel) filters.urgencyLevel = urgencyLevel;
  if (minSalary) filters.minSalary = minSalary;
  if (maxSalary) filters.maxSalary = maxSalary;

  const result = await jobService.listJobs(filters, {
    page: Number(page),
    limit: Number(limit),
    sortBy,
    sortOrder,
  });

  res.status(200).json(new ApiResponse(200, result, 'Jobs retrieved successfully'));
});

/**
 * Search jobs
 * GET /api/jobs/search
 */
export const searchJobs = asyncHandler(async (req, res) => {
  const { q, page = 1, limit = 20, ...filters } = req.query;

  if (!q) {
    throw ApiError.badRequest('Search query is required');
  }

  const result = await jobService.searchJobs(q, filters, {
    page: Number(page),
    limit: Number(limit),
  });

  res.status(200).json(new ApiResponse(200, result, 'Search results retrieved'));
});

/**
 * Get featured jobs
 * GET /api/jobs/featured
 */
export const getFeaturedJobs = asyncHandler(async (req, res) => {
  const { limit = 6 } = req.query;
  const jobs = await jobService.getFeaturedJobs(Number(limit));
  res.status(200).json(new ApiResponse(200, { jobs }, 'Featured jobs retrieved'));
});

/**
 * Get single job by ID
 * GET /api/jobs/:id
 */
export const getJob = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const job = await jobService.getJobById(id, {
    incrementView: true,
    viewerUserId: req.user?._id,
  });
  res.status(200).json(new ApiResponse(200, { job }, 'Job retrieved successfully'));
});

/**
 * Get nearby jobs
 * GET /api/jobs/nearby
 */
export const getNearbyJobs = asyncHandler(async (req, res) => {
  const { lat, lng, distance = 50, page = 1, limit = 20 } = req.query;

  if (!lat || !lng) {
    throw ApiError.badRequest('Latitude and longitude are required');
  }

  const jobs = await jobService.getNearbyJobs(
    [Number(lng), Number(lat)],
    Number(distance),
    { page: Number(page), limit: Number(limit) }
  );

  res.status(200).json(new ApiResponse(200, { jobs }, 'Nearby jobs retrieved'));
});

/**
 * Save job for later
 * POST /api/jobs/:id/save
 */
export const saveJob = asyncHandler(async (req, res) => {
  // Only caregivers can save jobs
  if (req.user.role !== USER_ROLES.CAREGIVER) {
    throw ApiError.forbidden('Only caregivers can save jobs');
  }

  const { id } = req.params;
  const result = await jobService.saveJob(id, req.user._id);
  res.status(200).json(new ApiResponse(200, result, 'Job saved successfully'));
});

/**
 * Get saved jobs
 * GET /api/jobs/saved
 */
export const getSavedJobs = asyncHandler(async (req, res) => {
  if (req.user.role !== USER_ROLES.CAREGIVER) {
    throw ApiError.forbidden('Only caregivers can access saved jobs');
  }

  const { page = 1, limit = 20 } = req.query;
  const result = await jobService.getSavedJobs(req.user._id, {
    page: Number(page),
    limit: Number(limit),
  });

  res.status(200).json(new ApiResponse(200, result, 'Saved jobs retrieved'));
});

/**
 * Unsave job
 * DELETE /api/jobs/:id/save
 */
export const unsaveJob = asyncHandler(async (req, res) => {
  if (req.user.role !== USER_ROLES.CAREGIVER) {
    throw ApiError.forbidden('Only caregivers can manage saved jobs');
  }

  const { id } = req.params;
  await jobService.unsaveJob(id, req.user._id);
  res.status(200).json(new ApiResponse(200, null, 'Job removed from saved'));
});

// ============================================
// CAREGIVER APPLICATION ENDPOINTS
// ============================================

/**
 * Apply to job
 * POST /api/jobs/:id/apply
 */
export const applyToJob = asyncHandler(async (req, res) => {
  if (req.user.role !== USER_ROLES.CAREGIVER) {
    throw ApiError.forbidden('Only caregivers can apply to jobs');
  }

  const { id } = req.params;
  const application = await jobService.applyToJob(id, req.user._id, req.body);

  res.status(201).json(
    new ApiResponse(201, { application }, 'Application submitted successfully')
  );
});

/**
 * Get my applications
 * GET /api/jobs/my-applications
 */
export const getMyApplications = asyncHandler(async (req, res) => {
  if (req.user.role !== USER_ROLES.CAREGIVER) {
    throw ApiError.forbidden('Only caregivers can view applications');
  }

  const { status, page = 1, limit = 20 } = req.query;

  const filters = {};
  if (status) filters.status = status;

  const result = await jobService.getCaregiverApplications(
    req.user._id,
    filters,
    { page: Number(page), limit: Number(limit) }
  );

  res.status(200).json(new ApiResponse(200, result, 'Applications retrieved'));
});

/**
 * Get single application details
 * GET /api/jobs/applications/:applicationId
 */
export const getApplication = asyncHandler(async (req, res) => {
  const { applicationId } = req.params;
  const application = await jobService.getApplicationById(applicationId, req.user._id);

  res.status(200).json(new ApiResponse(200, { application }, 'Application retrieved'));
});

/**
 * Withdraw application
 * POST /api/jobs/applications/:applicationId/withdraw
 */
export const withdrawApplication = asyncHandler(async (req, res) => {
  if (req.user.role !== USER_ROLES.CAREGIVER) {
    throw ApiError.forbidden('Only caregivers can withdraw applications');
  }

  const { applicationId } = req.params;
  const { reason } = req.body;

  const application = await jobService.withdrawApplication(
    applicationId,
    req.user._id,
    reason
  );

  res.status(200).json(new ApiResponse(200, { application }, 'Application withdrawn'));
});

/**
 * Accept offer
 * POST /api/jobs/applications/:applicationId/accept-offer
 */
export const acceptOffer = asyncHandler(async (req, res) => {
  if (req.user.role !== USER_ROLES.CAREGIVER) {
    throw ApiError.forbidden('Only caregivers can accept offers');
  }

  const { applicationId } = req.params;
  const application = await jobService.acceptOffer(applicationId, req.user._id);

  res.status(200).json(new ApiResponse(200, { application }, 'Offer accepted'));
});

/**
 * Decline offer
 * POST /api/jobs/applications/:applicationId/decline-offer
 */
export const declineOffer = asyncHandler(async (req, res) => {
  if (req.user.role !== USER_ROLES.CAREGIVER) {
    throw ApiError.forbidden('Only caregivers can decline offers');
  }

  const { applicationId } = req.params;
  const { reason } = req.body;
  const application = await jobService.declineOffer(applicationId, req.user._id, reason);

  res.status(200).json(new ApiResponse(200, { application }, 'Offer declined'));
});
