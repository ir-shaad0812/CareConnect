// ============================================
// JOB SERVICE
// Business logic for job marketplace operations
// ============================================

import Job from '../models/job.model.js';
import JobApplication from '../models/jobApplication.model.js';
import CareRequest from '../models/careRequest.model.js';
import User from '../models/user.model.js';
import mongoose from 'mongoose';

class JobService {
  // ============================================
  // JOB CRUD OPERATIONS
  // ============================================

  /**
   * Create a new job listing
   */
  async createJob(jobData, userId) {
    const job = new Job({
      ...jobData,
      postedBy: userId,
      lastModifiedBy: userId,
    });
    await job.save();
    return job;
  }

  /**
   * Get job by ID with population
   */
  async getJobById(jobId, options = {}) {
    const { incrementView = false, viewerUserId = null } = options;

    const job = await Job.findOne({
      _id: jobId,
      isDeleted: false,
    })
      .populate("postedBy", "fullName email profilePicture")
      .populate("familyId", "fullName email")
      .populate("assignedCaregiver", "fullName email profilePicture");

    if (!job) {
      throw new Error("Job not found");
    }

    if (incrementView) {
      // Check if unique view (simplified - could use Redis for production)
      job.analytics.views += 1;
      await job.save();
    }

    return job;
  }

  /**
   * Update job
   */
  async updateJob(jobId, updates, userId) {
    const job = await Job.findOneAndUpdate(
      { _id: jobId, isDeleted: false },
      {
        ...updates,
        lastModifiedBy: userId,
      },
      { new: true, runValidators: true }
    );

    if (!job) {
      throw new Error("Job not found");
    }

    return job;
  }

  /**
   * Delete job (soft delete)
   */
  async deleteJob(jobId, userId) {
    const job = await Job.findById(jobId);
    if (!job) {
      throw new Error("Job not found");
    }
    return job.softDelete(userId);
  }

  /**
   * Duplicate job
   */
  async duplicateJob(jobId, userId) {
    const job = await Job.findById(jobId);
    if (!job) {
      throw new Error("Job not found");
    }
    return job.duplicate(userId);
  }

  // ============================================
  // JOB LISTING & SEARCH
  // ============================================

  /**
   * List jobs with filters (for caregivers)
   */
  async listJobs(filters = {}, options = {}) {
    const {
      page = 1,
      limit = 20,
      sortBy = "publishedAt",
      sortOrder = "desc",
    } = options;

    const query = {
      status: "active",
      isActive: true,
      isDeleted: false,
    };

    // Apply filters
    if (filters.category) {
      query.category = filters.category;
    }
    if (filters.careType) {
      query.careType = filters.careType;
    }
    if (filters.city) {
      query["location.city"] = new RegExp(filters.city, "i");
    }
    if (filters.urgencyLevel) {
      query.urgencyLevel = filters.urgencyLevel;
    }
    if (filters.minSalary) {
      query["salary.min"] = { $gte: Number(filters.minSalary) };
    }
    if (filters.maxSalary) {
      query["salary.max"] = { $lte: Number(filters.maxSalary) };
    }

    const skip = (page - 1) * limit;
    const sort = { 
      "monetization.isFeatured": -1,
      "monetization.isBoosted": -1,
      [sortBy]: sortOrder === "desc" ? -1 : 1 
    };

    const [jobs, total] = await Promise.all([
      Job.find(query)
        .populate("postedBy", "fullName profilePicture")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Job.countDocuments(query),
    ]);

    return {
      jobs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    };
  }

  /**
   * Search jobs with text search
   */
  async searchJobs(searchQuery, filters = {}, options = {}) {
    const { page = 1, limit = 20 } = options;

    const query = {
      $text: { $search: searchQuery },
      status: "active",
      isActive: true,
      isDeleted: false,
      ...filters,
    };

    const skip = (page - 1) * limit;

    const [jobs, total] = await Promise.all([
      Job.find(query)
        .select({ score: { $meta: "textScore" } })
        .sort({ score: { $meta: "textScore" } })
        .skip(skip)
        .limit(limit)
        .lean(),
      Job.countDocuments(query),
    ]);

    return {
      jobs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get jobs near location
   */
  async getNearbyJobs(coordinates, maxDistanceKm = 50, options = {}) {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const jobs = await Job.find({
      "location.coordinates": {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: coordinates,
          },
          $maxDistance: maxDistanceKm * 1000,
        },
      },
      status: "active",
      isActive: true,
      isDeleted: false,
    })
      .skip(skip)
      .limit(limit);

    return jobs;
  }

  /**
   * Get featured jobs
   */
  async getFeaturedJobs(limit = 6) {
    return Job.find({
      status: "active",
      isActive: true,
      isDeleted: false,
      "monetization.isFeatured": true,
      "monetization.featuredUntil": { $gte: new Date() },
    })
      .sort({ publishedAt: -1 })
      .limit(limit);
  }

  // ============================================
  // ADMIN OPERATIONS
  // ============================================

  /**
   * Get all jobs for admin (with all statuses)
   */
  async getAdminJobs(filters = {}, options = {}) {
    const {
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = options;

    const query = { isDeleted: false };

    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.category) {
      query.category = filters.category;
    }
    if (filters.postedBy) {
      query.postedBy = filters.postedBy;
    }

    const skip = (page - 1) * limit;

    const [jobs, total] = await Promise.all([
      Job.find(query)
        .populate("postedBy", "fullName email")
        .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Job.countDocuments(query),
    ]);

    return {
      jobs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Change job status
   */
  async changeJobStatus(jobId, newStatus, userId) {
    const validTransitions = {
      draft: ["pending_review", "active", "cancelled"],
      pending_review: ["active", "draft", "cancelled"],
      active: ["paused", "filled", "expired", "closed", "cancelled"],
      paused: ["active", "closed", "cancelled"],
      filled: ["closed"],
      expired: ["active", "closed"],
      cancelled: [],
      closed: [],
    };

    const job = await Job.findById(jobId);
    if (!job) {
      throw new Error("Job not found");
    }

    if (!validTransitions[job.status]?.includes(newStatus)) {
      throw new Error(`Cannot transition from ${job.status} to ${newStatus}`);
    }

    job.status = newStatus;
    job.lastModifiedBy = userId;

    if (newStatus === "active" && !job.publishedAt) {
      job.publishedAt = new Date();
    }

    await job.save();
    return job;
  }

  /**
   * Extend job deadline
   */
  async extendDeadline(jobId, newDeadline, userId) {
    const job = await Job.findById(jobId);
    if (!job) {
      throw new Error("Job not found");
    }
    return job.extendDeadline(newDeadline, userId);
  }

  /**
   * Increase vacancies
   */
  async increaseVacancies(jobId, additionalVacancies, userId) {
    const job = await Job.findById(jobId);
    if (!job) {
      throw new Error("Job not found");
    }

    job.vacancies.total += additionalVacancies;
    job.vacancies.remaining += additionalVacancies;
    job.lastModifiedBy = userId;
    
    await job.save();
    return job;
  }

  /**
   * Set monetization options
   */
  async setMonetization(jobId, monetizationData, userId) {
    return this.updateJob(jobId, { monetization: monetizationData }, userId);
  }

  // ============================================
  // ANALYTICS
  // ============================================

  /**
   * Get job analytics
   */
  async getJobAnalytics(jobId) {
    const job = await Job.findById(jobId).select("analytics title status");
    if (!job) {
      throw new Error("Job not found");
    }

    const applicationStats = await JobApplication.aggregate([
      { $match: { job: new mongoose.Types.ObjectId(jobId) } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    return {
      job: {
        title: job.title,
        status: job.status,
      },
      analytics: job.analytics,
      applicationStats,
    };
  }

  /**
   * Get admin dashboard stats
   */
  async getAdminDashboardStats() {
    const [
      jobStatusStats,
      appStatusStats,
      careRequestStats,
      analyticsStats,
    ] = await Promise.all([
      // Job counts by status
      Job.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      // Application counts by status
      JobApplication.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      // CareRequest counts by status
      CareRequest.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      // Analytics aggregations
      Promise.all([
        JobApplication.countDocuments({ status: 'hired', isActive: true }),
        JobApplication.countDocuments({ isActive: true }),
        Job.aggregate([
          { $match: { isDeleted: false } },
          { $group: { _id: null, totalViews: { $sum: '$analytics.views' } } },
        ]),
      ]),
    ]);

    // Build job status map
    const jobMap = {};
    for (const item of jobStatusStats) {
      jobMap[item._id] = item.count;
    }

    // Build application status map
    const appMap = {};
    for (const item of appStatusStats) {
      appMap[item._id] = item.count;
    }

    // Build care request status map
    const crMap = {};
    for (const item of careRequestStats) {
      crMap[item._id] = item.count;
    }

    const [totalHired, totalApplications, viewsResult] = analyticsStats;
    const totalViews = viewsResult[0]?.totalViews || 0;
    const conversionRate = totalApplications > 0
      ? Number(((totalHired / totalApplications) * 100).toFixed(1))
      : 0;

    return {
      jobs: {
        total: Object.values(jobMap).reduce((a, b) => a + b, 0),
        active: jobMap['active'] || 0,
        paused: jobMap['paused'] || 0,
        filled: jobMap['filled'] || 0,
        draft: jobMap['draft'] || 0,
        expired: jobMap['expired'] || 0,
      },
      applications: {
        total: totalApplications,
        pending: appMap['pending'] || 0,
        shortlisted: appMap['shortlisted'] || 0,
        interviewed: appMap['interviewed'] || 0,
        hired: appMap['hired'] || 0,
        rejected: appMap['rejected'] || 0,
      },
      careRequests: {
        total: Object.values(crMap).reduce((a, b) => a + b, 0),
        pending: crMap['pending'] || 0,
        approved: crMap['approved'] || 0,
        converted: crMap['converted'] || 0,
      },
      analytics: {
        avgTimeToFill: 0,
        conversionRate,
        totalViews,
      },
    };
  }

  /**
   * Get application analytics
   */
  async getApplicationAnalytics(options = {}) {
    const { startDate, endDate, groupBy = "day" } = options;

    const matchStage = {};
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    const groupFormat = {
      day: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
      week: { $dateToString: { format: "%Y-W%V", date: "$createdAt" } },
      month: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
    };

    const stats = await JobApplication.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: groupFormat[groupBy] || groupFormat.day,
          applications: { $sum: 1 },
          hired: { $sum: { $cond: [{ $eq: ["$status", "hired"] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return stats;
  }

  // ============================================
  // CAREGIVER OPERATIONS
  // ============================================

  /**
   * Apply to job
   */
  async applyToJob(jobId, applicantId, applicationData) {
    // Check if already applied
    const existingApplication = await JobApplication.findOne({
      job: jobId,
      applicant: applicantId,
    });

    if (existingApplication) {
      throw new Error("You have already applied to this job");
    }

    // Check if job is still active
    const job = await Job.findOne({
      _id: jobId,
      status: "active",
      isDeleted: false,
    });

    if (!job) {
      throw new Error("Job is no longer available");
    }

    // Check deadline
    if (job.applicationDeadline && new Date() > job.applicationDeadline) {
      throw new Error("Application deadline has passed");
    }

    // Create application
    const application = new JobApplication({
      job: jobId,
      applicant: applicantId,
      ...applicationData,
    });

    await application.save();
    return application;
  }

  /**
   * Get caregiver's applications
   */
  async getCaregiverApplications(caregiverId, filters = {}, options = {}) {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const query = {
      applicant: caregiverId,
      isActive: true,
      ...filters,
    };

    const [applications, total] = await Promise.all([
      JobApplication.find(query)
        .populate("job", "title category location salary status monetization.isFeatured")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      JobApplication.countDocuments(query),
    ]);

    return {
      applications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Withdraw application
   */
  async withdrawApplication(applicationId, caregiverId, reason = "") {
    const application = await JobApplication.findOne({
      _id: applicationId,
      applicant: caregiverId,
    });

    if (!application) {
      throw new Error("Application not found");
    }

    return application.withdraw(reason);
  }

  /**
   * Save job for later
   */
  async saveJob(jobId, userId) {
    const job = await Job.findById(jobId);
    if (!job) {
      throw new Error("Job not found");
    }

    job.analytics.saves += 1;
    await job.save();

    // Could also store in user preferences
    return { success: true, message: "Job saved" };
  }

  // ============================================
  // CARE REQUEST OPERATIONS
  // ============================================

  /**
   * Get pending care requests for admin
   */
  async getPendingCareRequests(options = {}) {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const [requests, total] = await Promise.all([
      CareRequest.find({
        status: { $in: ["pending", "under_review"] },
        isActive: true,
      })
        .populate("requestedBy", "fullName email phone profilePicture")
        .sort({ urgencyLevel: -1, priority: -1, createdAt: 1 })
        .skip(skip)
        .limit(limit),
      CareRequest.countDocuments({
        status: { $in: ["pending", "under_review"] },
        isActive: true,
      }),
    ]);

    return {
      requests,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Convert care request to job
   */
  async convertCareRequestToJob(requestId, jobOverrides, adminId) {
    const request = await CareRequest.findById(requestId)
      .populate("requestedBy");

    if (!request) {
      throw new Error("Care request not found");
    }

    // Map care request to job data
    const jobData = {
      title: request.title,
      description: request.description,
      category: this._mapCareTypeToCategory(request.careType),
      careType: this._mapDurationToCareType(request.duration),
      urgencyLevel: request.urgencyLevel,
      location: request.location,
      salary: {
        min: request.budget?.min || 0,
        max: request.budget?.max || 0,
        currency: request.budget?.currency || "NGN",
        period: request.budget?.period || "monthly",
        isNegotiable: request.budget?.isNegotiable || true,
      },
      requirements: {
        minExperience: request.preferences?.minExperience || 0,
        certifications: request.preferences?.requiredCertifications || [],
        gender: request.preferences?.preferredGender || "any",
      },
      schedule: {
        startDate: request.preferredStartDate,
        endDate: request.preferredEndDate,
        isFlexible: request.schedule?.isFlexible || false,
        workingDays: request.schedule?.preferredDays || [],
      },
      postedBy: adminId,
      postedByRole: "admin",
      careRequestId: request._id,
      familyId: request.requestedBy._id,
      status: "active",
      publishedAt: new Date(),
      ...jobOverrides,
    };

    // Create job
    const job = await this.createJob(jobData, adminId);

    // Update care request
    await request.convertToJob(job._id, adminId);

    return { job, request };
  }

  /**
   * Map care type to job category
   */
  _mapCareTypeToCategory(careType) {
    const mapping = {
      baby_care: "child_care",
      child_care: "child_care",
      elderly_care: "elderly_care",
      special_needs: "special_needs",
      medical_care: "medical_care",
      emergency_care: "medical_care",
      respite_care: "respite_care",
      companion_care: "companion_care",
      post_surgical: "post_operative_care",
      dementia_care: "dementia_care",
      palliative_care: "palliative_care",
      disability_support: "disability_support",
    };
    return mapping[careType] || "other";
  }

  /**
   * Map duration to care type
   */
  _mapDurationToCareType(duration) {
    const mapping = {
      one_time: "temporary",
      daily: "daily",
      weekly: "weekly",
      monthly: "full_time",
      long_term: "full_time",
      indefinite: "full_time",
    };
    return mapping[duration] || "full_time";
  }
}

export default new JobService();
