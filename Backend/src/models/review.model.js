// ============================================
// REVIEW MODEL
// Dual-layer: Verified (post-booking) + Public reviews
// ============================================

import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  // Review type: verified (post-booking) or public (open)
  reviewType: {
    type: String,
    enum: ['verified', 'public'],
    required: true,
    index: true,
  },

  // Associated booking (required for verified reviews)
  // Note: Index defined via schema.index() with sparse+unique options
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
  },

  // Who wrote the review
  reviewerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },

  // Who the review is about
  revieweeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },

  // Overall rating (1-5)
  overallRating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },

  // Category-wise ratings (for verified reviews)
  ratings: {
    punctuality: { type: Number, min: 1, max: 5 },
    professionalism: { type: Number, min: 1, max: 5 },
    communication: { type: Number, min: 1, max: 5 },
    qualityOfCare: { type: Number, min: 1, max: 5 },
    valueForMoney: { type: Number, min: 1, max: 5 },
  },

  // Review text
  title: {
    type: String,
    maxlength: [150, 'Title cannot exceed 150 characters'],
  },

  comment: {
    type: String,
    required: [true, 'Review comment is required'],
    minlength: [10, 'Review must be at least 10 characters'],
    maxlength: [2000, 'Review cannot exceed 2000 characters'],
  },

  // Edit tracking
  isEdited: {
    type: Boolean,
    default: false,
  },
  editedAt: Date,

  // Attached photos
  photos: [{
    url: String,
    publicId: String,
  }],

  // Attached media (images + short videos)
  media: [{
    mediaType: {
      type: String,
      enum: ['image', 'video'],
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    publicId: {
      type: String,
      required: true,
    },
    thumbnailUrl: String,
    duration: Number,
    format: String,
    bytes: Number,
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  }],

  // Response from the reviewee
  response: {
    content: {
      type: String,
      maxlength: [1000, 'Response cannot exceed 1000 characters'],
    },
    respondedAt: Date,
  },

  // Helpful votes
  helpful: {
    count: { type: Number, default: 0 },
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },

  // Reporting / moderation
  reported: {
    isReported: { type: Boolean, default: false },
    reports: [{
      reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      reason: {
        type: String,
        enum: ['spam', 'inappropriate', 'fake', 'harassment', 'other'],
      },
      description: String,
      reportedAt: { type: Date, default: Date.now },
    }],
  },

  // Review status (moderation)
  status: {
    type: String,
    enum: ['published', 'hidden', 'removed', 'pending_review'],
    default: 'published',
    index: true,
  },

  // Moderation details
  moderation: {
    moderatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    moderatedAt: Date,
    reason: String,
    action: {
      type: String,
      enum: ['approved', 'hidden', 'removed'],
    },
  },

  // Service type context
  serviceType: {
    type: String,
    enum: ['elderly_care', 'child_care', 'special_needs', 'disability_care', 'post_surgery', 'companionship', 'respite_care', 'palliative_care', 'alzheimers_care', 'dementia_care', 'physical_therapy', 'mental_health', 'live_in_care', 'overnight_care'],
  },

}, {
  timestamps: true,
});

// Indexes
reviewSchema.index({ revieweeId: 1, reviewType: 1, status: 1 });
reviewSchema.index({ reviewerId: 1, createdAt: -1 });
reviewSchema.index({ bookingId: 1 }, { sparse: true, unique: true });
reviewSchema.index({ status: 1, 'reported.isReported': 1 });
reviewSchema.index({ overallRating: 1 });

// Ensure a user can only leave one verified review per booking
reviewSchema.pre('save', async function(next) {
  if (this.isNew && this.reviewType === 'verified') {
    if (!this.bookingId) {
      throw new Error('Booking ID is required for verified reviews');
    }
    const existing = await this.constructor.findOne({
      bookingId: this.bookingId,
      reviewerId: this.reviewerId,
    });
    if (existing) {
      throw new Error('You have already reviewed this booking');
    }
  }
  next();
});

// Static: Get average ratings for a user
reviewSchema.statics.getAverageRatings = async function(userId) {
  const result = await this.aggregate([
    {
      $match: {
        revieweeId: new mongoose.Types.ObjectId(userId),
        status: 'published',
      },
    },
    {
      $group: {
        _id: null,
        averageOverall: { $avg: '$overallRating' },
        averagePunctuality: { $avg: '$ratings.punctuality' },
        averageProfessionalism: { $avg: '$ratings.professionalism' },
        averageCommunication: { $avg: '$ratings.communication' },
        averageQualityOfCare: { $avg: '$ratings.qualityOfCare' },
        averageValueForMoney: { $avg: '$ratings.valueForMoney' },
        totalReviews: { $sum: 1 },
        ratingDistribution: { $push: '$overallRating' },
      },
    },
  ]);

  if (result.length === 0) {
    return {
      averageOverall: 0,
      averagePunctuality: 0,
      averageProfessionalism: 0,
      averageCommunication: 0,
      averageQualityOfCare: 0,
      averageValueForMoney: 0,
      totalReviews: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
  }

  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  result[0].ratingDistribution.forEach(r => {
    distribution[Math.round(r)] = (distribution[Math.round(r)] || 0) + 1;
  });

  return {
    averageOverall: Math.round(result[0].averageOverall * 10) / 10,
    averagePunctuality: Math.round((result[0].averagePunctuality || 0) * 10) / 10,
    averageProfessionalism: Math.round((result[0].averageProfessionalism || 0) * 10) / 10,
    averageCommunication: Math.round((result[0].averageCommunication || 0) * 10) / 10,
    averageQualityOfCare: Math.round((result[0].averageQualityOfCare || 0) * 10) / 10,
    averageValueForMoney: Math.round((result[0].averageValueForMoney || 0) * 10) / 10,
    totalReviews: result[0].totalReviews,
    ratingDistribution: distribution,
  };
};

// Static: Get review stats for admin
reviewSchema.statics.getReviewStats = async function() {
  const [total, verified, publicCount, published, hidden, removed, reported] = await Promise.all([
    this.countDocuments(),
    this.countDocuments({ reviewType: 'verified' }),
    this.countDocuments({ reviewType: 'public' }),
    this.countDocuments({ status: 'published' }),
    this.countDocuments({ status: 'hidden' }),
    this.countDocuments({ status: 'removed' }),
    this.countDocuments({ 'reported.isReported': true }),
  ]);

  const avgRating = await this.aggregate([
    { $match: { status: 'published' } },
    { $group: { _id: null, avg: { $avg: '$overallRating' } } },
  ]);

  return {
    total,
    verified,
    public: publicCount,
    published,
    hidden,
    removed,
    reported,
    averageRating: avgRating[0]?.avg ? Math.round(avgRating[0].avg * 10) / 10 : 0,
  };
};

const Review = mongoose.model('Review', reviewSchema);

export default Review;
