// ============================================
// ADMIN JOB ROUTES
// Admin-only routes for job marketplace management
// ============================================

import { Router } from 'express';
import * as adminJobController from '../controllers/job/admin.job.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { USER_ROLES } from '../constants/index.js';

const router = Router();

// All admin job routes require authentication and admin role
router.use(authenticate);
router.use(authorize(USER_ROLES.ADMIN));

// ============================================
// DASHBOARD & ANALYTICS
// NOTE: All named routes MUST be registered BEFORE parameterized /:id
// ============================================

// Get dashboard stats
router.get('/dashboard', adminJobController.getDashboardStats);

// Get application analytics
router.get('/analytics/applications', adminJobController.getApplicationAnalytics);

// Get hiring funnel
router.get('/analytics/hiring-funnel', adminJobController.getHiringFunnel);

// ============================================
// CARE REQUEST MANAGEMENT
// These must come BEFORE /:id to avoid /care-requests matching as id
// ============================================

// Get care request stats
router.get('/care-requests/stats', adminJobController.getCareRequestStats);

// Get all care requests
router.get('/care-requests', adminJobController.getCareRequests);

// Get single care request
router.get('/care-requests/:id', adminJobController.getCareRequest);

// Approve care request
router.post('/care-requests/:id/approve', adminJobController.approveCareRequest);

// Reject care request
router.post('/care-requests/:id/reject', adminJobController.rejectCareRequest);

// Convert care request to job
router.post('/care-requests/:id/convert-to-job', adminJobController.convertToJob);

// Assign caregiver directly
router.post('/care-requests/:id/assign', adminJobController.assignCaregiver);

// Add note to care request
router.post('/care-requests/:id/notes', adminJobController.addCareRequestNote);

// ============================================
// APPLICATION MANAGEMENT
// These must come BEFORE /:id
// ============================================

// Get single application
router.get('/applications/:id', adminJobController.getApplication);

// Update application status
router.patch('/applications/:id/status', adminJobController.updateApplicationStatus);

// Shortlist application
router.post('/applications/:id/shortlist', adminJobController.shortlistApplication);

// Schedule interview
router.post('/applications/:id/interview', adminJobController.scheduleInterview);

// Record interview feedback
router.post('/applications/:id/interview-feedback', adminJobController.recordInterviewFeedback);

// Extend offer
router.post('/applications/:id/offer', adminJobController.extendOffer);

// Hire applicant
router.post('/applications/:id/hire', adminJobController.hireApplicant);

// Reject application
router.post('/applications/:id/reject', adminJobController.rejectApplication);

// Add note to application
router.post('/applications/:id/notes', adminJobController.addApplicationNote);

// ============================================
// JOB MANAGEMENT
// Parameterized routes LAST to avoid swallowing named paths
// ============================================

// List all jobs (including inactive, draft, etc.)
router.get('/', adminJobController.getJobs);

// Create new job
router.post('/', adminJobController.createJob);

// Get applications for a job — must come before /:id GET to allow express matching
router.get('/:id/applications', adminJobController.getJobApplications);

// Get job analytics
router.get('/:id/analytics', adminJobController.getJobAnalytics);

// Change job status
router.patch('/:id/status', adminJobController.changeStatus);

// Publish job
router.post('/:id/publish', adminJobController.publishJob);

// Pause job
router.post('/:id/pause', adminJobController.pauseJob);

// Close job
router.post('/:id/close', adminJobController.closeJob);

// Extend deadline
router.patch('/:id/extend-deadline', adminJobController.extendDeadline);

// Increase vacancies
router.patch('/:id/vacancies', adminJobController.increaseVacancies);

// Set monetization options
router.patch('/:id/monetization', adminJobController.setMonetization);

// Duplicate job
router.post('/:id/duplicate', adminJobController.duplicateJob);

// Get single job — LAST: catches any /:id not matched above
router.get('/:id', adminJobController.getJob);

// Update job
router.put('/:id', adminJobController.updateJob);

// Delete job (soft delete)
router.delete('/:id', adminJobController.deleteJob);

export default router;
