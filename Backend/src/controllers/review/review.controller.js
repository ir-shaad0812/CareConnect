// ============================================
// REVIEW CONTROLLER
// Handles all review-related HTTP requests
// ============================================

import reviewService from '../../services/review.service.js';
import { ApiResponse, asyncHandler, ApiError } from '../../utils/apiResponse.js';
import { USER_ROLES } from '../../constants/index.js';
import { emitNewReview } from '../../config/socket.js';

/**
 * Create a verified review (post-booking)
 */
export const createVerifiedReview = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const reviewerId = req.user._id;

  const review = await reviewService.createVerifiedReview(bookingId, reviewerId, req.body);

  // Real-time: notify caregiver, family, admin
  const io = req.app.get('io');
  if (io) emitNewReview(io, review);

  res.status(201).json(
    new ApiResponse(201, { review }, 'Verified review submitted successfully')
  );
});

/**
 * Create a public review (open feedback)
 */
export const createPublicReview = asyncHandler(async (req, res) => {
  const { userId: revieweeId } = req.params;
  const reviewerId = req.user._id;

  const review = await reviewService.createPublicReview(revieweeId, reviewerId, req.body);

  res.status(201).json(
    new ApiResponse(201, { review }, 'Public review submitted successfully')
  );
});

/**
 * Get reviews for a user
 */
export const getUserReviews = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const result = await reviewService.getUserReviews(userId, req.query);

  res.status(200).json(
    new ApiResponse(200, result, 'Reviews fetched successfully')
  );
});

/**
 * Get reviews I've written
 */
export const getMyReviews = asyncHandler(async (req, res) => {
  const reviewerId = req.user._id;

  const result = await reviewService.getMyReviews(reviewerId, req.query);

  res.status(200).json(
    new ApiResponse(200, result, 'Your reviews fetched successfully')
  );
});

/**
 * Get reviews about me
 */
export const getReviewsAboutMe = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const result = await reviewService.getUserReviews(userId, req.query);

  res.status(200).json(
    new ApiResponse(200, result, 'Reviews fetched successfully')
  );
});

/**
 * Get review by ID
 */
export const getReviewById = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;

  const review = await reviewService.getReviewById(reviewId);

  res.status(200).json(
    new ApiResponse(200, { review }, 'Review fetched successfully')
  );
});

/**
 * Edit a review within 24 hours
 */
export const updateReview = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;
  const reviewerId = req.user._id;

  const review = await reviewService.updateReview(reviewId, reviewerId, req.body);

  res.status(200).json(
    new ApiResponse(200, { review }, 'Review updated successfully')
  );
});

/**
 * Respond to a review
 */
export const respondToReview = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;
  const userId = req.user._id;
  const { content } = req.body;

  if (!content || content.trim().length === 0) {
    throw ApiError.badRequest('Response content is required');
  }

  const review = await reviewService.respondToReview(reviewId, userId, content.trim());

  res.status(200).json(
    new ApiResponse(200, { review }, 'Response submitted successfully')
  );
});

/**
 * Toggle helpful vote
 */
export const toggleHelpful = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;
  const userId = req.user._id;

  const review = await reviewService.toggleHelpful(reviewId, userId);

  res.status(200).json(
    new ApiResponse(200, { review }, 'Helpful vote updated')
  );
});

/**
 * Report a review
 */
export const reportReview = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;
  const userId = req.user._id;
  const { reason, description } = req.body;

  if (!reason) {
    throw ApiError.badRequest('Report reason is required');
  }

  const review = await reviewService.reportReview(reviewId, userId, reason, description);

  res.status(200).json(
    new ApiResponse(200, { review }, 'Review reported successfully')
  );
});

/**
 * Check if user can review a booking
 */
export const canReviewBooking = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const userId = req.user._id;

  const result = await reviewService.canReviewBooking(bookingId, userId);

  res.status(200).json(
    new ApiResponse(200, result, 'Review eligibility checked')
  );
});

/**
 * Get bookings eligible for review
 */
export const getReviewableBookings = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const bookings = await reviewService.getReviewableBookings(userId);

  res.status(200).json(
    new ApiResponse(200, { bookings }, 'Reviewable bookings fetched')
  );
});

/**
 * Add media to an existing review
 */
export const addReviewMedia = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;
  const reviewerId = req.user._id;

  if (!Array.isArray(req.files) || req.files.length === 0) {
    throw ApiError.badRequest('At least one media file is required');
  }

  const review = await reviewService.addReviewMedia(reviewId, reviewerId, req.files);

  res.status(200).json(
    new ApiResponse(200, { review }, 'Review media uploaded successfully')
  );
});

/**
 * Admin: Remove media from a review
 */
export const removeReviewMediaAsAdmin = asyncHandler(async (req, res) => {
  const { reviewId, mediaId } = req.params;
  const adminId = req.user._id;
  const reason = typeof req.query.reason === 'string'
    ? req.query.reason
    : typeof req.body?.reason === 'string'
      ? req.body.reason
      : '';

  const review = await reviewService.removeReviewMediaAsAdmin(
    reviewId,
    mediaId,
    adminId,
    reason,
  );

  res.status(200).json(
    new ApiResponse(200, { review }, 'Review media removed successfully')
  );
});

// ============================================
// ADMIN REVIEW CONTROLLERS
// ============================================

/**
 * Get all reviews (admin)
 */
export const getAllReviews = asyncHandler(async (req, res) => {
  const result = await reviewService.getAllReviews(req.query);

  res.status(200).json(
    new ApiResponse(200, result, 'All reviews fetched successfully')
  );
});

/**
 * Moderate a review (admin)
 */
export const moderateReview = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;
  const adminId = req.user._id;
  const { action, reason } = req.body;

  if (!action) {
    throw ApiError.badRequest('Moderation action is required');
  }

  if (!reason) {
    throw ApiError.badRequest('Moderation reason is required');
  }

  const review = await reviewService.moderateReview(reviewId, adminId, action, reason);

  // Broadcast moderation result in real-time
  const io = req.app.get('io');
  if (io) {
    // Notify the reviewer their review was moderated
    io.to(`user_${review.reviewerId}`).to(`user:${review.reviewerId}`).emit('review:moderated', {
      reviewId: review._id,
      action,
      status: review.status,
      reason,
    });
    // Notify the reviewee (caregiver) that their profile rating may have changed
    if (action === 'removed' || action === 'approved') {
      io.to(`user_${review.revieweeId}`).to(`user:${review.revieweeId}`).emit('review:changed', {
        revieweeId: review.revieweeId.toString(),
        action,
      });
    }
    // Notify all admin:global observers
    io.to('admin:global').emit('admin:review:moderated', {
      reviewId: review._id,
      action,
      moderatedBy: adminId,
    });
  }

  res.status(200).json(
    new ApiResponse(200, { review }, 'Review moderated successfully')
  );
});

/**
 * Get review statistics (admin)
 */
export const getReviewStats = asyncHandler(async (req, res) => {
  const stats = await reviewService.getAllReviews({ ...req.query, limit: 0 });

  res.status(200).json(
    new ApiResponse(200, { stats: stats.stats }, 'Review statistics fetched')
  );
});
