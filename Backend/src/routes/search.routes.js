// ============================================
// SEARCH ROUTES
// API routes for caregiver search and discovery
// ============================================

import express from 'express';
import searchController from '../controllers/search/search.controller.js';
import { optionalAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

// Optional authentication for personalized results
router.use(optionalAuth);

// ============================================
// SEARCH ROUTES
// ============================================

/**
 * @route   GET /api/search/caregivers
 * @desc    Search caregivers with filters
 * @access  Public (with optional auth for personalization)
 * @query   serviceType, serviceTypes, city, state, country,
 *          minPrice, maxPrice, priceRange, rateType,
 *          minExperience, maxExperience, experienceLevel,
 *          minRating, ratingRange,
 *          workPreferences, availableDays, immediatelyAvailable,
 *          languages, gender, verified, backgroundCheck,
 *          skills, certifications,
 *          lat, lng, maxDistance,
 *          query, page, limit, sortBy
 */
router.get('/caregivers', searchController.searchCaregivers);

/**
 * @route   GET /api/search/featured
 * @desc    Get featured caregivers
 * @access  Public
 */
router.get('/featured', searchController.getFeaturedCaregivers);

/**
 * @route   GET /api/search/top-rated
 * @desc    Get top rated caregivers
 * @access  Public
 */
router.get('/top-rated', searchController.getTopRatedCaregivers);

/**
 * @route   GET /api/search/recently-active
 * @desc    Get recently active caregivers
 * @access  Public
 */
router.get('/recently-active', searchController.getRecentlyActiveCaregivers);

/**
 * @route   GET /api/search/by-service/:serviceType
 * @desc    Get caregivers by service type
 * @access  Public
 */
router.get('/by-service/:serviceType', searchController.getCaregiversByServiceType);

/**
 * @route   GET /api/search/caregivers/:caregiverId/preview
 * @desc    Get caregiver profile preview
 * @access  Public
 */
router.get('/caregivers/:caregiverId/preview', searchController.getCaregiverPreview);

/**
 * @route   GET /api/search/suggestions
 * @desc    Get search suggestions (autocomplete)
 * @access  Public
 */
router.get('/suggestions', searchController.getSearchSuggestions);

/**
 * @route   GET /api/search/filter-options
 * @desc    Get available filter options
 * @access  Public
 */
router.get('/filter-options', searchController.getFilterOptions);

/**
 * @route   GET /api/search/budget-match
 * @desc    Match caregivers by care-seeker budget (with fallback if no match)
 * @access  Public
 * @query   minBudget, maxBudget, city, rateType, page, limit
 */
router.get('/budget-match', searchController.budgetMatch);

/**
 * @route   GET /api/search/recommended
 * @desc    Get admin-recommended caregivers
 * @access  Public
 */
router.get('/recommended', searchController.getRecommendedCaregivers);

/**
 * @route   GET /api/search/pricing
 * @desc    Get location-based pricing for a city
 * @access  Public
 * @query   city
 */
router.get('/pricing', searchController.getPricingForCity);

export default router;
