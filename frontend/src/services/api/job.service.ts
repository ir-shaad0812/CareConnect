// ============================================
// JOB API SERVICE
// API calls for job marketplace operations
// ============================================

import apiClient from "./client";
import type { ApiResponse } from "@/types";

// ============================================
// HELPERS
// ============================================

/** Safely extract data from an API response, throwing if payload is missing */
function unwrap<T>(response: ApiResponse<T>): T {
  if (response.data === undefined || response.data === null) {
    throw new Error(response.message || response.error || "No data in API response");
  }
  return response.data;
}

// ============================================
// TYPES
// ============================================

export interface Job {
  _id: string;
  title: string;
  description: string;
  shortDescription?: string;
  category: string;
  careType: string;
  specializations: string[];
  hasApplied?: boolean;
  isSaved?: boolean;
  location: {
    type: string;
    address: string;
    city: string;
    state: string;
    country: string;
    coordinates?: {
      type: string;
      coordinates: number[];
    };
    isRemote: boolean;
  };
  salary: {
    type: string;
    min: number;
    max: number;
    currency: string;
    negotiable: boolean;
  };
  employmentType: string;
  urgencyLevel: string;
  schedule: {
    type: string;
    hoursPerWeek?: number;
    startDate?: string;
    endDate?: string;
    shiftDetails?: string;
    workingDays?: string[];
    shiftStart?: string;
    shiftEnd?: string;
  };
  requirements: {
    minExperience: number;
    education?: string;
    certifications: string[];
    skills: string[];
    languages: string[];
    backgroundCheck: boolean;
    drivingLicense: boolean;
    ownTransport: boolean;
  };
  benefits: string[];
  vacancies: {
    total: number;
    filled: number;
    remaining: number;
  };
  applicationDeadline?: string;
  status: string;
  visibility: string;
  monetization?: {
    isFeatured: boolean;
    featuredUntil?: string;
    boostLevel: number;
    priorityRanking: number;
    pricingTier: string;
  };
  analytics: {
    views: number;
    uniqueViews: number;
    applications: number;
    shortlisted: number;
    hired: number;
    avgTimeToFill: number;
  };
  // Alias for analytics
  metrics?: {
    views: number;
    applications: number;
  };
  tags: string[];
  postedBy: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobApplication {
  _id: string;
  job: Job | string;
  applicant: {
    _id: string;
    fullName: string;
    email: string;
    phone?: string;
    profilePicture?: string;
  };
  // Populated caregiver with user info
  caregiver?: {
    _id: string;
    user?: {
      _id: string;
      firstName?: string;
      lastName?: string;
      email?: string;
    };
  };
  matchScore?: number;
  caregiverProfile?: {
    _id: string;
    skills: string[];
    experienceYears: number;
    hourlyRate: number;
    availability: string;
  };
  coverLetter?: string;
  availability?: string;
  expectedSalary?: {
    amount: number;
    period: string;
    currency: string;
    negotiable: boolean;
  };
  status: string;
  interview?: {
    scheduledAt?: string;
    location?: string;
    type: string;
    notes?: string;
    feedback?: string;
    rating?: number;
    status: string;
  };
  offer?: {
    salary: number;
    salaryPeriod: string;
    startDate?: string;
    benefits?: string[];
    notes?: string;
    expiresAt?: string;
    offeredAt?: string;
    respondedAt?: string;
    response?: string;
  };
  statusHistory: Array<{
    status: string;
    changedAt: string;
    changedBy?: string;
    note?: string;
  }>;
  adminNotes: Array<{
    content: string;
    createdBy: string;
    createdAt: string;
    isPrivate: boolean;
  }>;
  analytics: {
    profileViewCount: number;
    lastViewedAt?: string;
  };
  appliedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CareRequest {
  _id: string;
  requestedBy: {
    _id: string;
    fullName: string;
    firstName?: string;
    lastName?: string;
    email: string;
    phone?: string;
    profilePicture?: string;
  };
  requesterProfile?: string;
  title: string;
  description: string;
  careType: string;
  urgencyLevel: string;
  location: {
    address: string;
    city: string;
    state: string;
    zipCode?: string;
    country: string;
    coordinates?: {
      type: string;
      coordinates: number[];
    };
    additionalDirections?: string;
  };
  budget?: {
    min: number;
    max: number;
    period: string;
    currency: string;
    isNegotiable: boolean;
  };
  careRecipient?: {
    name: string;
    age?: number;
    gender?: string;
    relationship: string;
    medicalConditions?: string[];
    mobilityLevel?: string;
    specialRequirements?: string;
  };
  preferredStartDate?: string;
  preferredEndDate?: string;
  duration?: string;
  schedule?: {
    isFlexible?: boolean;
    preferredDays?: string[];
    preferredTimeSlots?: string[];
    hoursPerDay?: number;
  };
  preferences?: {
    preferredGender?: string;
    minExperience?: number;
    requiredCertifications?: string[];
    languageRequired?: string[];
    liveIn?: boolean;
  };
  status: string;
  priority: number;
  flags?: string[];
  isVip?: boolean;
  adminReview?: {
    reviewedBy?: string;
    reviewedAt?: string;
    notes?: string;
    approvalStatus?: string;
    rejectionReason?: string;
  };
  assignedCaregiver?: string;
  convertedToJob?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobDashboardStats {
  jobs: {
    total: number;
    active: number;
    paused: number;
    filled: number;
    draft: number;
    expired: number;
  };
  applications: {
    total: number;
    pending: number;
    shortlisted: number;
    interviewed: number;
    hired: number;
    rejected: number;
  };
  careRequests: {
    total: number;
    pending: number;
    approved: number;
    converted: number;
  };
  analytics: {
    avgTimeToFill: number;
    conversionRate: number;
    totalViews: number;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface HiringFunnel {
  total: number;
  pending: number;
  underReview: number;
  shortlisted: number;
  interviewed: number;
  offerExtended: number;
  hired: number;
  rejected: number;
  withdrawn: number;
  conversionRates?: {
    applicationToReview: string;
    reviewToShortlist: string;
    shortlistToInterview: string;
    interviewToOffer: string;
    offerToHire: string;
  };
}

// ============================================
// PUBLIC JOB ENDPOINTS (Caregiver)
// ============================================

/**
 * List active jobs with filters
 */
export const listJobs = async (params?: {
  page?: number;
  limit?: number;
  category?: string;
  careType?: string;
  city?: string;
  urgencyLevel?: string;
  minSalary?: number;
  maxSalary?: number;
  sortBy?: string;
  sortOrder?: string;
}): Promise<PaginatedResponse<Job>> => {
  const response = await apiClient.get<PaginatedResponse<Job>>("/jobs", {
    params: params || {},
  });
  return unwrap(response);
};

/**
 * Search jobs
 */
export const searchJobs = async (
  query: string,
  params?: {
    page?: number;
    limit?: number;
    category?: string;
    city?: string;
  }
): Promise<PaginatedResponse<Job>> => {
  const response = await apiClient.get<PaginatedResponse<Job>>("/jobs/search", {
    params: { q: query, ...params },
  });
  return unwrap(response);
};

/**
 * Get featured jobs
 */
export const getFeaturedJobs = async (limit?: number): Promise<Job[]> => {
  const response = await apiClient.get<{ jobs: Job[] }>("/jobs/featured", {
    params: { limit },
  });
  return unwrap(response).jobs;
};

/**
 * Get job by ID
 */
export const getJob = async (id: string): Promise<Job> => {
  const response = await apiClient.get<{ job: Job }>(`/jobs/${id}`);
  return unwrap(response).job;
};

/**
 * Get nearby jobs
 */
export const getNearbyJobs = async (params: {
  lat: number;
  lng: number;
  distance?: number;
  page?: number;
  limit?: number;
}): Promise<Job[]> => {
  const response = await apiClient.get<{ jobs: Job[] }>("/jobs/nearby", { params });
  return unwrap(response).jobs;
};

/**
 * Save job for later
 */
export const saveJob = async (jobId: string): Promise<void> => {
  await apiClient.post(`/jobs/${jobId}/save`);
};

/**
 * Unsave job
 */
export const unsaveJob = async (jobId: string): Promise<void> => {
  await apiClient.delete(`/jobs/${jobId}/save`);
};

/**
 * Get saved jobs
 */
export const getSavedJobs = async (params?: {
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<Job>> => {
  const response = await apiClient.get<PaginatedResponse<Job>>("/jobs/saved/list", {
    params: params || {},
  });
  return unwrap(response);
};

/**
 * Apply to job
 */
export const applyToJob = async (
  jobId: string,
  application: {
    coverLetter?: string;
    availability?: string;
    expectedSalary?: {
      amount: number;
      period: string;
      negotiable?: boolean;
    };
    documents?: string[];
    answers?: Record<string, string>;
  }
): Promise<JobApplication> => {
  const response = await apiClient.post<{ application: JobApplication }>(
    `/jobs/${jobId}/apply`,
    application
  );
  return unwrap(response).application;
};

/**
 * Get my applications
 */
export const getMyApplications = async (params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<JobApplication>> => {
  const response = await apiClient.get<PaginatedResponse<JobApplication>>(
    "/jobs/my-applications",
    { params: params || {} }
  );
  return unwrap(response);
};

/**
 * Withdraw application
 */
export const withdrawApplication = async (
  applicationId: string,
  reason?: string
): Promise<JobApplication> => {
  const response = await apiClient.post<{ application: JobApplication }>(
    `/jobs/applications/${applicationId}/withdraw`,
    { reason }
  );
  return unwrap(response).application;
};

/**
 * Accept offer
 */
export const acceptOffer = async (applicationId: string): Promise<JobApplication> => {
  const response = await apiClient.post<{ application: JobApplication }>(
    `/jobs/applications/${applicationId}/accept-offer`
  );
  return unwrap(response).application;
};

/**
 * Decline offer
 */
export const declineOffer = async (
  applicationId: string,
  reason?: string
): Promise<JobApplication> => {
  const response = await apiClient.post<{ application: JobApplication }>(
    `/jobs/applications/${applicationId}/decline-offer`,
    { reason }
  );
  return unwrap(response).application;
};

// ============================================
// ADMIN JOB ENDPOINTS
// ============================================

/**
 * Get admin dashboard stats
 */
export const getAdminDashboardStats = async (): Promise<JobDashboardStats> => {
  const response = await apiClient.get<JobDashboardStats>("/admin/jobs/dashboard");
  return response.data as JobDashboardStats;
};

/**
 * Get all jobs (admin)
 */
export const getAdminJobs = async (params?: {
  page?: number;
  limit?: number;
  status?: string;
  category?: string;
  sortBy?: string;
  sortOrder?: string;
}): Promise<PaginatedResponse<Job>> => {
  const response = await apiClient.get<{ jobs: Job[]; pagination: PaginatedResponse<Job>['pagination'] }>("/admin/jobs", {
    params: params || {},
  });
  const d = response.data as { jobs: Job[]; pagination: PaginatedResponse<Job>['pagination'] };
  return { data: d.jobs || [], pagination: d.pagination };
};

/**
 * Create job
 */
export const createJob = async (job: Partial<Job>): Promise<Job> => {
  const response = await apiClient.post<{ job: Job }>("/admin/jobs", job);
  return unwrap(response).job;
};

/**
 * Update job
 */
export const updateJob = async (id: string, job: Partial<Job>): Promise<Job> => {
  const response = await apiClient.put<{ job: Job }>(`/admin/jobs/${id}`, job);
  return unwrap(response).job;
};

/**
 * Delete job
 */
export const deleteJob = async (id: string): Promise<void> => {
  await apiClient.delete(`/admin/jobs/${id}`);
};

/**
 * Duplicate job
 */
export const duplicateJob = async (id: string): Promise<Job> => {
  const response = await apiClient.post<{ job: Job }>(`/admin/jobs/${id}/duplicate`);
  return unwrap(response).job;
};

/**
 * Change job status
 */
export const changeJobStatus = async (id: string, status: string): Promise<Job> => {
  const response = await apiClient.patch<{ job: Job }>(`/admin/jobs/${id}/status`, {
    status,
  });
  return unwrap(response).job;
};

/**
 * Publish job
 */
export const publishJob = async (id: string): Promise<Job> => {
  const response = await apiClient.post<{ job: Job }>(`/admin/jobs/${id}/publish`);
  return unwrap(response).job;
};

/**
 * Pause job
 */
export const pauseJob = async (id: string): Promise<Job> => {
  const response = await apiClient.post<{ job: Job }>(`/admin/jobs/${id}/pause`);
  return unwrap(response).job;
};

/**
 * Close job
 */
export const closeJob = async (id: string): Promise<Job> => {
  const response = await apiClient.post<{ job: Job }>(`/admin/jobs/${id}/close`);
  return unwrap(response).job;
};

/**
 * Get job analytics
 */
export const getJobAnalytics = async (
  id: string
): Promise<{ views: number; applications: number; hired: number }> => {
  const response = await apiClient.get<
    { views: number; applications: number; hired: number }
  >(`/admin/jobs/${id}/analytics`);
  return unwrap(response);
};

/**
 * Get hiring funnel
 */
export const getHiringFunnel = async (params?: {
  jobId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<HiringFunnel> => {
  const response = await apiClient.get<{ funnel: HiringFunnel }>(
    "/admin/jobs/analytics/hiring-funnel",
    { params: params || {} }
  );
  const d = response.data as { funnel: HiringFunnel };
  return d.funnel;
};

// ============================================
// ADMIN APPLICATION ENDPOINTS
// ============================================

/**
 * Get applications for a job
 */
export const getJobApplications = async (
  jobId: string,
  params?: {
    status?: string;
    page?: number;
    limit?: number;
  }
): Promise<PaginatedResponse<JobApplication>> => {
  const response = await apiClient.get<PaginatedResponse<JobApplication>>(
    `/admin/jobs/${jobId}/applications`,
    { params: params || {} }
  );
  return unwrap(response);
};

/**
 * Get single application (admin)
 */
export const getAdminApplication = async (id: string): Promise<JobApplication> => {
  const response = await apiClient.get<{ application: JobApplication }>(
    `/admin/jobs/applications/${id}`
  );
  return unwrap(response).application;
};

/**
 * Shortlist application
 */
export const shortlistApplication = async (id: string): Promise<JobApplication> => {
  const response = await apiClient.post<{ application: JobApplication }>(
    `/admin/jobs/applications/${id}/shortlist`
  );
  return unwrap(response).application;
};

/**
 * Schedule interview
 */
export const scheduleInterview = async (
  id: string,
  interview: {
    scheduledAt: string;
    location?: string;
    type: string;
    notes?: string;
  }
): Promise<JobApplication> => {
  const response = await apiClient.post<{ application: JobApplication }>(
    `/admin/jobs/applications/${id}/interview`,
    interview
  );
  return unwrap(response).application;
};

/**
 * Record interview feedback
 */
export const recordInterviewFeedback = async (
  id: string,
  feedback: {
    feedback: string;
    rating: number;
  }
): Promise<JobApplication> => {
  const response = await apiClient.post<{ application: JobApplication }>(
    `/admin/jobs/applications/${id}/interview-feedback`,
    feedback
  );
  return unwrap(response).application;
};

/**
 * Extend offer
 */
export const extendOffer = async (
  id: string,
  offer: {
    salary: number;
    salaryPeriod: string;
    startDate?: string;
    benefits?: string[];
    notes?: string;
    expiresAt?: string;
  }
): Promise<JobApplication> => {
  const response = await apiClient.post<{ application: JobApplication }>(
    `/admin/jobs/applications/${id}/offer`,
    offer
  );
  return unwrap(response).application;
};

/**
 * Hire applicant
 */
export const hireApplicant = async (id: string): Promise<JobApplication> => {
  const response = await apiClient.post<{ application: JobApplication }>(
    `/admin/jobs/applications/${id}/hire`
  );
  return unwrap(response).application;
};

/**
 * Reject application
 */
export const rejectApplication = async (id: string, reason?: string): Promise<JobApplication> => {
  const response = await apiClient.post<{ application: JobApplication }>(
    `/admin/jobs/applications/${id}/reject`,
    { reason }
  );
  return unwrap(response).application;
};

// ============================================
// ADMIN CARE REQUEST ENDPOINTS
// ============================================

/**
 * Get care request stats
 */
export const getCareRequestStats = async (): Promise<{
   total: number;
  pending: number;
  approved: number;
  converted: number;
}> => {
  const response = await apiClient.get<
    {
      total: number;
      pending: number;
      approved: number;
      converted: number;
    }
  >("/admin/jobs/care-requests/stats");
  return unwrap(response);
};

/**
 * Get care requests
 */
export const getCareRequests = async (params?: {
  status?: string;
  urgency?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<CareRequest>> => {
  const response = await apiClient.get<{ requests: CareRequest[]; pagination: PaginatedResponse<CareRequest>["pagination"] }>(
    "/admin/jobs/care-requests",
    { params: params || {} }
  );
  const d = response.data as { requests: CareRequest[]; pagination: PaginatedResponse<CareRequest>["pagination"] };
  return { data: d.requests || [], pagination: d.pagination };
};

/**
 * Get single care request
 */
export const getCareRequest = async (id: string): Promise<CareRequest> => {
  const response = await apiClient.get<{ request: CareRequest }>(
    `/admin/jobs/care-requests/${id}`
  );
  return unwrap(response).request;
};

/**
 * Approve care request
 */
export const approveCareRequest = async (id: string, notes?: string): Promise<CareRequest> => {
  const response = await apiClient.post<{ request: CareRequest }>(
    `/admin/jobs/care-requests/${id}/approve`,
    { notes }
  );
  return unwrap(response).request;
};

/**
 * Reject care request
 */
export const rejectCareRequest = async (id: string, reason: string): Promise<CareRequest> => {
  const response = await apiClient.post<{ request: CareRequest }>(
    `/admin/jobs/care-requests/${id}/reject`,
    { reason }
  );
  return unwrap(response).request;
};

/**
 * Convert care request to job
 */
export const convertCareRequestToJob = async (
  id: string,
  jobData: Partial<Job>
): Promise<{ job: Job; request: CareRequest }> => {
  const response = await apiClient.post<{ job: Job; request: CareRequest }>(
    `/admin/jobs/care-requests/${id}/convert-to-job`,
    jobData
  );
  return unwrap(response);
};

/**
 * Assign caregiver to care request
 */
export const assignCaregiverToRequest = async (
  id: string,
  caregiverId: string,
  notes?: string
): Promise<CareRequest> => {
  const response = await apiClient.post<{ request: CareRequest }>(
    `/admin/jobs/care-requests/${id}/assign`,
    { caregiverId, notes }
  );
  return unwrap(response).request;
};

// Export all functions
export const jobService = {
  // Public
  listJobs,
  getJobs: listJobs, // Alias
  searchJobs,
  getFeaturedJobs,
  getJob,
  getJobById: getJob, // Alias
  getNearbyJobs,
  saveJob,
  unsaveJob,
  getSavedJobs,
  applyToJob,
  getMyApplications,
  withdrawApplication,
  acceptOffer,
  declineOffer,
  // Admin Jobs
  getAdminDashboardStats,
  getAdminJobs,
  createJob,
  updateJob,
  deleteJob,
  duplicateJob,
  changeJobStatus,
  publishJob,
  pauseJob,
  closeJob,
  getJobAnalytics,
  getHiringFunnel,
  // Admin Applications
  getJobApplications,
  getAdminApplication,
  shortlistApplication,
  scheduleInterview,
  recordInterviewFeedback,
  extendOffer,
  hireApplicant,
  rejectApplication,
  // Admin Care Requests
  getCareRequestStats,
  getCareRequests,
  getCareRequest,
  approveCareRequest,
  rejectCareRequest,
  convertCareRequestToJob,
  assignCaregiverToRequest,
};

export default jobService;
