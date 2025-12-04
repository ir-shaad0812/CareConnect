// ============================================
// REVIEW ROUTES
// Routes for review & rating management
// ============================================

import { Router } from 'express';
import * as reviewController from '../controllers/review/review.controller.js';
import { authenticate, optionalAuth, authorize } from '../middleware/auth.middleware.js';
import { uploadReviewMedia, handleUploadError } from '../middleware/upload.middleware.js';

const router = Router();

// Public: Get reviews for a specific user
router.get('/user/:userId', optionalAuth, reviewController.getUserReviews);

// Public: Get single review
router.get('/:reviewId', optionalAuth, reviewController.getReviewById);

// All routes below require authentication
router.use(authenticate);

// Get my written reviews
router.get('/me/written', reviewController.getMyReviews);

// Get reviews about me
router.get('/me/received', reviewController.getReviewsAboutMe);

// Get bookings eligible for review
router.get('/me/reviewable', reviewController.getReviewableBookings);

// Check if can review a booking
router.get('/booking/:bookingId/check', reviewController.canReviewBooking);

// Create verified review (post-booking)
router.post('/booking/:bookingId', reviewController.createVerifiedReview);

// Upload media to an existing review
router.post('/:reviewId/media', uploadReviewMedia, handleUploadError, reviewController.addReviewMedia);

// Create public review
router.post('/public/:userId', reviewController.createPublicReview);

// Edit review (within 24 hours)
router.patch('/:reviewId', reviewController.updateReview);

// Respond to a review
router.post('/:reviewId/respond', reviewController.respondToReview);

// Toggle helpful
router.post('/:reviewId/helpful', reviewController.toggleHelpful);

// Report a review
router.post('/:reviewId/report', reviewController.reportReview);

// Admin routes
router.get('/admin/all', authorize('admin'), reviewController.getAllReviews);
router.get('/admin/stats', authorize('admin'), reviewController.getReviewStats);
router.post('/admin/:reviewId/moderate', authorize('admin'), reviewController.moderateReview);
router.delete('/admin/:reviewId/media/:mediaId', authorize('admin'), reviewController.removeReviewMediaAsAdmin);

export default router;
