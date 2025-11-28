// ============================================
// JOB ROUTES
// Routes for job marketplace operations
// ============================================

import { Router } from 'express';
import * as jobController from '../controllers/job/job.controller.js';
import * as adminJobController from '../controllers/job/admin.job.controller.js';
import { authenticate, authorize, optionalAuth } from '../middleware/auth.middleware.js';
import { USER_ROLES } from '../constants/index.js';

const router = Router();

// ============================================
// PUBLIC JOB ROUTES (Optional auth for tracking)
// ============================================

// List active jobs with filters
router.get('/', optionalAuth, jobController.listJobs);

// Search jobs
router.get('/search', optionalAuth, jobController.searchJobs);

// Get featured jobs
router.get('/featured', optionalAuth, jobController.getFeaturedJobs);

// Get nearby jobs
router.get('/nearby', optionalAuth, jobController.getNearbyJobs);

// Get single job by ID
router.get('/:id', optionalAuth, jobController.getJob);

// ============================================
// AUTHENTICATED CAREGIVER ROUTES
// ============================================

// Save job for later
router.post('/:id/save', authenticate, authorize(USER_ROLES.CAREGIVER), jobController.saveJob);

// Unsave job
router.delete('/:id/save', authenticate, authorize(USER_ROLES.CAREGIVER), jobController.unsaveJob);

// Get saved jobs
router.get('/saved/list', authenticate, authorize(USER_ROLES.CAREGIVER), jobController.getSavedJobs);

// Apply to job
router.post('/:id/apply', authenticate, authorize(USER_ROLES.CAREGIVER), jobController.applyToJob);

// Get my applications
router.get('/my-applications', authenticate, authorize(USER_ROLES.CAREGIVER), jobController.getMyApplications);

// Get single application
router.get('/applications/:applicationId', authenticate, authorize(USER_ROLES.CAREGIVER), jobController.getApplication);

// Withdraw application
router.post('/applications/:applicationId/withdraw', authenticate, authorize(USER_ROLES.CAREGIVER), jobController.withdrawApplication);

// Accept offer
router.post('/applications/:applicationId/accept-offer', authenticate, authorize(USER_ROLES.CAREGIVER), jobController.acceptOffer);

// Decline offer
router.post('/applications/:applicationId/decline-offer', authenticate, authorize(USER_ROLES.CAREGIVER), jobController.declineOffer);

export default router;
