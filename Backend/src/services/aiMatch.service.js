/**
 * AI Match Service
 * 
 * Orchestrates the full AI-powered caregiver matching pipeline:
 *   1. Parse natural language query (Semantic Service)
 *   2. Fetch candidate caregivers (MongoDB aggregation)
 *   3. Score each candidate (Match Engine)
 *   4. Apply personalization boosts (Personalization Service)
 *   5. Return ranked, explainable results
 * 
 * Performance: Designed for <2 second response time
 * with MongoDB aggregation + in-memory scoring pipeline.
 */

import mongoose from 'mongoose';
import Caregiver from '../models/caregiver.model.js';
import CareSeeker from '../models/careseeker.model.js';
import User from '../models/user.model.js';
import UserInteraction from '../models/userInteraction.model.js';
import { computeMatchScore, batchScoreCaregivers, expandSearchTerms, DEFAULT_WEIGHTS } from './matchEngine.service.js';
import personalizationService from './personalization.service.js';
import semanticService from './semantic.service.js';
import { USER_ROLES, USER_STATUS } from '../constants/index.js';

// ─── Simple in-memory cache ───────────────────────────────────────
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const PROFILE_HEAL_COOLDOWN_MS = 60 * 1000; // 1 minute
let lastProfileHealAt = 0;

function getCacheKey(params) {
  return JSON.stringify(params);
}

function getFromCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  // Limit cache size
  if (cache.size > 200) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp);
    for (let i = 0; i < 50; i++) {
      cache.delete(oldest[i][0]);
    }
  }
  cache.set(key, { data, timestamp: Date.now() });
}

class AIMatchService {
  /**
   * Clear candidate cache so approval/profile updates are visible immediately.
   */
  invalidateCandidateCache() {
    cache.clear();
  }

  /**
   * Main AI-powered search endpoint
   * 
   * @param {Object} params
   * @param {string} params.query - Natural language search query
   * @param {string} params.userId - Authenticated user ID (optional)
   * @param {Object} params.filters - Explicit filters
   * @param {Object} params.location - { coordinates: [lng, lat], city, state }
   * @param {Object} params.budget - { min, max, type }
   * @param {Array}  params.serviceTypes - Explicit service type filter
   * @param {Array}  params.skills - Explicit skills filter
   * @param {string} params.sortBy - Sort preference
   * @param {number} params.page - Page number (1-indexed)
   * @param {number} params.limit - Results per page
   * @returns {Object} AI-matched results with scores and explanations
   */
  async search(params) {
    const {
      query = '',
      userId = null,
      filters = {},
      location = null,
      budget = null,
      serviceTypes = [],
      skills = [],
      sortBy = 'match_score',
      page = 1,
      limit = 12,
    } = params;

    // ──── STEP 1: Parse natural language query ────────────────────
    let semanticResult = { serviceTypes: [], skills: [], filters: {}, concepts: [], confidence: 0 };
    if (query) {
      semanticResult = semanticService.parseQuery(query);
    }

    // ──── STEP 2: Build seeker criteria ───────────────────────────
    const seekerCriteria = await this._buildSeekerCriteria({
      userId,
      query,
      semanticResult,
      filters,
      location,
      budget,
      serviceTypes,
      skills,
    });

    // ──── STEP 3: Fetch candidate caregivers ──────────────────────
    const cacheKey = getCacheKey({
      serviceTypes: seekerCriteria.serviceTypes,
      city: seekerCriteria.city,
      state: seekerCriteria.state,
      coordinates: seekerCriteria.coordinates,
      maxDistance: seekerCriteria.maxDistance,
      minExperience: seekerCriteria.minExperience,
      minRating: seekerCriteria.minRating,
      budgetMax: seekerCriteria.budgetMax,
      budgetType: seekerCriteria.budgetType,
      workPreferences: seekerCriteria.workPreferences,
      preferredGender: seekerCriteria.preferredGender,
      backgroundCheckRequired: seekerCriteria.backgroundCheckRequired,
    });

    let candidates = getFromCache(cacheKey);
    if (!candidates) {
      candidates = await this._fetchCandidates(seekerCriteria);
      // Avoid caching empty sets so newly-approved caregivers appear immediately.
      if (candidates.length > 0) {
        setCache(cacheKey, candidates);
      }
    }

    if (candidates.length === 0) {
      return {
        success: true,
        results: [],
        pagination: { page, limit, total: 0, pages: 0 },
        query: {
          original: query,
          parsed: semanticResult,
          criteria: this._sanitizeCriteria(seekerCriteria),
        },
      };
    }

    // ──── STEP 4: Score all candidates ────────────────────────────
    let weights = { ...DEFAULT_WEIGHTS };
    if (userId) {
      try {
        weights = await personalizationService.getAdaptedWeights(userId);
      } catch { /* use defaults */ }
    }

    let scoredResults = batchScoreCaregivers(candidates, seekerCriteria, weights);

    // ──── STEP 5: Apply personalization boosts ────────────────────
    if (userId) {
      try {
        const caregiverIds = candidates.map(c => c._id);
        const boosts = await personalizationService.computePersonalizationBoosts(userId, caregiverIds);
        scoredResults = personalizationService.applyPersonalizationBoosts(scoredResults, boosts);
      } catch { /* continue without personalization */ }
    }

    // ──── STEP 6: Sort results ────────────────────────────────────
    scoredResults = this._sortResults(scoredResults, sortBy);

    // ──── STEP 7: Paginate ────────────────────────────────────────
    const total = scoredResults.length;
    const pages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const paginatedResults = scoredResults.slice(startIndex, startIndex + limit);

    // ──── STEP 8: Format response ─────────────────────────────────
    const formattedResults = paginatedResults.map((result, index) => 
      this._formatResult(result, startIndex + index + 1)
    );

    // ──── STEP 9: Log search impressions (async, non-blocking) ───
    if (userId && formattedResults.length > 0) {
      UserInteraction.logSearchImpressions(userId, formattedResults.map(r => ({
        caregiverId: r.caregiverId,
        searchQuery: query,
        matchScore: r.matchScore,
      }))).catch(() => {});
    }

    return {
      success: true,
      results: formattedResults,
      pagination: { page, limit, total, pages },
      query: {
        original: query,
        parsed: semanticResult,
        criteria: this._sanitizeCriteria(seekerCriteria),
      },
      meta: {
        weights,
        totalCandidates: candidates.length,
        searchTime: Date.now(),
      },
    };
  }

  /**
   * Get a single caregiver match score for a specific care seeker
   */
  async getMatchScore(caregiverId, userId) {
    const caregiver = await Caregiver.findById(caregiverId)
      .populate('userId', 'fullName email phone avatar location gender status')
      .lean();

    if (!caregiver) return null;

    const seekerCriteria = await this._buildSeekerCriteriaFromUser(userId);
    const result = computeMatchScore(caregiver, seekerCriteria);

    return {
      caregiverId,
      ...result,
    };
  }

  /**
   * Get AI-powered suggestions based on partial query
   */
  getSuggestions(partialQuery) {
    return semanticService.getSuggestions(partialQuery);
  }

  /**
   * Track user interaction with a caregiver
   */
  async trackInteraction(userId, caregiverId, action, metadata = {}) {
    return personalizationService.trackInteraction(userId, caregiverId, action, metadata);
  }

  // ─── PRIVATE METHODS ────────────────────────────────────────────

  /**
   * Build comprehensive seeker criteria from all inputs
   */
  async _buildSeekerCriteria({ userId, query, semanticResult, filters, location, budget, serviceTypes, skills }) {
    const criteria = {
      serviceTypes: [],
      skills: [],
      query: query || '',
    };

    // Merge service types from multiple sources
    const allServiceTypes = new Set([
      ...(serviceTypes || []),
      ...(semanticResult.serviceTypes || []),
      ...(filters.serviceTypes || []),
    ]);
    criteria.serviceTypes = [...allServiceTypes];

    // Merge skills
    const allSkills = new Set([
      ...(skills || []),
      ...(semanticResult.skills || []),
      ...(filters.skills || []),
    ]);
    criteria.skills = [...allSkills];

    // Location
    if (location?.coordinates?.length === 2) {
      criteria.coordinates = location.coordinates;
    }
    if (location?.city) criteria.city = location.city;
    if (location?.state) criteria.state = location.state;

    // Budget
    if (budget) {
      criteria.budgetMin = budget.min;
      criteria.budgetMax = budget.max;
      criteria.budgetType = budget.type || 'hourly';
    }

    // Explicit filters
    if (filters.minExperience) criteria.minExperience = filters.minExperience;
    if (filters.minRating) criteria.minRating = filters.minRating;
    if (filters.maxDistance) criteria.maxDistance = filters.maxDistance;
    if (filters.workPreferences) criteria.workPreferences = filters.workPreferences;
    if (filters.preferredGender) criteria.preferredGender = filters.preferredGender;
    if (filters.backgroundCheckRequired) criteria.backgroundCheckRequired = true;
    if (filters.urgency) criteria.urgency = filters.urgency;
    if (filters.preferredDays) criteria.preferredDays = filters.preferredDays;
    if (filters.languages) criteria.languages = filters.languages;
    if (filters.certifications) criteria.certifications = filters.certifications;

    // Merge semantic quality filters
    if (semanticResult.filters) {
      for (const [key, value] of Object.entries(semanticResult.filters)) {
        if (!criteria[key]) criteria[key] = value;
      }
    }

    // If authenticated, enrich from user preferences
    if (userId) {
      try {
        await this._enrichFromUserProfile(criteria, userId);
      } catch { /* continue with what we have */ }
    }

    return criteria;
  }

  /**
   * Enrich criteria from the user's CareSeeker profile
   */
  async _enrichFromUserProfile(criteria, userId) {
    const careSeeker = await CareSeeker.findOne({ userId }).lean();
    if (!careSeeker) return;

    // Only fill in gaps — don't override explicit inputs
    if (criteria.serviceTypes.length === 0 && careSeeker.careNeeds?.length) {
      criteria.serviceTypes = careSeeker.careNeeds;
    }

    if (!criteria.budgetMax && careSeeker.budget?.max) {
      criteria.budgetMin = careSeeker.budget.min;
      criteria.budgetMax = careSeeker.budget.max;
      criteria.budgetType = careSeeker.budget.type || 'hourly';
    }

    if (!criteria.preferredGender && careSeeker.caregiverPreferences?.gender) {
      criteria.preferredGender = careSeeker.caregiverPreferences.gender;
    }

    if (!criteria.languages?.length && careSeeker.caregiverPreferences?.languages?.length) {
      criteria.languages = careSeeker.caregiverPreferences.languages;
    }

    if (!criteria.minExperience && careSeeker.caregiverPreferences?.minExperience) {
      criteria.minExperience = careSeeker.caregiverPreferences.minExperience;
    }

    if (!criteria.coordinates && careSeeker.careLocation?.coordinates?.coordinates?.length === 2) {
      criteria.coordinates = careSeeker.careLocation.coordinates.coordinates;
      criteria.city = careSeeker.careLocation.city;
      criteria.state = careSeeker.careLocation.state;
    }

    if (careSeeker.caregiverPreferences?.backgroundCheckRequired) {
      criteria.backgroundCheckRequired = true;
    }

    if (!criteria.preferredDays?.length && careSeeker.preferredSchedule?.days?.length) {
      criteria.preferredDays = careSeeker.preferredSchedule.days;
    }

    if (careSeeker.urgency && careSeeker.urgency !== 'flexible') {
      criteria.urgency = criteria.urgency || careSeeker.urgency;
    }
  }

  /**
   * Build criteria from just a user ID (for single match score)
   */
  async _buildSeekerCriteriaFromUser(userId) {
    const criteria = { serviceTypes: [], skills: [] };
    await this._enrichFromUserProfile(criteria, userId);
    return criteria;
  }

  /**
   * Fetch candidate caregivers from DB using aggregation
   */
  async _fetchCandidates(criteria) {
    const pipeline = [];

    // Start with active, searchable caregivers
    const matchStage = {
      searchable: { $ne: false },
    };

    // Service type filter
    if (criteria.serviceTypes.length > 0) {
      matchStage.serviceTypes = { $in: criteria.serviceTypes };
    }

    // Experience filter
    if (criteria.minExperience) {
      matchStage.experience = { $gte: criteria.minExperience };
    }

    // Rating filter
    if (criteria.minRating) {
      matchStage.rating = { $gte: criteria.minRating };
    }

    // Background check filter
    if (criteria.backgroundCheckRequired) {
      matchStage['backgroundCheck.status'] = 'passed';
    }

    // Work preferences filter
    if (criteria.workPreferences?.length) {
      matchStage.workPreferences = { $in: criteria.workPreferences };
    }

    // Budget filter (approximate — precision is in scoring)
    if (criteria.budgetMax) {
      const rateField = `${criteria.budgetType === 'daily' ? 'dailyRate' : criteria.budgetType === 'weekly' ? 'weeklyRate' : criteria.budgetType === 'monthly' ? 'monthlyRate' : 'hourlyRate'}`;
      matchStage.$or = [
        { [rateField]: { $lte: criteria.budgetMax * 1.3 } }, // Allow 30% over for scoring
        { [rateField]: null }, // Include those without rates
        { [rateField]: { $exists: false } },
      ];
    }

    // Availability days filter
    if (criteria.preferredDays?.length) {
      matchStage['availability.days'] = { $in: criteria.preferredDays };
    }

    pipeline.push({ $match: matchStage });

    // Join with User for location, avatar, name, gender
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'userId',
        pipeline: [
          {
            $match: { status: 'active' },
          },
          {
            $project: {
              fullName: 1,
              email: 1,
              phone: 1,
              avatar: 1,
              gender: 1,
              location: 1,
              isEmailVerified: 1,
              status: 1,
            },
          },
        ],
      },
    });

    // Unwind user (1:1 relationship)
    pipeline.push({ $unwind: '$userId' });

    // Gender filter (on User model)
    if (criteria.preferredGender && criteria.preferredGender !== 'no_preference') {
      pipeline.push({
        $match: { 'userId.gender': criteria.preferredGender },
      });
    }

    // Language filter
    if (criteria.languages?.length) {
      pipeline.push({
        $match: { languages: { $in: criteria.languages } },
      });
    }

    // Geo-proximity filter if coordinates available
    if (criteria.coordinates?.length === 2) {
      const maxDistMeters = (criteria.maxDistance || 50) * 1000;
      pipeline.push({
        $match: {
          'userId.location.coordinates.coordinates': {
            $geoWithin: {
              $centerSphere: [criteria.coordinates, maxDistMeters / 6378100],
            },
          },
        },
      });

      // Compute distance for scoring
      pipeline.push({
        $addFields: {
          _userLocation: '$userId.location.coordinates',
        },
      });
    }

    // City / state fallback filter
    if (!criteria.coordinates && (criteria.city || criteria.state)) {
      const locationMatch = {};
      if (criteria.city) {
        locationMatch.$or = [
          { 'userId.location.city': { $regex: criteria.city, $options: 'i' } },
          { 'serviceAreas.city': { $regex: criteria.city, $options: 'i' } },
        ];
      }
      if (criteria.state) {
        locationMatch['userId.location.state'] = { $regex: criteria.state, $options: 'i' };
      }
      if (Object.keys(locationMatch).length > 0) {
        pipeline.push({ $match: locationMatch });
      }
    }

    // Limit candidates for performance (score top N)
    pipeline.push({ $limit: 200 });

    // Project only needed fields
    pipeline.push({
      $project: {
        userId: 1,
        experience: 1,
        bio: 1,
        headline: 1,
        languages: 1,
        serviceTypes: 1,
        workPreferences: 1,
        hourlyRate: 1,
        dailyRate: 1,
        weeklyRate: 1,
        monthlyRate: 1,
        currency: 1,
        skills: 1,
        certifications: 1,
        serviceRadius: 1,
        serviceAreas: 1,
        availability: 1,
        blockedDates: 1,
        backgroundCheck: 1,
        rating: 1,
        totalReviews: 1,
        ratingBreakdown: 1,
        completedJobs: 1,
        responseRate: 1,
        responseTime: 1,
        featured: 1,
        verified: 1,
        completionPercentage: 1,
        lastActive: 1,
        _userLocation: 1,
      },
    });

    let candidates = await Caregiver.aggregate(pipeline);

    // Self-heal legacy data where active caregiver users are missing caregiver docs.
    if (candidates.length === 0) {
      const healed = await this._healMissingCaregiverProfiles();
      if (healed > 0) {
        candidates = await Caregiver.aggregate(pipeline);
      }
    }

    return candidates;
  }

  /**
   * Create missing caregiver documents for active caregiver users.
   * This runs with a cooldown to avoid repeated expensive checks.
   */
  async _healMissingCaregiverProfiles() {
    if (Date.now() - lastProfileHealAt < PROFILE_HEAL_COOLDOWN_MS) {
      return 0;
    }

    lastProfileHealAt = Date.now();

    const missingUsers = await User.aggregate([
      {
        $match: {
          role: USER_ROLES.CAREGIVER,
          status: USER_STATUS.ACTIVE,
          isEmailVerified: true,
        },
      },
      {
        $lookup: {
          from: 'caregivers',
          localField: '_id',
          foreignField: 'userId',
          as: 'caregiverProfile',
        },
      },
      {
        $match: {
          caregiverProfile: { $size: 0 },
        },
      },
      {
        $project: { _id: 1 },
      },
      {
        $limit: 200,
      },
    ]);

    if (missingUsers.length === 0) {
      return 0;
    }

    try {
      await Caregiver.insertMany(
        missingUsers.map(({ _id }) => ({
          userId: _id,
          languages: [],
          serviceTypes: [],
          skills: [],
          searchable: true,
        })),
        { ordered: false }
      );
    } catch {
      // Ignore duplicate key races; this is a best-effort healing path.
    }

    return missingUsers.length;
  }

  /**
   * Sort scored results by the chosen criterion
   */
  _sortResults(scoredResults, sortBy) {
    switch (sortBy) {
      case 'match_score':
        // Already sorted by matchScore from batchScoreCaregivers
        return scoredResults;

      case 'distance':
        return scoredResults.sort((a, b) => {
          const distA = a.rawScores?.distance || 0;
          const distB = b.rawScores?.distance || 0;
          return distB - distA; // higher distance score = closer
        });

      case 'price_low':
        return scoredResults.sort((a, b) => {
          const rateA = a.caregiver.hourlyRate || Infinity;
          const rateB = b.caregiver.hourlyRate || Infinity;
          return rateA - rateB;
        });

      case 'price_high':
        return scoredResults.sort((a, b) => {
          const rateA = a.caregiver.hourlyRate || 0;
          const rateB = b.caregiver.hourlyRate || 0;
          return rateB - rateA;
        });

      case 'rating':
        return scoredResults.sort((a, b) => {
          return (b.caregiver.rating || 0) - (a.caregiver.rating || 0);
        });

      case 'experience':
        return scoredResults.sort((a, b) => {
          return (b.caregiver.experience || 0) - (a.caregiver.experience || 0);
        });

      case 'reviews':
        return scoredResults.sort((a, b) => {
          return (b.caregiver.totalReviews || 0) - (a.caregiver.totalReviews || 0);
        });

      default:
        return scoredResults;
    }
  }

  /**
   * Format a scored result into the API response shape
   */
  _formatResult(result, rank) {
    const cg = result.caregiver;
    const user = cg.userId || {};

    return {
      rank,
      caregiverId: cg._id,
      userId: user._id,

      // Profile info
      fullName: user.fullName || 'Unknown',
      avatar: user.avatar || null,
      gender: user.gender || null,
      isEmailVerified: user.isEmailVerified || false,
      location: {
        city: user.location?.city || null,
        state: user.location?.state || null,
        country: user.location?.country || null,
      },

      // Professional info
      experience: cg.experience || 0,
      bio: cg.bio || null,
      headline: cg.headline || null,
      languages: cg.languages || [],
      serviceTypes: cg.serviceTypes || [],
      skills: cg.skills || [],
      certifications: (cg.certifications || []).map(c => ({
        name: c.name,
        verified: c.verified || false,
      })),

      // Rates
      hourlyRate: cg.hourlyRate || null,
      dailyRate: cg.dailyRate || null,
      weeklyRate: cg.weeklyRate || null,
      monthlyRate: cg.monthlyRate || null,
      currency: cg.currency || 'USD',

      // Availability
      availability: {
        days: cg.availability?.days || [],
        immediateAvailability: cg.availability?.immediateAvailability || false,
        workPreferences: cg.workPreferences || [],
      },

      // Stats
      rating: cg.rating || 0,
      totalReviews: cg.totalReviews || 0,
      ratingBreakdown: cg.ratingBreakdown || null,
      completedJobs: cg.completedJobs || 0,
      responseRate: cg.responseRate || 0,
      responseTime: cg.responseTime || null,

      // Trust signals
      verified: cg.verified || false,
      featured: cg.featured || false,
      backgroundCheck: cg.backgroundCheck?.status || 'not_started',

      // AI Match data
      matchScore: result.matchScore,
      breakdown: result.breakdown,
      rawScores: result.rawScores,
      reasons: result.reasons,
      category: result.category,
      personalizationBoost: result.personalizationBoost || 0,
    };
  }

  /**
   * Strip sensitive data from criteria for API response
   */
  _sanitizeCriteria(criteria) {
    return {
      serviceTypes: criteria.serviceTypes,
      skills: criteria.skills,
      city: criteria.city || null,
      state: criteria.state || null,
      hasCoordinates: !!criteria.coordinates,
      budgetType: criteria.budgetType || null,
      hasBudgetRange: !!(criteria.budgetMin || criteria.budgetMax),
      minExperience: criteria.minExperience || null,
      urgency: criteria.urgency || null,
      workPreferences: criteria.workPreferences || [],
    };
  }
}

export default new AIMatchService();
