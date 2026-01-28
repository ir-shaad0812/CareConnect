// ============================================
// TRUST SCORE SERVICE
// Calculate and manage caregiver trust scores
// ============================================

import Caregiver from '../models/caregiver.model.js';
import Booking from '../models/booking.model.js';
import Review from '../models/review.model.js';
import { BOOKING_STATUS } from '../constants/booking.constants.js';

class TrustScoreService {
  /**
   * Calculate and update trust score for a caregiver
   * Score ranges from 0-100 based on multiple factors
   *
   * @param {string} caregiverId - Caregiver document ID or userId
   * @returns {Object} Updated trust score
   */
  async calculateTrustScore(caregiverId) {
    // Find caregiver (could be _id or userId)
    let caregiver = await Caregiver.findById(caregiverId);
    if (!caregiver) {
      caregiver = await Caregiver.findOne({ userId: caregiverId });
    }

    if (!caregiver) {
      throw new Error('Caregiver not found');
    }

    const userId = caregiver.userId;

    // Calculate all score components
    const components = {
      completedBookings: await this.calculateCompletedBookingsScore(userId),
      reviewScore: await this.calculateReviewScore(caregiver),
      cancellationRate: await this.calculateCancellationScore(userId),
      responseRate: this.calculateResponseScore(caregiver.responseRate),
      profileCompleteness: Math.round(caregiver.completionPercentage * 0.1), // 0-10 points
      verificationStatus: this.calculateVerificationScore(caregiver),
    };

    // Calculate overall score (sum of all components)
    const overall = Math.min(100, Math.round(
      components.completedBookings +
      components.reviewScore +
      components.cancellationRate +
      components.responseRate +
      components.profileCompleteness +
      components.verificationStatus
    ));

    // Determine tier based on overall score
    const tier = this.getTierFromScore(overall);

    // Update caregiver trust score
    caregiver.trustScore = {
      overall,
      components,
      tier,
      lastCalculated: new Date(),
    };

    // Update cancellation stats
    const cancellationStats = await this.getCancellationStats(userId);
    caregiver.cancellationStats = cancellationStats;

    await caregiver.save();

    return caregiver.trustScore;
  }

  /**
   * Completed bookings score (0-25 points)
   * More completed bookings = higher score
   */
  async calculateCompletedBookingsScore(userId) {
    const completed = await Booking.countDocuments({
      caregiverId: userId,
      status: BOOKING_STATUS.COMPLETED,
    });

    // Scoring tiers
    if (completed === 0) return 0;
    if (completed <= 2) return 5;
    if (completed <= 5) return 10;
    if (completed <= 15) return 15;
    if (completed <= 30) return 20;
    return 25;
  }

  /**
   * Review score (0-25 points)
   * Based on average rating and review count
   */
  async calculateReviewScore(caregiver) {
    const { rating, totalReviews } = caregiver;

    if (!rating || totalReviews === 0) return 0;

    // Base score from rating (max 20 points)
    // 5.0 stars = 20 points, 4.0 stars = 16 points, etc.
    const ratingScore = (rating / 5) * 20;

    // Bonus for review volume (max 5 points)
    // Having more reviews indicates reliability
    const volumeBonus = Math.min(totalReviews / 10, 1) * 5;

    return Math.round(ratingScore + volumeBonus);
  }

  /**
   * Cancellation score (0-15 points, inverted)
   * Lower cancellation rate = higher score
   */
  async calculateCancellationScore(userId) {
    const [cancelled, total] = await Promise.all([
      Booking.countDocuments({
        caregiverId: userId,
        status: BOOKING_STATUS.CANCELLED,
        'cancellation.cancelledBy': userId, // Only count caregiver-initiated cancellations
      }),
      Booking.countDocuments({
        caregiverId: userId,
        status: { $in: [BOOKING_STATUS.COMPLETED, BOOKING_STATUS.CANCELLED] },
      }),
    ]);

    // New caregivers get full score
    if (total === 0) return 15;

    const cancellationRate = cancelled / total;

    // 0% cancellation = 15 points
    // 10% cancellation = 12 points
    // 25%+ cancellation = 0 points
    if (cancellationRate === 0) return 15;
    if (cancellationRate <= 0.05) return 13;
    if (cancellationRate <= 0.1) return 10;
    if (cancellationRate <= 0.15) return 7;
    if (cancellationRate <= 0.25) return 3;
    return 0;
  }

  /**
   * Get cancellation statistics
   */
  async getCancellationStats(userId) {
    const [totalCancelled, cancelledByCaregiver, totalCompleted] = await Promise.all([
      Booking.countDocuments({
        caregiverId: userId,
        status: BOOKING_STATUS.CANCELLED,
      }),
      Booking.countDocuments({
        caregiverId: userId,
        status: BOOKING_STATUS.CANCELLED,
        'cancellation.cancelledBy': userId,
      }),
      Booking.countDocuments({
        caregiverId: userId,
        status: BOOKING_STATUS.COMPLETED,
      }),
    ]);

    const total = totalCompleted + totalCancelled;
    const cancellationRate = total > 0 ? Math.round((totalCancelled / total) * 100) : 0;

    // Get last cancellation date
    const lastCancellation = await Booking.findOne({
      caregiverId: userId,
      status: BOOKING_STATUS.CANCELLED,
    }).sort({ 'cancellation.cancelledAt': -1 }).select('cancellation.cancelledAt');

    return {
      totalCancelled,
      cancelledByCaregiver,
      totalCompleted,
      cancellationRate,
      lastCancelledAt: lastCancellation?.cancellation?.cancelledAt || null,
    };
  }

  /**
   * Response rate score (0-15 points)
   */
  calculateResponseScore(responseRate) {
    if (!responseRate || responseRate === 0) return 0;

    // 100% response rate = 15 points
    // 80% response rate = 12 points
    // 50% response rate = 7.5 points
    return Math.round((responseRate / 100) * 15);
  }

  /**
   * Verification status score (0-10 points)
   */
  calculateVerificationScore(caregiver) {
    let score = 0;

    // Verified profile status (+4 points)
    if (caregiver.verified) score += 4;

    // Background check passed (+4 points)
    if (caregiver.backgroundCheck?.status === 'passed') score += 4;

    // Has certifications (+2 points)
    if (caregiver.certifications?.length > 0) score += 2;

    return score;
  }

  /**
   * Get trust tier from overall score
   */
  getTierFromScore(score) {
    if (score >= 90) return 'elite';
    if (score >= 70) return 'trusted';
    if (score >= 50) return 'verified';
    return 'basic';
  }

  /**
   * Get trust tier display info
   */
  getTierInfo(tier) {
    const tiers = {
      elite: {
        label: 'Elite',
        color: 'gold',
        description: 'Top-rated caregiver with exceptional track record',
        minScore: 90,
      },
      trusted: {
        label: 'Trusted',
        color: 'blue',
        description: 'Highly reliable caregiver with great reviews',
        minScore: 70,
      },
      verified: {
        label: 'Verified',
        color: 'green',
        description: 'Verified caregiver with good standing',
        minScore: 50,
      },
      basic: {
        label: 'Basic',
        color: 'gray',
        description: 'New or building reputation',
        minScore: 0,
      },
    };

    return tiers[tier] || tiers.basic;
  }

  /**
   * Update trust score after a booking is completed
   */
  async updateAfterBookingCompleted(caregiverId) {
    try {
      // Recalculate trust score
      const trustScore = await this.calculateTrustScore(caregiverId);

      // Also update completedJobs count
      const completedCount = await Booking.countDocuments({
        caregiverId,
        status: BOOKING_STATUS.COMPLETED,
      });

      await Caregiver.findOneAndUpdate(
        { userId: caregiverId },
        { completedJobs: completedCount }
      );

      return trustScore;
    } catch (error) {
      console.error('Error updating trust score after booking:', error);
      return null;
    }
  }

  /**
   * Update trust score after a review is submitted
   */
  async updateAfterReview(caregiverId) {
    try {
      // Get updated rating stats
      const caregiver = await Caregiver.findOne({ userId: caregiverId });
      if (!caregiver) return null;

      // Use Review model's aggregation method if available
      const reviewStats = await Review.aggregate([
        {
          $match: {
            revieweeId: caregiver.userId,
            status: 'published',
          },
        },
        {
          $group: {
            _id: null,
            averageRating: { $avg: '$overallRating' },
            totalReviews: { $sum: 1 },
          },
        },
      ]);

      if (reviewStats.length > 0) {
        caregiver.rating = Math.round(reviewStats[0].averageRating * 10) / 10;
        caregiver.totalReviews = reviewStats[0].totalReviews;
        await caregiver.save();
      }

      // Recalculate full trust score
      return this.calculateTrustScore(caregiverId);
    } catch (error) {
      console.error('Error updating trust score after review:', error);
      return null;
    }
  }

  /**
   * Update trust score after a cancellation
   */
  async updateAfterCancellation(caregiverId) {
    try {
      return this.calculateTrustScore(caregiverId);
    } catch (error) {
      console.error('Error updating trust score after cancellation:', error);
      return null;
    }
  }

  /**
   * Batch update all caregiver trust scores (for scheduled job)
   */
  async updateAllTrustScores() {
    const caregivers = await Caregiver.find({}).select('_id');
    const results = [];

    for (const caregiver of caregivers) {
      try {
        const score = await this.calculateTrustScore(caregiver._id);
        results.push({
          caregiverId: caregiver._id,
          success: true,
          score: score.overall,
        });
      } catch (error) {
        results.push({
          caregiverId: caregiver._id,
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Get trust score summary for a caregiver
   */
  async getTrustScoreSummary(caregiverId) {
    const caregiver = await Caregiver.findOne({ userId: caregiverId });
    if (!caregiver) {
      throw new Error('Caregiver not found');
    }

    // Calculate if stale (older than 24 hours)
    const isStale = !caregiver.trustScore?.lastCalculated ||
      (new Date() - new Date(caregiver.trustScore.lastCalculated)) > 24 * 60 * 60 * 1000;

    // Recalculate if stale
    if (isStale) {
      await this.calculateTrustScore(caregiverId);
      await caregiver.reload();
    }

    return {
      overall: caregiver.trustScore?.overall || 0,
      tier: caregiver.trustScore?.tier || 'basic',
      tierInfo: this.getTierInfo(caregiver.trustScore?.tier || 'basic'),
      components: caregiver.trustScore?.components || {},
      cancellationStats: caregiver.cancellationStats || {},
      lastCalculated: caregiver.trustScore?.lastCalculated,
    };
  }
}

// Export singleton instance
const trustScoreService = new TrustScoreService();
export default trustScoreService;
