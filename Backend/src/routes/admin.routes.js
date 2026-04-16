// ====
// ADMIN ROUTES
// Routes for admin dashboard and management
// ====
import { Router } from 'express';
import * as adminController from '../controllers/admin/admin.controller.js';
import * as bookingController from '../controllers/booking/booking.controller.js';
import * as noteController from '../controllers/note/note.controller.js';
import * as activityController from '../controllers/admin/admin.activity.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { USER_ROLES } from '../constants/index.js';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(authorize(USER_ROLES.ADMIN));

// Dashboard
router.get('/dashboard/stats', adminController.getDashboardStats);
router.get('/system-stats', adminController.getSystemStats);
router.get('/dashboard/analytics', adminController.getAdminAnalytics);
router.get('/activities', adminController.getRecentActivities);

// Analytics (time-series, real data)
router.get('/analytics/full', adminController.getFullAnalytics);
router.get('/analytics/overview', adminController.getAnalyticsOverview);
router.get('/analytics/bookings', adminController.getAnalyticsBookings);
router.get('/analytics/revenue', adminController.getAnalyticsRevenue);
router.get('/analytics/users', adminController.getAnalyticsUsers);
router.get('/analytics/notes', adminController.getAnalyticsNotes);
router.get('/analytics/locations', adminController.getAnalyticsLocations);

// User Activity Tracking
router.get('/activities/timeline', activityController.getActivityTimeline);
router.get('/activities/stats', activityController.getActivityStats);
router.get('/activities/logins', activityController.getLoginAnalytics);
router.get('/activities/engagement', activityController.getUserEngagement);
router.get('/activities/platform', activityController.getPlatformStats);
router.get('/activities/user/:userId', activityController.getUserActivitySummary);

// User Management
router.get('/users', adminController.getAllUsers);
router.get('/users/pending-approval', adminController.getPendingApprovalUsers);
router.get('/users/:userId', adminController.getUserDetails);
router.patch('/users/:userId/status', adminController.updateUserStatus);
router.patch('/users/:userId/role', adminController.updateUserRole);
router.post('/users/:userId/approve', adminController.approveUser);
router.post('/users/:userId/reject', adminController.rejectUser);
router.post('/users/:userId/suspend', adminController.suspendUser);
router.delete('/users/:userId', adminController.deleteUser);

// Caregiver Management
router.get('/caregivers', adminController.getAllCaregivers);
router.patch('/caregivers/:userId/featured', adminController.toggleCaregiverFeatured);
router.patch('/caregivers/:userId/background-check', adminController.updateBackgroundCheck);
router.patch('/caregivers/:userId/verify', adminController.verifyCaregiverProfile);

// Care Seeker Management
router.get('/care-seekers', adminController.getAllCareSeekers);

// Admin Map Management
router.get('/map/locations', adminController.getMapLocations);

// Location Proof Management (Care-seekers)
router.get('/location-proofs', adminController.getLocationProofs);
router.patch('/location-proofs/:userId/verify', adminController.verifyLocationProof);
router.patch('/location-proofs/:userId/reject', adminController.rejectLocationProof);

// Document Management
router.get('/documents', adminController.getAllDocuments);
router.patch('/documents/:documentId/verify', adminController.verifyDocument);
router.patch('/documents/:documentId/reject', adminController.rejectDocument);

// Booking Management (Admin - Read-only monitoring + intervention)
router.get('/bookings', bookingController.getAllBookings);
router.get('/bookings/stats', bookingController.getBookingStats);
router.get('/bookings/calendar', bookingController.getAdminCalendarEvents);
router.get('/bookings/:bookingId', bookingController.getBookingDetails);
router.patch('/bookings/:bookingId/status', bookingController.updateBookingStatus);
router.post('/bookings/:bookingId/cancel', bookingController.adminCancelBooking);
router.post('/bookings/:bookingId/resolve-dispute', bookingController.resolveDispute);

// Notes Management (Admin)
router.get('/notes', noteController.adminGetNotes);
router.delete('/notes/:noteId', noteController.adminDeleteNote);

// Payment management (Admin)
router.get('/payments/transactions', adminController.getAllTransactions);
router.get('/payments/stats', adminController.getPaymentStats);
router.post('/payments/:transactionId/release', adminController.releasePayment);
router.post('/payments/:transactionId/refund', adminController.adminRefund);

// Wallet management (Admin)
router.get('/wallets', adminController.getAllWallets);
router.get('/wallets/platform', adminController.getPlatformWallet);
router.get('/wallets/:userId', adminController.getUserWallet);

// Caregiver recommendation badge
router.patch('/caregivers/:userId/recommend', adminController.toggleCaregiverRecommended);

// Pricing config
router.get('/pricing/config', adminController.getPricingConfig);

export default router;
