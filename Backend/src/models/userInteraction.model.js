import mongoose from 'mongoose';

/**
 * UserInteraction Model
 * Tracks user interactions with caregivers for adaptive ranking
 * Used by the personalization engine to learn user preferences
 */
const userInteractionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    caregiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Caregiver',
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: [
        'viewed',           // Viewed profile
        'shortlisted',      // Saved / shortlisted
        'contacted',        // Sent a message
        'booked',           // Made a booking
        'reviewed',         // Left a review
        'removed',          // Removed from shortlist
        'profile_click',    // Clicked on card from search
        'search_result',    // Appeared in search results
      ],
      required: true,
    },
    metadata: {
      searchQuery: { type: String },        // What search led to this interaction
      matchScore: { type: Number },         // Match score at time of interaction
      position: { type: Number },           // Position in search results
      source: { type: String },             // Where the interaction came from
      timeSpent: { type: Number },          // Seconds spent on profile
      bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
      reviewRating: { type: Number },
    },
    timestamp: {
      type: Date,
      default: Date.now,
      // Note: TTL index defined via schema.index() for auto-cleanup
    },
  },
  {
    timestamps: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound indexes for efficient queries
userInteractionSchema.index({ userId: 1, action: 1, timestamp: -1 });
userInteractionSchema.index({ userId: 1, caregiverId: 1, action: 1 });
userInteractionSchema.index({ caregiverId: 1, action: 1, timestamp: -1 });

// TTL index — auto-delete interactions older than 1 year for data hygiene
userInteractionSchema.index({ timestamp: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

/**
 * Get interaction summary for a user-caregiver pair
 */
userInteractionSchema.statics.getInteractionSummary = async function (userId, caregiverId) {
  const interactions = await this.find({ userId, caregiverId })
    .sort({ timestamp: -1 })
    .limit(50)
    .lean();

  const summary = {
    totalInteractions: interactions.length,
    viewed: 0,
    shortlisted: false,
    contacted: false,
    booked: 0,
    reviewed: false,
    lastInteraction: interactions[0]?.timestamp || null,
  };

  for (const interaction of interactions) {
    switch (interaction.action) {
      case 'viewed':
      case 'profile_click':
        summary.viewed++;
        break;
      case 'shortlisted':
        summary.shortlisted = true;
        break;
      case 'contacted':
        summary.contacted = true;
        break;
      case 'booked':
        summary.booked++;
        break;
      case 'reviewed':
        summary.reviewed = true;
        break;
      case 'removed':
        summary.shortlisted = false;
        break;
    }
  }

  return summary;
};

/**
 * Get frequently interacted caregivers for a user
 */
userInteractionSchema.statics.getFrequentCaregivers = async function (userId, limit = 10) {
  return this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        action: { $in: ['viewed', 'profile_click', 'shortlisted', 'booked'] },
      },
    },
    {
      $group: {
        _id: '$caregiverId',
        interactionCount: { $sum: 1 },
        actions: { $addToSet: '$action' },
        lastInteraction: { $max: '$timestamp' },
        avgMatchScore: { $avg: '$metadata.matchScore' },
      },
    },
    { $sort: { interactionCount: -1, lastInteraction: -1 } },
    { $limit: limit },
  ]);
};

/**
 * Bulk log a search result impression
 */
userInteractionSchema.statics.logSearchImpressions = async function (userId, results) {
  const operations = results.map((r, index) => ({
    insertOne: {
      document: {
        userId,
        caregiverId: r.caregiverId,
        action: 'search_result',
        metadata: {
          searchQuery: r.searchQuery || '',
          matchScore: r.matchScore || 0,
          position: index + 1,
          source: 'ai_match',
        },
        timestamp: new Date(),
      },
    },
  }));

  if (operations.length > 0) {
    await this.bulkWrite(operations, { ordered: false });
  }
};

const UserInteraction = mongoose.model('UserInteraction', userInteractionSchema);

export default UserInteraction;
