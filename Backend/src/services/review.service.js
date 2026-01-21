// ============================================
// REVIEW SERVICE
// Business logic for dual-layer review system
// ============================================

import Review from '../models/review.model.js';
import Booking from '../models/booking.model.js';
import User from '../models/user.model.js';
import Caregiver from '../models/caregiver.model.js';
import Notification from '../models/notification.model.js';
import bookingDayService from './bookingDay.service.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary.js';
import {
  REVIEW_TYPE,
  REVIEW_STATUS,
  MODERATION_ACTION,
  BOOKING_PAYMENT_STATUS,
  REPORT_REASON,
} from '../constants/payment.constants.js';
import { BOOKING_STATUS, NOTIFICATION_TYPE } from '../constants/booking.constants.js';
import { USER_ROLES } from '../constants/index.js';

const MIN_REVIEW_WORDS = 3;
const MIN_REPORT_DESCRIPTION_LENGTH = 15;
const AUTO_MODERATION_REPORT_THRESHOLD = 3;
const AUTO_MODERATION_FAKE_THRESHOLD = 2;
const QUICK_REVIEW_WINDOW_MINUTES = 10;
const REVIEW_FALLBACK_COMPLETION_STATUSES = new Set([
  BOOKING_STATUS.ACCEPTED,
  BOOKING_STATUS.PENDING,
  BOOKING_STATUS.RESERVED,
  BOOKING_STATUS.PAYMENT_PENDING,
  BOOKING_STATUS.AGREEMENT_PENDING,
  BOOKING_STATUS.ACTIVE,
  BOOKING_STATUS.IN_PROGRESS,
  BOOKING_STATUS.CONFIRMED,
]);
const REVIEW_NON_REVIEWABLE_STATUSES = new Set([
  BOOKING_STATUS.CANCELLED,
  BOOKING_STATUS.REJECTED,
  BOOKING_STATUS.EXPIRED,
]);
const REVIEW_SETTLED_PAYMENT_STATUSES = new Set([
  BOOKING_PAYMENT_STATUS.FULLY_PAID,
  'paid',
  'completed',
  'released',
  'held',
  'success',
  'successful',
  'succeeded',
  'verified',
  'captured',
]);

class ReviewService {
  toSafeNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  resolveBookingTotalAmount(booking) {
    if (!booking) return 0;

    const topLevelTotal = this.toSafeNumber(booking.totalAmount);
    const pricingTotalAmount = this.toSafeNumber(booking.pricing?.totalAmount);
    const pricingTotal = this.toSafeNumber(booking.pricing?.total);
    const subtotal = this.toSafeNumber(booking.pricing?.subtotal);
    const platformFee = this.toSafeNumber(booking.pricing?.platformFee);
    const taxes = this.toSafeNumber(booking.pricing?.taxes);
    const computedTotal = subtotal + platformFee + taxes;

    return (
      [topLevelTotal, pricingTotalAmount, pricingTotal, computedTotal].find(
        (amount) => amount > 0,
      ) || 0
    );
  }

  validateReviewComment(comment) {
    const words = String(comment || '').trim().split(/\s+/).filter(Boolean);
    if (words.length < MIN_REVIEW_WORDS) {
      throw new Error(`Review comment must include at least ${MIN_REVIEW_WORDS} words`);
    }
  }

  shouldAutoModerateReview(booking, reviewData) {
    const completedAt = booking?.completedAt ? new Date(booking.completedAt).getTime() : null;
    const minutesAfterCompletion = completedAt
      ? (Date.now() - completedAt) / (1000 * 60)
      : null;
    const wordCount = String(reviewData?.comment || '').trim().split(/\s+/).filter(Boolean).length;

    const suspiciousQuickSubmission = Number.isFinite(minutesAfterCompletion)
      ? minutesAfterCompletion >= 0 && minutesAfterCompletion <= QUICK_REVIEW_WINDOW_MINUTES
      : false;
    const suspiciousLowContent = wordCount < MIN_REVIEW_WORDS;

    return suspiciousQuickSubmission || suspiciousLowContent;
  }

  buildMediaPayload(uploadResult, mediaType) {
    return {
      mediaType,
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      ...(mediaType === 'video'
        ? {
            thumbnailUrl: uploadResult.secure_url,
            duration: uploadResult.duration,
          }
        : {}),
      format: uploadResult.format,
      bytes: uploadResult.bytes,
      uploadedAt: new Date(),
    };
  }

  isPaymentEligibleForReview(booking) {
    const paymentStatus = String(
      booking?.paymentStatus ?? booking?.payment?.status ?? '',
    ).toLowerCase();

    if (REVIEW_SETTLED_PAYMENT_STATUSES.has(paymentStatus)) {
      return true;
    }

    // Fallback for lifecycle-complete records where payment-state sync drifted.
    if (
      booking?.status === BOOKING_STATUS.COMPLETED &&
      this.hasBookingWindowEnded(booking)
    ) {
      return true;
    }

    if (!paymentStatus) {
      // Legacy bookings may not have paymentStatus populated.
      // Fall through to amount-based validation first.
    }

    const amountPaid = this.toSafeNumber(
      booking?.amountPaid ?? booking?.payment?.amountPaid,
    );
    const amountDueRaw = booking?.amountDue ?? booking?.payment?.amountDue;
    const parsedAmountDue = Number(amountDueRaw);
    const amountDue = Number.isFinite(parsedAmountDue)
      ? Math.max(0, parsedAmountDue)
      : Math.max(0, this.resolveBookingTotalAmount(booking) - amountPaid);
    const hasReachedConfirmedLifecycle = [
      BOOKING_STATUS.CONFIRMED,
      BOOKING_STATUS.ACTIVE,
      BOOKING_STATUS.IN_PROGRESS,
      BOOKING_STATUS.COMPLETED,
    ].includes(booking?.status);

    return amountDue <= 0 && (amountPaid > 0 || hasReachedConfirmedLifecycle);
  }

  hasBookingWindowStarted(booking, now = new Date()) {
    const startDateRaw = booking?.schedule?.startDate;
    if (!startDateRaw) {
      return false;
    }

    const startDate = new Date(startDateRaw);
    if (Number.isNaN(startDate.getTime())) {
      return false;
    }

    const [startHour, startMinute] = String(booking?.schedule?.startTime || '')
      .split(':')
      .map((value) => Number(value));

    if (Number.isInteger(startHour) && Number.isInteger(startMinute)) {
      startDate.setUTCHours(startHour, startMinute, 0, 0);
    } else {
      startDate.setUTCHours(0, 0, 0, 0);
    }

    return startDate.getTime() <= now.getTime();
  }

  hasBookingWindowEnded(booking, now = new Date()) {
    const endDateRaw = booking?.schedule?.endDate || booking?.schedule?.startDate;
    if (!endDateRaw) {
      return false;
    }

    const endDate = new Date(endDateRaw);
    if (Number.isNaN(endDate.getTime())) {
      return false;
    }

    const [endHour, endMinute] = String(booking?.schedule?.endTime || '')
      .split(':')
      .map((value) => Number(value));

    if (Number.isInteger(endHour) && Number.isInteger(endMinute)) {
      endDate.setUTCHours(endHour, endMinute, 59, 999);
    } else {
      endDate.setUTCHours(23, 59, 59, 999);
    }

    return endDate.getTime() <= now.getTime();
  }

  getReviewEligibility(booking, allBookingDaysCompleted) {
    if (REVIEW_NON_REVIEWABLE_STATUSES.has(booking.status)) {
      return {
        canReview: false,
        reason: 'Cancelled or expired bookings cannot be reviewed',
      };
    }

    if (!this.isPaymentEligibleForReview(booking)) {
      return {
        canReview: false,
        reason: 'Booking payment must be fully settled before review',
      };
    }

    if (booking.status === BOOKING_STATUS.COMPLETED || allBookingDaysCompleted) {
      return { canReview: true };
    }

    if ([BOOKING_STATUS.ACTIVE, BOOKING_STATUS.IN_PROGRESS].includes(booking.status)) {
      // If the care window is actively running, allow paid bookings to be reviewed
      // even when completion status synchronization is delayed.
      return { canReview: true };
    }

    if (
      REVIEW_FALLBACK_COMPLETION_STATUSES.has(booking.status) &&
      this.hasBookingWindowEnded(booking)
    ) {
      // Backward-compatible fallback for records that were never transitioned
      // to COMPLETED despite the booking window being over.
      return { canReview: true };
    }

    if (
      REVIEW_FALLBACK_COMPLETION_STATUSES.has(booking.status) &&
      this.hasBookingWindowStarted(booking)
    ) {
      // Allow reviews for paid bookings once the service window has started.
      // This unblocks confirmed bookings in real-world flows where completion
      // sync may lag behind payment confirmation.
      return { canReview: true };
    }

    if (!allBookingDaysCompleted) {
      return {
        canReview: false,
        reason: 'Reviews can only be submitted after all booking days are completed',
      };
    }

    return {
      canReview: false,
      reason: 'Booking must be completed first',
    };
  }

  async updateReview(reviewId, reviewerId, updates) {
    const review = await Review.findById(reviewId);

    if (!review) {
      throw new Error('Review not found');
    }

    if (review.reviewerId.toString() !== reviewerId.toString()) {
      throw new Error('Only the original reviewer can edit this review');
    }

    const editWindowMs = 24 * 60 * 60 * 1000;
    const elapsed = Date.now() - new Date(review.createdAt).getTime();
    if (elapsed > editWindowMs) {
      throw new Error('Review can only be edited within 24 hours of submission');
    }

    const allowedFields = ['overallRating', 'ratings', 'title', 'comment'];
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        review[field] = updates[field];
      }
    }

    review.editedAt = new Date();
    review.isEdited = true;
    await review.save();

    await this.updateUserRatings(review.revieweeId);
    return review;
  }

  /**
   * Attach media files (images/videos) to an existing review.
   * Reviewer-only operation.
   */
  async addReviewMedia(reviewId, reviewerId, files = []) {
    const review = await Review.findById(reviewId);

    if (!review) {
      throw new Error('Review not found');
    }

    if (review.reviewerId.toString() !== reviewerId.toString()) {
      throw new Error('Only the original reviewer can upload review media');
    }

    if (!Array.isArray(files) || files.length === 0) {
      throw new Error('At least one media file is required');
    }

    const uploadedMedia = await Promise.all(
      files.map(async (file, index) => {
        const isVideo = String(file.mimetype || '').startsWith('video/');
        const mediaType = isVideo ? 'video' : 'image';

        const uploadResult = await uploadToCloudinary(file.buffer, {
          resourceType: isVideo ? 'video' : 'image',
          folder: `careconnect/reviews/${reviewId}`,
          publicId: `review_${reviewId}_${Date.now()}_${index}`,
          allowedFormats: isVideo
            ? ['mp4', 'webm', 'mov', 'm4v']
            : ['jpg', 'jpeg', 'png', 'gif', 'webp'],
          transformation: isVideo
            ? undefined
            : [{ quality: 'auto', fetch_format: 'auto' }],
        });

        return this.buildMediaPayload(uploadResult, mediaType);
      }),
    );

    const existingMedia = Array.isArray(review.media) ? review.media : [];
    review.media = [...existingMedia, ...uploadedMedia];

    const uploadedImagesAsPhotos = uploadedMedia
      .filter((item) => item.mediaType === 'image')
      .map((item) => ({
        url: item.url,
        publicId: item.publicId,
      }));

    const existingPhotos = Array.isArray(review.photos) ? review.photos : [];
    review.photos = [...existingPhotos, ...uploadedImagesAsPhotos];

    await review.save();
    return review;
  }

  /**
   * Remove a specific media item from a review (admin-only operation).
   */
  async removeReviewMediaAsAdmin(reviewId, mediaId, adminId, reason) {
    const review = await Review.findById(reviewId);

    if (!review) {
      throw new Error('Review not found');
    }

    const reviewMedia = Array.isArray(review.media) ? review.media : [];
    let mediaIndex = reviewMedia.findIndex((item) => {
      const itemId = item?._id?.toString();
      return itemId === mediaId || item.publicId === mediaId;
    });

    let removedMedia = null;

    if (mediaIndex >= 0) {
      removedMedia = reviewMedia[mediaIndex];
      reviewMedia.splice(mediaIndex, 1);
      review.media = reviewMedia;
    } else if (Array.isArray(review.photos)) {
      const photoIndex = review.photos.findIndex((item) => item.publicId === mediaId || item.url === mediaId);
      if (photoIndex >= 0) {
        const removedPhoto = review.photos[photoIndex];
        removedMedia = {
          mediaType: 'image',
          publicId: removedPhoto.publicId,
          url: removedPhoto.url,
        };
        review.photos.splice(photoIndex, 1);
      }
    }

    if (!removedMedia) {
      throw new Error('Review media not found');
    }

    if (removedMedia.mediaType === 'image' && Array.isArray(review.photos)) {
      review.photos = review.photos.filter((item) => {
        const samePublicId = item.publicId && removedMedia.publicId
          ? item.publicId === removedMedia.publicId
          : false;
        const sameUrl = item.url && removedMedia.url ? item.url === removedMedia.url : false;
        return !samePublicId && !sameUrl;
      });
    }

    if (removedMedia.publicId) {
      try {
        await deleteFromCloudinary(
          removedMedia.publicId,
          removedMedia.mediaType === 'video' ? 'video' : 'image',
        );
      } catch (error) {
        console.error('[ReviewService] Failed to delete media from Cloudinary:', error.message);
      }
    }

    review.moderation = {
      moderatedBy: adminId,
      moderatedAt: new Date(),
      reason: reason || 'Review media removed by admin',
      action: review.moderation?.action || MODERATION_ACTION.HIDDEN,
    };

    await review.save();
    return review;
  }

  /**
   * Create a verified review (post-booking)
   */
  async createVerifiedReview(bookingId, reviewerId, reviewData) {
    const booking = await Booking.findById(bookingId)
      .populate('careSeekerId', 'fullName')
      .populate('caregiverId', 'fullName');

    if (!booking) {
      throw new Error('Booking not found');
    }
    const isCareSeeker = booking.careSeekerId._id.toString() === reviewerId.toString();

    if (!isCareSeeker) {
      throw new Error('Only care-seekers can submit verified reviews for this booking');
    }

    const allBookingDaysCompleted = await bookingDayService.areAllDaysCompleted(bookingId);
    const eligibility = this.getReviewEligibility(booking, allBookingDaysCompleted);
    if (!eligibility.canReview) {
      throw new Error(eligibility.reason);
    }

    this.validateReviewComment(reviewData.comment);

    const revieweeId = booking.caregiverId._id;

    // Check for existing review
    const existingReview = await Review.findOne({
      bookingId,
      reviewerId,
    });

    if (existingReview) {
      throw new Error('You have already reviewed this booking');
    }

    const shouldAutoModerate = this.shouldAutoModerateReview(booking, reviewData);

    const review = new Review({
      reviewType: REVIEW_TYPE.VERIFIED,
      bookingId,
      reviewerId,
      revieweeId,
      overallRating: reviewData.overallRating,
      ratings: reviewData.ratings || {},
      title: reviewData.title,
      comment: reviewData.comment,
      photos: reviewData.photos || [],
      serviceType: booking.serviceType,
      status: shouldAutoModerate ? REVIEW_STATUS.PENDING_REVIEW : REVIEW_STATUS.PUBLISHED,
    });

    await review.save();

    // Link review to booking
    booking.reviewId = review._id;
    await booking.save();

    // Update reviewee's average ratings
    await this.updateUserRatings(revieweeId);

    // Send notification
    await Notification.createNotification({
      userId: revieweeId,
      type: NOTIFICATION_TYPE.REVIEW_RECEIVED,
      title: 'New Review Received',
      message: `You received a ${reviewData.overallRating}-star review for booking #${booking.bookingNumber}`,
      priority: 'normal',
      data: {
        referenceId: review._id,
        referenceType: 'review',
        actionUrl: `/dashboard/reviews`,
        metadata: {
          rating: reviewData.overallRating,
          bookingNumber: booking.bookingNumber,
          reviewType: 'verified',
        },
      },
      channels: { inApp: true, email: true, push: true },
    });

    // Emit real-time socket event so dashboard updates instantly
    try {
      const io = global.__careconnect_io;
      if (io) {
        const revieweeRoom = `user_${revieweeId}`;
        io.to(revieweeRoom).emit('review:new', {
          reviewId: review._id,
          rating: review.overallRating,
          bookingNumber: booking.bookingNumber,
          reviewType: 'verified',
        });

        io.to(`user:${revieweeId}`).emit('review:new', {
          reviewId: review._id,
          rating: review.overallRating,
          bookingNumber: booking.bookingNumber,
          reviewType: 'verified',
        });
      }
    } catch { /* socket unavailable — non-critical */ }

    return review;
  }

  /**
   * Create a public review (open feedback)
   * Now requires a completed booking between reviewer and reviewee
   */
  async createPublicReview(revieweeId, reviewerId, reviewData) {
    // Verify both users exist
    const [reviewer, reviewee] = await Promise.all([
      User.findById(reviewerId),
      User.findById(revieweeId),
    ]);

    if (!reviewer) throw new Error('Reviewer not found');
    if (!reviewee) throw new Error('User not found');

    if (reviewerId.toString() === revieweeId.toString()) {
      throw new Error('You cannot review yourself');
    }

    this.validateReviewComment(reviewData.comment);

    // Verify there's at least one completed booking between these users
    const completedBooking = await Booking.findOne({
      $or: [
        { careSeekerId: reviewerId, caregiverId: revieweeId },
        { careSeekerId: revieweeId, caregiverId: reviewerId },
      ],
      status: BOOKING_STATUS.COMPLETED,
      paymentStatus: BOOKING_PAYMENT_STATUS.FULLY_PAID,
    });

    if (!completedBooking) {
      throw new Error('Reviews can only be submitted after completing care with this person');
    }

    const allBookingDaysCompleted = await bookingDayService.areAllDaysCompleted(completedBooking._id);
    if (!allBookingDaysCompleted) {
      throw new Error('Reviews can only be submitted after all booking days are completed');
    }

    // Check for existing public review from this reviewer to this reviewee
    const existingReview = await Review.findOne({
      reviewerId,
      revieweeId,
      reviewType: REVIEW_TYPE.PUBLIC,
    });

    if (existingReview) {
      throw new Error('You have already submitted a public review for this user');
    }

    const review = new Review({
      reviewType: REVIEW_TYPE.PUBLIC,
      reviewerId,
      revieweeId,
      overallRating: reviewData.overallRating,
      title: reviewData.title,
      comment: reviewData.comment,
      photos: reviewData.photos || [],
      status: REVIEW_STATUS.PUBLISHED,
    });

    await review.save();

    // Update reviewee's average ratings
    await this.updateUserRatings(revieweeId);

    // Send notification
    await Notification.createNotification({
      userId: revieweeId,
      type: NOTIFICATION_TYPE.REVIEW_RECEIVED,
      title: 'New Public Review',
      message: `${reviewer.fullName} left you a ${reviewData.overallRating}-star public review`,
      priority: 'normal',
      data: {
        referenceId: review._id,
        referenceType: 'review',
        actionUrl: `/dashboard/reviews`,
        metadata: {
          rating: reviewData.overallRating,
          reviewerName: reviewer.fullName,
          reviewType: 'public',
        },
      },
      channels: { inApp: true, push: true },
    });

    return review;
  }

  /**
   * Get reviews for a user (public profile)
   */
  async getUserReviews(userId, filters = {}) {
    const query = {
      revieweeId: userId,
      status: REVIEW_STATUS.PUBLISHED,
    };

    if (filters.reviewType) {
      query.reviewType = filters.reviewType;
    }

    if (filters.minRating) {
      query.overallRating = { $gte: parseInt(filters.minRating) };
    }

    if (filters.maxRating) {
      query.overallRating = {
        ...query.overallRating,
        $lte: parseInt(filters.maxRating),
      };
    }

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 10;
    const skip = (page - 1) * limit;

    const sortOptions = {};
    switch (filters.sortBy) {
      case 'rating_high':
        sortOptions.overallRating = -1;
        break;
      case 'rating_low':
        sortOptions.overallRating = 1;
        break;
      case 'helpful':
        sortOptions['helpful.count'] = -1;
        break;
      case 'oldest':
        sortOptions.createdAt = 1;
        break;
      default:
        sortOptions.createdAt = -1;
    }

    const [reviews, total, averageRatings] = await Promise.all([
      Review.find(query)
        .populate('reviewerId', 'fullName avatar')
        .populate('bookingId', 'bookingNumber serviceType')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit),
      Review.countDocuments(query),
      Review.getAverageRatings(userId),
    ]);

    return {
      reviews,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      averageRatings,
    };
  }

  /**
   * Get reviews written by a user
   */
  async getMyReviews(reviewerId, filters = {}) {
    const query = { reviewerId };

    if (filters.reviewType) {
      query.reviewType = filters.reviewType;
    }

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 10;
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      Review.find(query)
        .populate('revieweeId', 'fullName avatar')
        .populate('bookingId', 'bookingNumber serviceType')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Review.countDocuments(query),
    ]);

    return {
      reviews,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  /**
   * Get review by ID
   */
  async getReviewById(reviewId) {
    const review = await Review.findById(reviewId)
      .populate('reviewerId', 'fullName avatar')
      .populate('revieweeId', 'fullName avatar')
      .populate('bookingId', 'bookingNumber serviceType schedule');

    if (!review) {
      throw new Error('Review not found');
    }

    return review;
  }

  /**
   * Respond to a review (by reviewee)
   */
  async respondToReview(reviewId, userId, responseContent) {
    const review = await Review.findById(reviewId);

    if (!review) {
      throw new Error('Review not found');
    }

    if (review.revieweeId.toString() !== userId.toString()) {
      throw new Error('Only the person being reviewed can respond');
    }

    if (review.response?.content) {
      throw new Error('You have already responded to this review');
    }

    review.response = {
      content: responseContent,
      respondedAt: new Date(),
    };

    await review.save();

    // Notify reviewer
    await Notification.createNotification({
      userId: review.reviewerId,
      type: NOTIFICATION_TYPE.REVIEW_RESPONSE,
      title: 'Review Response',
      message: 'The person you reviewed has responded to your review',
      priority: 'normal',
      data: {
        referenceId: review._id,
        referenceType: 'review',
        actionUrl: `/dashboard/reviews`,
      },
      channels: { inApp: true },
    });

    return review;
  }

  /**
   * Toggle helpful vote on a review
   */
  async toggleHelpful(reviewId, userId) {
    const review = await Review.findById(reviewId);

    if (!review) {
      throw new Error('Review not found');
    }

    if (review.reviewerId.toString() === userId.toString()) {
      throw new Error('You cannot mark your own review as helpful');
    }

    const userIndex = review.helpful.users.indexOf(userId);

    if (userIndex > -1) {
      review.helpful.users.splice(userIndex, 1);
      review.helpful.count = Math.max(0, review.helpful.count - 1);
    } else {
      review.helpful.users.push(userId);
      review.helpful.count += 1;
    }

    await review.save();
    return review;
  }

  /**
   * Report a review
   */
  async reportReview(reviewId, userId, reason, description) {
    const review = await Review.findById(reviewId);

    if (!review) {
      throw new Error('Review not found');
    }

    if (review.reviewerId.toString() === userId.toString()) {
      throw new Error('You cannot report your own review');
    }

    if (!Object.values(REPORT_REASON).includes(reason)) {
      throw new Error('Invalid report reason');
    }

    if (description && description.trim().length < MIN_REPORT_DESCRIPTION_LENGTH) {
      throw new Error(`Report description must be at least ${MIN_REPORT_DESCRIPTION_LENGTH} characters`);
    }

    // Check if already reported by this user
    const alreadyReported = review.reported.reports.some(
      r => r.reportedBy.toString() === userId.toString()
    );

    if (alreadyReported) {
      throw new Error('You have already reported this review');
    }

    review.reported.isReported = true;
    review.reported.reports.push({
      reportedBy: userId,
      reason,
      description,
      reportedAt: new Date(),
    });

    // Auto-hide if multiple reports
    const fakeReportCount = review.reported.reports.filter(r => r.reason === REPORT_REASON.FAKE).length;
    if (
      review.reported.reports.length >= AUTO_MODERATION_REPORT_THRESHOLD ||
      fakeReportCount >= AUTO_MODERATION_FAKE_THRESHOLD
    ) {
      review.status = REVIEW_STATUS.PENDING_REVIEW;
    }

    await review.save();

    // Notify admins
    const admins = await User.find({ role: USER_ROLES.ADMIN });
    for (const admin of admins) {
      await Notification.createNotification({
        userId: admin._id,
        type: 'system_update',
        title: 'Review Reported',
        message: `A review has been reported for ${reason}`,
        priority: 'high',
        data: {
          referenceId: review._id,
          referenceType: 'review',
          actionUrl: `/admin/reviews/${review._id}`,
        },
        channels: { inApp: true, email: true },
      });
    }

    return review;
  }

  /**
   * Admin: Get all reviews (with moderation filters)
   */
  async getAllReviews(filters = {}) {
    const query = {};

    if (filters.status) query.status = filters.status;
    if (filters.reviewType) query.reviewType = filters.reviewType;
    if (filters.reported === 'true') query['reported.isReported'] = true;

    if (filters.minRating) {
      query.overallRating = { $gte: parseInt(filters.minRating) };
    }

    if (filters.search) {
      query.$or = [
        { title: { $regex: filters.search, $options: 'i' } },
        { comment: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 10;
    const skip = (page - 1) * limit;

    const [reviews, total, stats] = await Promise.all([
      Review.find(query)
        .populate('reviewerId', 'fullName avatar email')
        .populate('revieweeId', 'fullName avatar email')
        .populate('bookingId', 'bookingNumber serviceType')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Review.countDocuments(query),
      Review.getReviewStats(),
    ]);

    return {
      reviews,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      stats,
    };
  }

  /**
   * Admin: Moderate a review
   */
  async moderateReview(reviewId, adminId, action, reason) {
    const review = await Review.findById(reviewId);

    if (!review) {
      throw new Error('Review not found');
    }

    const statusMap = {
      [MODERATION_ACTION.APPROVED]: REVIEW_STATUS.PUBLISHED,
      [MODERATION_ACTION.HIDDEN]: REVIEW_STATUS.HIDDEN,
      [MODERATION_ACTION.REMOVED]: REVIEW_STATUS.REMOVED,
    };

    review.status = statusMap[action] || REVIEW_STATUS.PUBLISHED;
    review.moderation = {
      moderatedBy: adminId,
      moderatedAt: new Date(),
      reason,
      action,
    };

    if (action === MODERATION_ACTION.REMOVED || action === MODERATION_ACTION.HIDDEN) {
      review.reported.isReported = false;
    }

    await review.save();

    // Update user ratings if review removed
    if (action === MODERATION_ACTION.REMOVED) {
      await this.updateUserRatings(review.revieweeId);
    }

    // Notify reviewer
    if (action === MODERATION_ACTION.REMOVED) {
      await Notification.createNotification({
        userId: review.reviewerId,
        type: 'system_update',
        title: 'Review Removed',
        message: `Your review has been removed by a moderator. Reason: ${reason}`,
        priority: 'normal',
        data: {
          referenceId: review._id,
          referenceType: 'review',
        },
        channels: { inApp: true, email: true },
      });
    }

    return review;
  }

  /**
   * Update user's average ratings based on all published reviews
   */
  async updateUserRatings(userId) {
    const ratings = await Review.getAverageRatings(userId);

    const ratingPayload = {
      rating: ratings.averageOverall,
      totalReviews: ratings.totalReviews,
      ratingBreakdown: {
        punctuality: ratings.averagePunctuality,
        professionalism: ratings.averageProfessionalism,
        communication: ratings.averageCommunication,
        qualityOfCare: ratings.averageQualityOfCare,
        valueForMoney: ratings.averageValueForMoney,
      },
    };

    await Promise.all([
      User.findByIdAndUpdate(userId, ratingPayload),
      Caregiver.findOneAndUpdate({ userId }, ratingPayload),
    ]);

    return ratings;
  }

  /**
   * Check if user can review a booking
   */
  async canReviewBooking(bookingId, userId) {
    const booking = await Booking.findById(bookingId);
    if (!booking) return { canReview: false, reason: 'Booking not found' };

    const isCareSeeker = booking.careSeekerId.toString() === userId.toString();
    if (!isCareSeeker) {
      return { canReview: false, reason: 'Only the care-seeker can submit a verified review' };
    }

    const allBookingDaysCompleted = await bookingDayService.areAllDaysCompleted(bookingId);
    const eligibility = this.getReviewEligibility(booking, allBookingDaysCompleted);
    if (!eligibility.canReview) {
      return eligibility;
    }

    const existingReview = await Review.findOne({
      bookingId,
      reviewerId: userId,
    });

    if (existingReview) {
      return { canReview: false, reason: 'You have already reviewed this booking', existingReview };
    }

    return { canReview: true };
  }

  /**
   * Get bookings eligible for review
   */
  async getReviewableBookings(userId) {
    const candidateBookings = await Booking.find({
      careSeekerId: userId,
      status: {
        $nin: [
          BOOKING_STATUS.CANCELLED,
          BOOKING_STATUS.REJECTED,
          BOOKING_STATUS.EXPIRED,
        ],
      },
    })
      .populate('careSeekerId', 'fullName avatar')
      .populate('caregiverId', 'fullName avatar')
      .sort({ completedAt: -1, updatedAt: -1, createdAt: -1 });

    const reviewedBookingIds = await Review.find({
      reviewerId: userId,
      reviewType: REVIEW_TYPE.VERIFIED,
    }).distinct('bookingId');

    const reviewedSet = new Set(reviewedBookingIds.map(id => id.toString()));

    const reviewableDecisions = await Promise.all(
      candidateBookings.map(async (booking) => {
        const allBookingDaysCompleted = await bookingDayService.areAllDaysCompleted(booking._id);
        const eligibility = this.getReviewEligibility(booking, allBookingDaysCompleted);
        return {
          bookingId: booking._id.toString(),
          canReview: eligibility.canReview,
        };
      }),
    );

    const reviewableBookingIds = new Set(
      reviewableDecisions
        .filter((decision) => decision.canReview)
        .map((decision) => decision.bookingId),
    );

    return candidateBookings.filter((booking) => {
      const bookingId = booking._id.toString();
      return reviewableBookingIds.has(bookingId) && !reviewedSet.has(bookingId);
    });
  }
}

export default new ReviewService();
