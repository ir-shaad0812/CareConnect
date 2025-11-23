// ============================================
// DASHBOARD ROUTES
// Real-time analytics for role-based dashboards
// ============================================

import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { USER_ROLES } from '../constants/index.js';
import * as dashboardController from '../controllers/dashboard/dashboard.controller.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Caregiver dashboard routes
router.get('/caregiver/earnings', authorize(USER_ROLES.CAREGIVER), dashboardController.getCaregiverEarnings);
router.get('/caregiver/bookings-by-type', authorize(USER_ROLES.CAREGIVER), dashboardController.getCaregiverBookingsByType);
router.get('/caregiver/weekly-activity', authorize(USER_ROLES.CAREGIVER), dashboardController.getCaregiverWeeklyActivity);
router.get('/caregiver/recent-activity', authorize(USER_ROLES.CAREGIVER), dashboardController.getCaregiverRecentActivity);
router.get('/caregiver/conversations', authorize(USER_ROLES.CAREGIVER), dashboardController.getCaregiverConversations);
router.get('/caregiver/available-jobs', authorize(USER_ROLES.CAREGIVER), dashboardController.getCaregiverAvailableJobs);
router.get('/caregiver/stats', authorize(USER_ROLES.CAREGIVER), dashboardController.getCaregiverFullStats);

// Careseeker dashboard routes
router.get('/careseeker/spending', authorize(USER_ROLES.CARESEEKER), dashboardController.getCareseekerSpending);
router.get('/careseeker/service-distribution', authorize(USER_ROLES.CARESEEKER), dashboardController.getCareseekerServiceDistribution);
router.get('/careseeker/recent-activity', authorize(USER_ROLES.CARESEEKER), dashboardController.getCareseekerRecentActivity);
router.get('/careseeker/stats', authorize(USER_ROLES.CARESEEKER), dashboardController.getCareseekerStats);

export default router;
