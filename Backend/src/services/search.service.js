// ============================================
// SEARCH SERVICE
// Business logic for caregiver search and discovery
// ============================================

import User from '../models/user.model.js';
import Caregiver from '../models/caregiver.model.js';
import { USER_ROLES, USER_STATUS } from '../constants/index.js';
import {
  SEARCH_SORT_OPTIONS,
  SEARCH_DEFAULTS,
  EXPERIENCE_LEVELS,
  RATING_RANGES,
  PRICE_RANGES,
  DISTANCE_RANGES,
  RELEVANCE_WEIGHTS,
} from '../constants/search.constants.js';
import { escapeRegExp, sanitizeSearchQuery } from '../utils/security.utils.js';

class SearchService {
  /**
   * Search caregivers with filters
   */
  async searchCaregivers(filters = {}, options = {}) {
    const {
      // Basic filters
      serviceType,
      serviceTypes,
      location,
      city,
      state,
      country,
      
      // Price filters
      minPrice,
      maxPrice,
      priceRange,
      rateType = 'hourly',
      
      // Experience filters
      minExperience,
      maxExperience,
      experienceLevel,
      
      // Rating filters
      minRating,
      ratingRange,
      
      // Availability filters
      availability,
      workPreferences,
      availableDays,
      immediatelyAvailable,
      
      // Additional filters
      languages,
      gender,
      verified,
      backgroundCheck,
      skills,
      certifications,
      
      // Location-based search
      coordinates, // [longitude, latitude]
      maxDistance, // in km
      
      // Text search
      query,
    } = filters;

    const {
      page = SEARCH_DEFAULTS.PAGE,
      limit = SEARCH_DEFAULTS.LIMIT,
      sortBy = SEARCH_DEFAULTS.SORT_BY,
    } = options;

    // Build aggregation pipeline
    const pipeline = [];

    // ============================================
    // STAGE 1: Lookup User Data
    // ============================================
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user',
      },
    });

    pipeline.push({
      $unwind: '$user',
    });

    // ============================================
    // STAGE 2: Match Active Users
    // ============================================
    // Hard platform rule: only active + verified caregivers with complete profiles
    // appear in browse. user.status === ACTIVE means admin-approved.
    const matchStage = {
      'user.status': USER_STATUS.ACTIVE,
      'user.role': USER_ROLES.CAREGIVER,
      searchable: { $ne: false },
      verified: true,
    };

    // Service type filter
    if (serviceType) {
      matchStage.serviceTypes = serviceType;
    }
    if (serviceTypes && serviceTypes.length > 0) {
      matchStage.serviceTypes = { $in: serviceTypes };
    }

    // Location filters - sanitize user input to prevent NoSQL injection
    if (city) {
      const safeCity = escapeRegExp(city);
      matchStage.$or = [
        { 'serviceAreas.city': { $regex: safeCity, $options: 'i' } },
        { 'user.location.city': { $regex: safeCity, $options: 'i' } },
      ];
    }
    if (state) {
      const safeState = escapeRegExp(state);
      matchStage['user.location.state'] = { $regex: safeState, $options: 'i' };
    }
    if (country) {
      const safeCountry = escapeRegExp(country);
      matchStage['user.location.country'] = { $regex: safeCountry, $options: 'i' };
    }

    // Price range filter
    if (priceRange && PRICE_RANGES[priceRange.toUpperCase()]) {
      const range = PRICE_RANGES[priceRange.toUpperCase()];
      const rateField = `${rateType}Rate`;
      matchStage[rateField] = {};
      if (range.min !== undefined) matchStage[rateField].$gte = range.min;
      if (range.max !== null) matchStage[rateField].$lte = range.max;
    } else {
      const rateField = `${rateType}Rate`;
      if (minPrice !== undefined || maxPrice !== undefined) {
        matchStage[rateField] = {};
        if (minPrice !== undefined) matchStage[rateField].$gte = parseFloat(minPrice);
        if (maxPrice !== undefined) matchStage[rateField].$lte = parseFloat(maxPrice);
      }
    }

    // Experience filter
    if (experienceLevel && EXPERIENCE_LEVELS[experienceLevel.toUpperCase()]) {
      const level = EXPERIENCE_LEVELS[experienceLevel.toUpperCase()];
      matchStage.experience = {};
      if (level.min !== undefined) matchStage.experience.$gte = level.min;
      if (level.max !== null) matchStage.experience.$lte = level.max;
    } else {
      if (minExperience !== undefined || maxExperience !== undefined) {
        matchStage.experience = {};
        if (minExperience !== undefined) matchStage.experience.$gte = parseInt(minExperience);
        if (maxExperience !== undefined) matchStage.experience.$lte = parseInt(maxExperience);
      }
    }

    // Rating filter
    if (ratingRange && RATING_RANGES[ratingRange.toUpperCase()]) {
      const range = RATING_RANGES[ratingRange.toUpperCase()];
      matchStage.rating = { $gte: range.min };
    } else if (minRating !== undefined) {
      matchStage.rating = { $gte: parseFloat(minRating) };
    }

    // Work preferences filter
    if (workPreferences && workPreferences.length > 0) {
      matchStage.workPreferences = { $in: workPreferences };
    }

    // Available days filter
    if (availableDays && availableDays.length > 0) {
      matchStage['availability.days'] = { $all: availableDays };
    }

    // Immediate availability filter
    if (immediatelyAvailable === true || immediatelyAvailable === 'true') {
      matchStage['availability.immediateAvailability'] = true;
    }

    // Languages filter
    if (languages && languages.length > 0) {
      matchStage.languages = { $in: languages };
    }

    // Gender filter
    if (gender) {
      matchStage['user.gender'] = gender;
    }

    // Verified filter
    if (verified === true || verified === 'true') {
      matchStage.verified = true;
    }

    // Background check filter
    if (backgroundCheck === true || backgroundCheck === 'true') {
      matchStage['backgroundCheck.status'] = 'passed';
    }

    // Skills filter
    if (skills && skills.length > 0) {
      matchStage.skills = { $in: skills };
    }

    // Certifications filter
    if (certifications && certifications.length > 0) {
      matchStage['certifications.name'] = { $in: certifications };
    }

    // Text search (name, bio, headline)
    if (query && query.trim()) {
      const searchRegex = { $regex: query.trim(), $options: 'i' };
      matchStage.$or = [
        { 'user.fullName': searchRegex },
        { bio: searchRegex },
        { headline: searchRegex },
        { skills: searchRegex },
      ];
    }

    pipeline.push({ $match: matchStage });

    // ============================================
    // STAGE 3: Geospatial Search (if coordinates provided)
    // ============================================
    if (coordinates && coordinates.length === 2) {
      const maxDist = (maxDistance || SEARCH_DEFAULTS.MAX_DISTANCE) * 1000; // Convert km to meters
      
      pipeline.unshift({
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: coordinates.map(Number),
          },
          distanceField: 'distance',
          maxDistance: maxDist,
          spherical: true,
          query: matchStage,
        },
      });
      
      // Remove the $match stage since $geoNear includes the query
      pipeline.splice(pipeline.findIndex(stage => stage.$match === matchStage), 1);
    }

    // ============================================
    // STAGE 4: Add Computed Fields
    // ============================================
    pipeline.push({
      $addFields: {
        relevanceScore: {
          $add: [
            { $multiply: [{ $ifNull: ['$rating', 0] }, RELEVANCE_WEIGHTS.RATING_MULTIPLIER] },
            { $multiply: [{ $ifNull: ['$completedJobs', 0] }, RELEVANCE_WEIGHTS.COMPLETED_JOBS_MULTIPLIER] },
            { $cond: [{ $eq: ['$verified', true] }, RELEVANCE_WEIGHTS.VERIFIED_BONUS, 0] },
            { $cond: [{ $eq: ['$backgroundCheck.status', 'passed'] }, RELEVANCE_WEIGHTS.BACKGROUND_CHECK_BONUS, 0] },
            { $cond: [{ $eq: ['$featured', true] }, RELEVANCE_WEIGHTS.FEATURED_BONUS, 0] },
            { $cond: [{ $eq: ['$isRecommended', true] }, 15, 0] },
            { $multiply: [{ $ifNull: ['$responseRate', 0] }, RELEVANCE_WEIGHTS.RESPONSE_RATE_MULTIPLIER] },
          ],
        },
      },
    });

    // ============================================
    // STAGE 5: Sort
    // ============================================
    let sortStage = {};
    switch (sortBy) {
      case SEARCH_SORT_OPTIONS.RATING_HIGH:
        sortStage = { rating: -1, totalReviews: -1 };
        break;
      case SEARCH_SORT_OPTIONS.RATING_LOW:
        sortStage = { rating: 1 };
        break;
      case SEARCH_SORT_OPTIONS.PRICE_LOW:
        sortStage = { [`${rateType}Rate`]: 1 };
        break;
      case SEARCH_SORT_OPTIONS.PRICE_HIGH:
        sortStage = { [`${rateType}Rate`]: -1 };
        break;
      case SEARCH_SORT_OPTIONS.EXPERIENCE_HIGH:
        sortStage = { experience: -1 };
        break;
      case SEARCH_SORT_OPTIONS.EXPERIENCE_LOW:
        sortStage = { experience: 1 };
        break;
      case SEARCH_SORT_OPTIONS.NEWEST:
        sortStage = { createdAt: -1 };
        break;
      case SEARCH_SORT_OPTIONS.DISTANCE:
        if (coordinates) {
          sortStage = { distance: 1 };
        } else {
          sortStage = { relevanceScore: -1 };
        }
        break;
      case SEARCH_SORT_OPTIONS.AVAILABILITY:
        sortStage = { 'availability.immediateAvailability': -1, lastActive: -1 };
        break;
      case SEARCH_SORT_OPTIONS.RELEVANCE:
      default:
        sortStage = { featured: -1, relevanceScore: -1, rating: -1 };
    }
    pipeline.push({ $sort: sortStage });

    // ============================================
    // STAGE 6: Facet for pagination and count
    // ============================================
    const skip = (page - 1) * limit;
    
    pipeline.push({
      $facet: {
        results: [
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              _id: 1,
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
              certifications: { $slice: ['$certifications', 3] },
              serviceRadius: 1,
              serviceAreas: 1,
              availability: 1,
              backgroundCheck: { status: 1 },
              rating: 1,
              totalReviews: 1,
              ratingBreakdown: 1,
              completedJobs: 1,
              responseRate: 1,
              responseTime: 1,
              featured: 1,
              verified: 1,
              isRecommended: 1,
              recommendedAt: 1,
              completionPercentage: 1,
              lastActive: 1,
              distance: 1,
              relevanceScore: 1,
              user: {
                _id: 1,
                fullName: 1,
                avatar: 1,
                gender: 1,
                location: 1,
              },
            },
          },
        ],
        totalCount: [{ $count: 'count' }],
      },
    });

    // Execute aggregation
    const [result] = await Caregiver.aggregate(pipeline);
    
    const caregivers = result.results || [];
    const totalCount = result.totalCount[0]?.count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    return {
      caregivers,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasMore: page < totalPages,
      },
      filters: {
        applied: Object.keys(filters).filter(key => filters[key] !== undefined).length,
        sortBy,
      },
    };
  }

  /**
   * Get featured caregivers
   */
  async getFeaturedCaregivers(limit = 6) {
    const pipeline = [
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $match: {
          'user.status': USER_STATUS.ACTIVE,
          featured: true,
          searchable: { $ne: false },
        },
      },
      { $sort: { rating: -1, totalReviews: -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          userId: 1,
          experience: 1,
          headline: 1,
          serviceTypes: 1,
          hourlyRate: 1,
          currency: 1,
          rating: 1,
          totalReviews: 1,
          verified: 1,
          completedJobs: 1,
          user: {
            _id: 1,
            fullName: 1,
            avatar: 1,
            location: 1,
          },
        },
      },
    ];

    return Caregiver.aggregate(pipeline);
  }

  /**
   * Get top rated caregivers
   */
  async getTopRatedCaregivers(limit = 10) {
    const pipeline = [
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $match: {
          'user.status': USER_STATUS.ACTIVE,
          rating: { $gte: 4.0 },
          totalReviews: { $gte: 5 },
          searchable: { $ne: false },
        },
      },
      { $sort: { rating: -1, totalReviews: -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          userId: 1,
          experience: 1,
          headline: 1,
          serviceTypes: 1,
          hourlyRate: 1,
          currency: 1,
          rating: 1,
          totalReviews: 1,
          ratingBreakdown: 1,
          verified: 1,
          completedJobs: 1,
          user: {
            _id: 1,
            fullName: 1,
            avatar: 1,
            location: 1,
          },
        },
      },
    ];

    return Caregiver.aggregate(pipeline);
  }

  /**
   * Get recently active caregivers
   */
  async getRecentlyActiveCaregivers(limit = 10) {
    const pipeline = [
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $match: {
          'user.status': USER_STATUS.ACTIVE,
          lastActive: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Active in last 7 days
          searchable: { $ne: false },
        },
      },
      { $sort: { lastActive: -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          userId: 1,
          experience: 1,
          headline: 1,
          serviceTypes: 1,
          hourlyRate: 1,
          currency: 1,
          rating: 1,
          totalReviews: 1,
          verified: 1,
          lastActive: 1,
          user: {
            _id: 1,
            fullName: 1,
            avatar: 1,
            location: 1,
          },
        },
      },
    ];

    return Caregiver.aggregate(pipeline);
  }

  /**
   * Get caregivers by service type
   */
  async getCaregiversByServiceType(serviceType, limit = 12) {
    const pipeline = [
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $match: {
          'user.status': USER_STATUS.ACTIVE,
          serviceTypes: serviceType,
          searchable: { $ne: false },
        },
      },
      { $sort: { rating: -1, featured: -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          userId: 1,
          experience: 1,
          headline: 1,
          serviceTypes: 1,
          hourlyRate: 1,
          currency: 1,
          rating: 1,
          totalReviews: 1,
          verified: 1,
          user: {
            _id: 1,
            fullName: 1,
            avatar: 1,
            location: 1,
          },
        },
      },
    ];

    return Caregiver.aggregate(pipeline);
  }

  /**
   * Get caregiver profile preview (for search results)
   */
  async getCaregiverPreview(caregiverId) {
    const caregiver = await Caregiver.findById(caregiverId)
      .populate('userId', 'fullName avatar gender location')
      .select(
        'experience bio headline languages serviceTypes workPreferences ' +
        'hourlyRate dailyRate currency skills certifications serviceRadius ' +
        'availability backgroundCheck rating totalReviews ratingBreakdown ' +
        'completedJobs responseRate responseTime verified featured'
      )
      .lean();

    if (!caregiver) {
      throw new Error('Caregiver not found');
    }

    // Increment profile views
    await Caregiver.findByIdAndUpdate(caregiverId, {
      $inc: { profileViews: 1 },
    });

    return caregiver;
  }

  /**
   * Get search suggestions (autocomplete)
   */
  async getSearchSuggestions(query, type = 'all') {
    const suggestions = {
      caregivers: [],
      locations: [],
      services: [],
      skills: [],
    };

    if (!query || query.length < 2) {
      return suggestions;
    }

    const searchRegex = { $regex: query, $options: 'i' };

    // Search caregivers by name
    if (type === 'all' || type === 'caregivers') {
      const caregivers = await Caregiver.aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user',
          },
        },
        { $unwind: '$user' },
        {
          $match: {
            'user.status': USER_STATUS.ACTIVE,
            'user.fullName': searchRegex,
            searchable: { $ne: false },
          },
        },
        { $limit: 5 },
        {
          $project: {
            _id: 1,
            userId: 1,
            'user.fullName': 1,
            'user.avatar': 1,
            serviceTypes: 1,
            rating: 1,
          },
        },
      ]);
      suggestions.caregivers = caregivers;
    }

    // Search locations
    if (type === 'all' || type === 'locations') {
      const locations = await User.distinct('location.city', {
        status: USER_STATUS.ACTIVE,
        role: USER_ROLES.CAREGIVER,
        'location.city': searchRegex,
      });
      suggestions.locations = locations.slice(0, 5);
    }

    // Search skills
    if (type === 'all' || type === 'skills') {
      const skills = await Caregiver.distinct('skills', {
        skills: searchRegex,
      });
      suggestions.skills = skills.slice(0, 5);
    }

    return suggestions;
  }

  /**
   * Get filter options (for dynamic filters)
   */
  async getFilterOptions() {
    // Get available service types
    const serviceTypes = await Caregiver.distinct('serviceTypes', {
      searchable: { $ne: false },
    });

    // Get available languages
    const languages = await Caregiver.distinct('languages', {
      searchable: { $ne: false },
    });

    // Get available locations
    const locations = await User.aggregate([
      {
        $match: {
          status: USER_STATUS.ACTIVE,
          role: USER_ROLES.CAREGIVER,
          'location.city': { $exists: true, $ne: '' },
        },
      },
      {
        $group: {
          _id: '$location.city',
          state: { $first: '$location.state' },
          country: { $first: '$location.country' },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 50 },
    ]);

    // Get price ranges
    const priceStats = await Caregiver.aggregate([
      { $match: { hourlyRate: { $exists: true, $gt: 0 } } },
      {
        $group: {
          _id: null,
          minPrice: { $min: '$hourlyRate' },
          maxPrice: { $max: '$hourlyRate' },
          avgPrice: { $avg: '$hourlyRate' },
        },
      },
    ]);

    // Get skills
    const skills = await Caregiver.distinct('skills', {
      searchable: { $ne: false },
    });

    return {
      serviceTypes,
      languages,
      locations: locations.map(l => ({
        city: l._id,
        state: l.state,
        country: l.country,
        count: l.count,
      })),
      priceStats: priceStats[0] || { minPrice: 0, maxPrice: 100, avgPrice: 25 },
      skills: skills.slice(0, 50),
      experienceLevels: Object.entries(EXPERIENCE_LEVELS).map(([key, value]) => ({
        key,
        ...value,
      })),
      ratingRanges: Object.entries(RATING_RANGES).map(([key, value]) => ({
        key,
        ...value,
      })),
      priceRanges: Object.entries(PRICE_RANGES).map(([key, value]) => ({
        key,
        ...value,
      })),
    };
  }

  /**
   * Budget matching — find caregivers within a care-seeker's min/max budget.
   * If no caregivers match, returns ALL caregivers with a noMatch flag so
   * the frontend can display a fallback message (never an empty screen).
   */
  async matchByBudget({ minBudget, maxBudget, city, rateType = 'hourly', page = 1, limit = 20 } = {}) {
    const rateField = `${rateType}Rate`;
    const filters = { city };

    // Attempt 1: strict budget match
    if (minBudget !== undefined) filters.minPrice = minBudget;
    if (maxBudget !== undefined) filters.maxPrice = maxBudget;

    const matched = await this.searchCaregivers(filters, { page, limit, sortBy: 'relevance' });

    if (matched.caregivers.length > 0) {
      return { ...matched, budgetMatched: true, message: null };
    }

    // Fallback: show all caregivers with a clear message
    const fallback = await this.searchCaregivers({ city }, { page, limit, sortBy: 'relevance' });
    return {
      ...fallback,
      budgetMatched: false,
      message: `No caregivers found within Rs. ${minBudget ?? 0}–${maxBudget ?? '∞'}/hr. Showing all available caregivers in ${city || 'your area'}.`,
    };
  }

  /**
   * Get recommended caregivers (admin-badged).
   */
  async getRecommendedCaregivers(limit = 6) {
    const pipeline = [
      { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      {
        $match: {
          'user.status': USER_STATUS.ACTIVE,
          isRecommended: true,
          searchable: { $ne: false },
          verified: true,
        },
      },
      { $sort: { recommendedAt: -1, rating: -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 1, userId: 1, experience: 1, headline: 1, serviceTypes: 1,
          hourlyRate: 1, currency: 1, rating: 1, totalReviews: 1,
          verified: 1, isRecommended: 1, recommendedAt: 1, completedJobs: 1,
          user: { _id: 1, fullName: 1, avatar: 1, location: 1 },
        },
      },
    ];
    return Caregiver.aggregate(pipeline);
  }
}

export default new SearchService();
