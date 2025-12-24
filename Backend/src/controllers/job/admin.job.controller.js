// ============================================
// ADMIN JOB CONTROLLER
// Admin-only endpoints for job marketplace management
// ============================================

import jobService from '../../services/job.service.js';
import Job from '../../models/job.model.js';
import JobApplication from '../../models/jobApplication.model.js';
import CareRequest from '../../models/careRequest.model.js';
import { ApiResponse, asyncHandler, ApiError } from '../../utils/apiResponse.js';
import { USER_ROLES } from '../../constants/index.js';

// ============================================
// JOB MANAGEMENT
// ============================================

/**
 * Create new job
 * POST /api/admin/jobs
 */
export const createJob = asyncHandler(async (req, res) => {
  // Validate required fields first
  const { title, description, category, location, salary } = req.body;
  
  const errors = [];
  if (!title || title.length < 5) {
    errors.push('Title is required and must be at least 5 characters');
  }
  if (!description || description.length < 50) {
    errors.push('Description is required and must be at least 50 characters');
  }
  if (!category) {
    errors.push('Category is required');
  }
  if (!location?.city) {
    errors.push('Location city is required');
  }
  if (!salary?.min || salary.min <= 0) {
    errors.push('Minimum salary is required and must be greater than 0');
  }
  
  if (errors.length > 0) {
    throw ApiError.badRequest(`Validation failed: ${errors.join('; ')}`);
  }
  
  const job = await jobService.createJob(req.body, req.user._id);
  res.status(201).json(new ApiResponse(201, { job }, 'Job created successfully'));
});

/**
 * Get all jobs for admin (with all statuses)
 * GET /api/admin/jobs
 */
export const getJobs = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    status,
    category,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;

  const filters = {};
  if (status) filters.status = status;
  if (category) filters.category = category;

  const result = await jobService.getAdminJobs(filters, {
    page: Number(page),
    limit: Number(limit),
    sortBy,
    sortOrder,
  });

  res.status(200).json(new ApiResponse(200, result, 'Jobs retrieved'));
});

/**
 * Get single job with full details
 * GET /api/admin/jobs/:id
 */
export const getJob = asyncHandler(async (req, res) => {
  const job = await jobService.getJobById(req.params.id);
  res.status(200).json(new ApiResponse(200, { job }, 'Job retrieved'));
});

/**
 * Update job
 * PUT /api/admin/jobs/:id
 */
export const updateJob = asyncHandler(async (req, res) => {
  const job = await jobService.updateJob(req.params.id, req.body, req.user._id);
  res.status(200).json(new ApiResponse(200, { job }, 'Job updated successfully'));
});

/**
 * Delete job (soft delete)
 * DELETE /api/admin/jobs/:id
 */
export const deleteJob = asyncHandler(async (req, res) => {
  await jobService.deleteJob(req.params.id, req.user._id);
  res.status(200).json(new ApiResponse(200, null, 'Job deleted successfully'));
});

/**
 * Duplicate job
 * POST /api/admin/jobs/:id/duplicate
 */
export const duplicateJob = asyncHandler(async (req, res) => {
  const job = await jobService.duplicateJob(req.params.id, req.user._id);
  res.status(201).json(new ApiResponse(201, { job }, 'Job duplicated successfully'));
});

/**
 * Change job status
 * PATCH /api/admin/jobs/:id/status
 */
export const changeStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (!status) {
    throw ApiError.badRequest('Status is required');
  }

  const job = await jobService.changeJobStatus(req.params.id, status, req.user._id);
  res.status(200).json(new ApiResponse(200, { job }, 'Job status updated'));
});

/**
 * Extend deadline
 * PATCH /api/admin/jobs/:id/extend-deadline
 */
export const extendDeadline = asyncHandler(async (req, res) => {
  const { newDeadline } = req.body;

  if (!newDeadline) {
    throw ApiError.badRequest('New deadline is required');
  }

  const job = await jobService.extendDeadline(req.params.id, newDeadline, req.user._id);
  res.status(200).json(new ApiResponse(200, { job }, 'Deadline extended'));
});

/**
 * Increase vacancies
 * PATCH /api/admin/jobs/:id/vacancies
 */
export const increaseVacancies = asyncHandler(async (req, res) => {
  const { additionalVacancies } = req.body;

  if (!additionalVacancies || additionalVacancies < 1) {
    throw ApiError.badRequest('Additional vacancies must be at least 1');
  }

  const job = await jobService.increaseVacancies(
    req.params.id,
    Number(additionalVacancies),
    req.user._id
  );
  res.status(200).json(new ApiResponse(200, { job }, 'Vacancies increased'));
});

/**
 * Set monetization options
 * PATCH /api/admin/jobs/:id/monetization
 */
export const setMonetization = asyncHandler(async (req, res) => {
  const job = await jobService.setMonetization(req.params.id, req.body, req.user._id);
  res.status(200).json(new ApiResponse(200, { job }, 'Monetization updated'));
});

/**
 * Publish job
 * POST /api/admin/jobs/:id/publish
 */
export const publishJob = asyncHandler(async (req, res) => {
  const job = await jobService.changeJobStatus(req.params.id, 'active', req.user._id);

  // Broadcast to all online caregivers via socket
  try {
    const io = global.__careconnect_io;
    if (io) {
      io.emit('job:new', {
        jobId: job._id,
        title: job.title,
        location: job.location,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        currency: job.currency,
      });
    }
  } catch { /* non-critical */ }

  res.status(200).json(new ApiResponse(200, { job }, 'Job published'));
});

/**
 * Pause job
 * POST /api/admin/jobs/:id/pause
 */
export const pauseJob = asyncHandler(async (req, res) => {
  const job = await jobService.changeJobStatus(req.params.id, 'paused', req.user._id);
  res.status(200).json(new ApiResponse(200, { job }, 'Job paused'));
});

/**
 * Close job
 * POST /api/admin/jobs/:id/close
 */
export const closeJob = asyncHandler(async (req, res) => {
  const job = await jobService.changeJobStatus(req.params.id, 'closed', req.user._id);
  res.status(200).json(new ApiResponse(200, { job }, 'Job closed'));
});

// ============================================
// APPLICATION MANAGEMENT
// ============================================

/**
 * Get applications for a job
 * GET /api/admin/jobs/:id/applications
 */
export const getJobApplications = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, page = 1, limit = 20 } = req.query;

  const filters = { job: id, isActive: true };
  if (status) filters.status = status;

  const [applications, total] = await Promise.all([
    JobApplication.find(filters)
      .populate('applicant', 'fullName email phone profilePicture')
      .populate('caregiverProfile', 'skills experienceYears hourlyRate availability')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit)),
    JobApplication.countDocuments(filters),
  ]);

  res.status(200).json(
    new ApiResponse(200, {
      applications,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    }, 'Applications retrieved')
  );
});

/**
 * Get single application details
 * GET /api/admin/applications/:id
 */
export const getApplication = asyncHandler(async (req, res) => {
  const application = await JobApplication.findById(req.params.id)
    .populate('applicant', 'fullName email phone profilePicture dateOfBirth address')
    .populate('caregiverProfile')
    .populate('job', 'title category location salary');

  if (!application) {
    throw ApiError.notFound('Application not found');
  }

  // Record view
  await application.recordView();

  res.status(200).json(new ApiResponse(200, { application }, 'Application retrieved'));
});

/**
 * Update application status
 * PATCH /api/admin/applications/:id/status
 */
export const updateApplicationStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;

  const application = await JobApplication.findById(req.params.id);
  if (!application) {
    throw ApiError.notFound('Application not found');
  }

  await application.updateStatus(status, req.user._id, note);

  res.status(200).json(new ApiResponse(200, { application }, 'Application status updated'));
});

/**
 * Shortlist application
 * POST /api/admin/applications/:id/shortlist
 */
export const shortlistApplication = asyncHandler(async (req, res) => {
  const application = await JobApplication.findById(req.params.id);
  if (!application) {
    throw ApiError.notFound('Application not found');
  }

  await application.updateStatus('shortlisted', req.user._id, 'Shortlisted by admin');

  res.status(200).json(new ApiResponse(200, { application }, 'Applicant shortlisted'));
});

/**
 * Schedule interview
 * POST /api/admin/applications/:id/interview
 */
export const scheduleInterview = asyncHandler(async (req, res) => {
  const application = await JobApplication.findById(req.params.id);
  if (!application) {
    throw ApiError.notFound('Application not found');
  }

  await application.scheduleInterview(req.body, req.user._id);

  res.status(200).json(new ApiResponse(200, { application }, 'Interview scheduled'));
});

/**
 * Record interview feedback
 * POST /api/admin/applications/:id/interview-feedback
 */
export const recordInterviewFeedback = asyncHandler(async (req, res) => {
  const application = await JobApplication.findById(req.params.id);
  if (!application) {
    throw ApiError.notFound('Application not found');
  }

  // Find the latest interview
  const interview = application.interview;
  if (!interview || interview.status !== 'scheduled') {
    throw ApiError.badRequest('No scheduled interview found');
  }

  interview.feedback = req.body.feedback;
  interview.rating = req.body.rating;
  interview.status = 'completed';
  application.status = 'interviewed';

  await application.addToHistory('interviewed', req.user._id, 'Interview completed');
  await application.save();

  res.status(200).json(new ApiResponse(200, { application }, 'Interview feedback recorded'));
});

/**
 * Extend offer
 * POST /api/admin/applications/:id/offer
 */
export const extendOffer = asyncHandler(async (req, res) => {
  const application = await JobApplication.findById(req.params.id);
  if (!application) {
    throw ApiError.notFound('Application not found');
  }

  await application.extendOffer(req.body, req.user._id);

  res.status(200).json(new ApiResponse(200, { application }, 'Offer extended'));
});

/**
 * Hire applicant
 * POST /api/admin/applications/:id/hire
 */
export const hireApplicant = asyncHandler(async (req, res) => {
  const application = await JobApplication.findById(req.params.id);
  if (!application) {
    throw ApiError.notFound('Application not found');
  }

  await application.updateStatus('hired', req.user._id, 'Hired');

  // Update job vacancy count
  const job = await Job.findById(application.job);
  if (job) {
    job.vacancies.filled += 1;
    job.vacancies.remaining -= 1;
    job.analytics.hired += 1;

    if (job.vacancies.remaining <= 0) {
      job.status = 'filled';
    }
    await job.save();
  }

  res.status(200).json(new ApiResponse(200, { application }, 'Applicant hired'));
});

/**
 * Reject application
 * POST /api/admin/applications/:id/reject
 */
export const rejectApplication = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const application = await JobApplication.findById(req.params.id);
  if (!application) {
    throw ApiError.notFound('Application not found');
  }

  await application.updateStatus('rejected', req.user._id, reason);

  res.status(200).json(new ApiResponse(200, { application }, 'Application rejected'));
});

/**
 * Add note to application
 * POST /api/admin/applications/:id/notes
 */
export const addApplicationNote = asyncHandler(async (req, res) => {
  const { content, isPrivate = true } = req.body;

  const application = await JobApplication.findById(req.params.id);
  if (!application) {
    throw ApiError.notFound('Application not found');
  }

  await application.addNote(content, req.user._id, isPrivate);

  res.status(200).json(new ApiResponse(200, { application }, 'Note added'));
});

// ============================================
// CARE REQUEST MANAGEMENT
// ============================================

/**
 * Get care requests
 * GET /api/admin/care-requests
 */
export const getCareRequests = asyncHandler(async (req, res) => {
  const { status, urgency, page = 1, limit = 20 } = req.query;

  const query = { isActive: true };
  if (status) query.status = status;
  if (urgency) query.urgencyLevel = urgency;

  const [requests, total] = await Promise.all([
    CareRequest.find(query)
      .populate('requestedBy', 'fullName email phone profilePicture')
      .sort({ urgencyLevel: -1, priority: -1, createdAt: 1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit)),
    CareRequest.countDocuments(query),
  ]);

  res.status(200).json(
    new ApiResponse(200, {
      requests,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    }, 'Care requests retrieved')
  );
});

/**
 * Get single care request
 * GET /api/admin/care-requests/:id
 */
export const getCareRequest = asyncHandler(async (req, res) => {
  const request = await CareRequest.findById(req.params.id)
    .populate('requestedBy', 'fullName email phone profilePicture address')
    .populate('assignedCaregiver', 'fullName email phone profilePicture')
    .populate('convertedToJob', 'title status');

  if (!request) {
    throw ApiError.notFound('Care request not found');
  }

  res.status(200).json(new ApiResponse(200, { request }, 'Care request retrieved'));
});

/**
 * Approve care request
 * POST /api/admin/care-requests/:id/approve
 */
export const approveCareRequest = asyncHandler(async (req, res) => {
  const { notes } = req.body;

  const request = await CareRequest.findById(req.params.id);
  if (!request) {
    throw ApiError.notFound('Care request not found');
  }

  await request.approve(req.user._id, notes);

  res.status(200).json(new ApiResponse(200, { request }, 'Care request approved'));
});

/**
 * Reject care request
 * POST /api/admin/care-requests/:id/reject
 */
export const rejectCareRequest = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  if (!reason) {
    throw ApiError.badRequest('Rejection reason is required');
  }

  const request = await CareRequest.findById(req.params.id);
  if (!request) {
    throw ApiError.notFound('Care request not found');
  }

  await request.reject(req.user._id, reason);

  res.status(200).json(new ApiResponse(200, { request }, 'Care request rejected'));
});

/**
 * Convert care request to job
 * POST /api/admin/care-requests/:id/convert-to-job
 */
export const convertToJob = asyncHandler(async (req, res) => {
  const result = await jobService.convertCareRequestToJob(
    req.params.id,
    req.body,
    req.user._id
  );

  res.status(201).json(new ApiResponse(201, result, 'Care request converted to job'));
});

/**
 * Assign caregiver directly
 * POST /api/admin/care-requests/:id/assign
 */
export const assignCaregiver = asyncHandler(async (req, res) => {
  const { caregiverId, notes } = req.body;

  if (!caregiverId) {
    throw ApiError.badRequest('Caregiver ID is required');
  }

  const request = await CareRequest.findById(req.params.id);
  if (!request) {
    throw ApiError.notFound('Care request not found');
  }

  await request.assignCaregiver(caregiverId, req.user._id, notes);

  res.status(200).json(new ApiResponse(200, { request }, 'Caregiver assigned'));
});

/**
 * Add note to care request
 * POST /api/admin/care-requests/:id/notes
 */
export const addCareRequestNote = asyncHandler(async (req, res) => {
  const { content } = req.body;

  const request = await CareRequest.findById(req.params.id);
  if (!request) {
    throw ApiError.notFound('Care request not found');
  }

  await request.addNote(content, req.user._id);

  res.status(200).json(new ApiResponse(200, { request }, 'Note added'));
});

// ============================================
// ANALYTICS & DASHBOARD
// ============================================

/**
 * Get job marketplace dashboard stats
 * GET /api/admin/jobs/dashboard
 */
export const getDashboardStats = asyncHandler(async (req, res) => {
  const stats = await jobService.getAdminDashboardStats();
  res.status(200).json(new ApiResponse(200, stats, 'Dashboard stats retrieved'));
});

/**
 * Get job analytics
 * GET /api/admin/jobs/:id/analytics
 */
export const getJobAnalytics = asyncHandler(async (req, res) => {
  const analytics = await jobService.getJobAnalytics(req.params.id);
  res.status(200).json(new ApiResponse(200, analytics, 'Job analytics retrieved'));
});

/**
 * Get application analytics
 * GET /api/admin/analytics/applications
 */
export const getApplicationAnalytics = asyncHandler(async (req, res) => {
  const { startDate, endDate, groupBy = 'day' } = req.query;

  const stats = await jobService.getApplicationAnalytics({
    startDate,
    endDate,
    groupBy,
  });

  res.status(200).json(new ApiResponse(200, { stats }, 'Application analytics retrieved'));
});

/**
 * Get care request stats
 * GET /api/admin/care-requests/stats
 */
export const getCareRequestStats = asyncHandler(async (req, res) => {
  const stats = await CareRequest.getStats();
  res.status(200).json(new ApiResponse(200, stats, 'Care request stats retrieved'));
});

/**
 * Get hiring funnel analytics
 * GET /api/admin/analytics/hiring-funnel
 */
export const getHiringFunnel = asyncHandler(async (req, res) => {
  const { jobId, startDate, endDate } = req.query;

  const match = { isActive: true };
  if (jobId) match.job = jobId;
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) match.createdAt.$lte = new Date(endDate);
  }

  const funnel = await JobApplication.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        underReview: { $sum: { $cond: [{ $eq: ['$status', 'under_review'] }, 1, 0] } },
        shortlisted: { $sum: { $cond: [{ $eq: ['$status', 'shortlisted'] }, 1, 0] } },
        interviewed: { $sum: { $cond: [{ $eq: ['$status', 'interviewed'] }, 1, 0] } },
        offerExtended: { $sum: { $cond: [{ $eq: ['$status', 'offer_extended'] }, 1, 0] } },
        hired: { $sum: { $cond: [{ $eq: ['$status', 'hired'] }, 1, 0] } },
        rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
        withdrawn: { $sum: { $cond: [{ $eq: ['$status', 'withdrawn'] }, 1, 0] } },
      },
    },
  ]);

  const stats = funnel[0] || {
    total: 0,
    pending: 0,
    underReview: 0,
    shortlisted: 0,
    interviewed: 0,
    offerExtended: 0,
    hired: 0,
    rejected: 0,
    withdrawn: 0,
  };

  // Calculate conversion rates
  if (stats.total > 0) {
    stats.conversionRates = {
      applicationToReview: ((stats.underReview + stats.shortlisted + stats.interviewed + stats.offerExtended + stats.hired) / stats.total * 100).toFixed(1),
      reviewToShortlist: stats.underReview > 0 ? ((stats.shortlisted + stats.interviewed + stats.offerExtended + stats.hired) / stats.underReview * 100).toFixed(1) : 0,
      shortlistToInterview: stats.shortlisted > 0 ? ((stats.interviewed + stats.offerExtended + stats.hired) / stats.shortlisted * 100).toFixed(1) : 0,
      interviewToOffer: stats.interviewed > 0 ? ((stats.offerExtended + stats.hired) / stats.interviewed * 100).toFixed(1) : 0,
      offerToHire: stats.offerExtended > 0 ? (stats.hired / stats.offerExtended * 100).toFixed(1) : 0,
    };
  }

  res.status(200).json(new ApiResponse(200, { funnel: stats }, 'Hiring funnel retrieved'));
});
