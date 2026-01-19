/**
 * Personalization Service
 * 
 * Adaptive ranking engine that learns from user interactions.
 * Uses rule-based logic (not heavy ML) to dynamically adjust
 * match weights and boost/penalize caregivers based on history.
 * 
 * Signals tracked:
 *   - Viewed profiles
 *   - Shortlisted caregivers
 *   - Booked caregivers
 *   - Search patterns
 *   - Repeat interactions
 */

import UserPreference from '../models/userPreference.model.js';
import UserInteraction from '../models/userInteraction.model.js';
import CareSeeker from '../models/careseeker.model.js';

// ─── Boost factors for different interaction types ─────────────────
const INTERACTION_BOOSTS = {
  booked: 15,         // Previously booked → strong positive signal
  shortlisted: 8,     // Shortlisted → moderate positive signal
  contacted: 6,       // Sent message → interested
  viewed: 2,          // Multiple views → mild interest
  profile_click: 1,   // Clicked from search → slight interest
  reviewed: 5,        // Left a positive review → would rebook
  removed: -5,        // Removed from shortlist → negative signal
};

// ─── Weight adaptation thresholds ──────────────────────────────────
const ADAPTATION_CONFIG = {
  minInteractionsForAdaptation: 5,  // Need at least 5 interactions to adapt
  maxWeightShift: 15,                // Max shift from default weight
  decayFactor: 0.95,                 // Recent interactions matter more
  skillLearnRate: 0.3,               // How fast to learn skill preferences
  budgetLearnRate: 0.2,              // How fast to adjust budget sensitivity
};

class PersonalizationService {
  /**
   * Get or create user preferences, syncing from CareSeeker profile if available
   */
  async getUserPreferences(userId) {
    let prefs = await UserPreference.findOne({ userId }).lean();

    if (!prefs) {
      // Try to sync from CareSeeker profile
      const careSeeker = await CareSeeker.findOne({ userId }).lean();
      if (careSeeker) {
        prefs = await UserPreference.syncFromCareSeeker(userId, careSeeker);
        prefs = prefs.toObject();
      } else {
        prefs = await UserPreference.create({ userId });
        prefs = prefs.toObject();
      }
    }

    return prefs;
  }

  /**
   * Compute personalized boost for each caregiver based on user history
   * Returns a Map of caregiverId → boostValue
   */
  async computePersonalizationBoosts(userId, caregiverIds) {
    const boosts = new Map();

    // Initialize all with 0
    for (const id of caregiverIds) {
      boosts.set(id.toString(), 0);
    }

    // Fetch relevant interactions
    const interactions = await UserInteraction.find({
      userId,
      caregiverId: { $in: caregiverIds },
    })
      .sort({ timestamp: -1 })
      .limit(500)
      .lean();

    if (interactions.length === 0) return boosts;

    // Calculate boost per caregiver
    const now = Date.now();
    for (const interaction of interactions) {
      const cgId = interaction.caregiverId.toString();
      const baseBoost = INTERACTION_BOOSTS[interaction.action] || 0;

      // Time decay: recent interactions matter more
      const ageInDays = (now - new Date(interaction.timestamp).getTime()) / (1000 * 60 * 60 * 24);
      const decayMultiplier = Math.pow(ADAPTATION_CONFIG.decayFactor, Math.min(ageInDays, 90));

      const effectiveBoost = baseBoost * decayMultiplier;
      boosts.set(cgId, (boosts.get(cgId) || 0) + effectiveBoost);
    }

    return boosts;
  }

  /**
   * Get dynamically adapted weights based on user behavior
   * Returns weight overrides that reflect user patterns
   */
  async getAdaptedWeights(userId) {
    const prefs = await this.getUserPreferences(userId);
    const defaultWeights = {
      skills: 40,
      availability: 20,
      distance: 15,
      ratings: 15,
      budget: 10,
    };

    // Use stored weight overrides if user has enough interaction history
    if (prefs.weightOverrides) {
      return { ...defaultWeights, ...prefs.weightOverrides };
    }

    // Analyze interaction patterns to suggest weight adjustments
    const recentInteractions = await UserInteraction.find({ userId })
      .sort({ timestamp: -1 })
      .limit(100)
      .lean();

    if (recentInteractions.length < ADAPTATION_CONFIG.minInteractionsForAdaptation) {
      return defaultWeights;
    }

    const adapted = { ...defaultWeights };

    // Analyze what booked caregivers have in common
    const bookedInteractions = recentInteractions.filter(i => i.action === 'booked');
    const viewedNotBooked = recentInteractions.filter(
      i => i.action === 'viewed' && !bookedInteractions.some(
        b => b.caregiverId.toString() === i.caregiverId.toString()
      )
    );

    // If user consistently books high-match-score caregivers, increase skill weight
    if (bookedInteractions.length >= 3) {
      const avgBookedScore = bookedInteractions.reduce(
        (sum, i) => sum + (i.metadata?.matchScore || 0), 0
      ) / bookedInteractions.length;

      if (avgBookedScore >= 80) {
        adapted.skills = Math.min(55, adapted.skills + 5);
      }
    }

    // If user frequently filters by budget, increase budget weight
    const budgetSearches = recentInteractions.filter(
      i => i.metadata?.searchQuery?.includes('budget')
    );
    if (budgetSearches.length / recentInteractions.length > 0.3) {
      adapted.budget = Math.min(25, adapted.budget + ADAPTATION_CONFIG.maxWeightShift * ADAPTATION_CONFIG.budgetLearnRate);
    }

    // Normalize to sum to 100
    const total = Object.values(adapted).reduce((s, v) => s + v, 0);
    for (const key of Object.keys(adapted)) {
      adapted[key] = Math.round((adapted[key] / total) * 100);
    }

    return adapted;
  }

  /**
   * Apply personalization to scored results
   * Adjusts final matchScore with personalization boost
   */
  applyPersonalizationBoosts(scoredResults, boosts) {
    return scoredResults.map(result => {
      const cgId = (result.caregiver._id || result.caregiver.id || '').toString();
      const boost = boosts.get(cgId) || 0;

      if (boost === 0) return result;

      // Clamp boost to ±20 points
      const clampedBoost = Math.max(-20, Math.min(20, boost));
      const adjustedScore = Math.min(100, Math.max(0, result.matchScore + clampedBoost));

      const updatedReasons = [...result.reasons];
      if (clampedBoost > 5) {
        updatedReasons.push('Matches your previous preferences');
      } else if (clampedBoost > 10) {
        updatedReasons.push('Highly recommended based on your history');
      }

      return {
        ...result,
        matchScore: Math.round(adjustedScore),
        personalizationBoost: Math.round(clampedBoost),
        reasons: updatedReasons,
      };
    });
  }

  /**
   * Record a user interaction
   */
  async trackInteraction(userId, caregiverId, action, metadata = {}) {
    const interaction = await UserInteraction.create({
      userId,
      caregiverId,
      action,
      metadata,
      timestamp: new Date(),
    });

    // Update learned preferences asynchronously
    this._updateLearnedPreferences(userId, action, metadata).catch(err => {
      console.error('Failed to update learned preferences:', err.message);
    });

    return interaction;
  }

  /**
   * Update learned preferences based on interaction
   * @private
   */
  async _updateLearnedPreferences(userId, action, metadata) {
    if (['viewed', 'search_result'].includes(action)) return; // Too noisy

    const updates = {};

    // Track search queries
    if (metadata.searchQuery) {
      updates.$push = {
        recentSearchQueries: {
          $each: [{ query: metadata.searchQuery, timestamp: new Date() }],
          $slice: -50, // Keep last 50
        },
      };
    }

    if (Object.keys(updates).length > 0) {
      await UserPreference.findOneAndUpdate(
        { userId },
        updates,
        { upsert: true, setDefaultsOnInsert: true }
      );
    }
  }

  /**
   * Get recommended caregivers from interaction history
   * (caregivers the user has positively interacted with but not booked)
   */
  async getRecommendedFromHistory(userId, limit = 5) {
    const frequent = await UserInteraction.getFrequentCaregivers(userId, limit);
    return frequent.filter(f => !f.actions.includes('booked'));
  }

  /**
   * Update explicit preferences
   */
  async updatePreferences(userId, preferences) {
    const allowedFields = [
      'preferredGender', 'preferredLanguages', 'budgetMin', 'budgetMax',
      'budgetType', 'preferredSkills', 'preferredServiceTypes',
      'preferredCertifications', 'maxDistance', 'minExperience',
      'minRating', 'backgroundCheckRequired',
    ];

    const sanitized = {};
    for (const [key, value] of Object.entries(preferences)) {
      if (allowedFields.includes(key)) {
        sanitized[key] = value;
      }
    }

    return UserPreference.findOneAndUpdate(
      { userId },
      { $set: sanitized },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
}

export default new PersonalizationService();
