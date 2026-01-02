// ============================================
// SEARCH CONTROLLER
// HTTP API endpoints for caregiver search
// ============================================

import searchService from '../../services/search.service.js';
import { ApiResponse, asyncHandler } from '../../utils/apiResponse.js';
import { SEARCH_PAGINATION, SEARCH_SUCCESS } from '../../constants/search.constants.js';

/**
 * Search caregivers with filters
 * GET /api/search/caregivers
 */
export const searchCaregivers = asyncHandler(async (req, res) => {
  const {
    // Basic filters
    serviceType,
    serviceTypes,
    city,
    state,
    country,
    
    // Price filters
    minPrice,
    maxPrice,
    priceRange,
    rateType,
    
    // Experience filters
    minExperience,
    maxExperience,
    experienceLevel,
    
    // Rating filters
    minRating,
    ratingRange,
    
    // Availability filters
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
    lat,
    lng,
    maxDistance,
    
    // Text search
    query,
    
    // Pagination & sorting
    page,
    limit,
    sortBy,
  } = req.query;

  // Parse array parameters
  const parseArray = (value) => {
    if (!value) return undefined;
    if (Array.isArray(value)) return value;
    return value.split(',').map(v => v.trim());
  };

  // Build filters object
  const filters = {
    serviceType,
    serviceTypes: parseArray(serviceTypes),
    city,
    state,
    country,
    minPrice: minPrice ? parseFloat(minPrice) : undefined,
    maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
    priceRange,
    rateType: rateType || 'hourly',
    minExperience: minExperience ? parseInt(minExperience) : undefined,
    maxExperience: maxExperience ? parseInt(maxExperience) : undefined,
    experienceLevel,
    minRating: minRating ? parseFloat(minRating) : undefined,
    ratingRange,
    workPreferences: parseArray(workPreferences),
    availableDays: parseArray(availableDays),
    immediatelyAvailable: immediatelyAvailable === 'true',
    languages: parseArray(languages),
    gender,
    verified: verified === 'true',
    backgroundCheck: backgroundCheck === 'true',
    skills: parseArray(skills),
    certifications: parseArray(certifications),
    coordinates: lat && lng ? [parseFloat(lng), parseFloat(lat)] : undefined,
    maxDistance: maxDistance ? parseFloat(maxDistance) : undefined,
    query,
  };

  // Build options object
  const options = {
    page: parseInt(page) || SEARCH_PAGINATION.DEFAULT_PAGE,
    limit: Math.min(
      parseInt(limit) || SEARCH_PAGINATION.DEFAULT_LIMIT,
      SEARCH_PAGINATION.MAX_LIMIT
    ),
    sortBy: sortBy || 'relevance',
  };

  const result = await searchService.searchCaregivers(filters, options);

  res.status(200).json(ApiResponse.success(result, SEARCH_SUCCESS.RESULTS_FOUND));
});

/**
 * Get featured caregivers
 * GET /api/search/featured
 */
export const getFeaturedCaregivers = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 6, 20);
  
  const caregivers = await searchService.getFeaturedCaregivers(limit);

  res.status(200).json(ApiResponse.success({ caregivers }, 'Featured caregivers retrieved'));
});

/**
 * Get top rated caregivers
 * GET /api/search/top-rated
 */
export const getTopRatedCaregivers = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 10, 20);
  
  const caregivers = await searchService.getTopRatedCaregivers(limit);

  res.status(200).json(ApiResponse.success({ caregivers }, 'Top rated caregivers retrieved'));
});

/**
 * Get recently active caregivers
 * GET /api/search/recently-active
 */
export const getRecentlyActiveCaregivers = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 10, 20);
  
  const caregivers = await searchService.getRecentlyActiveCaregivers(limit);

  res.status(200).json(ApiResponse.success({ caregivers }, 'Recently active caregivers retrieved'));
});

/**
 * Get caregivers by service type
 * GET /api/search/by-service/:serviceType
 */
export const getCaregiversByServiceType = asyncHandler(async (req, res) => {
  const { serviceType } = req.params;
  const limit = Math.min(parseInt(req.query.limit) || 12, 50);
  
  const caregivers = await searchService.getCaregiversByServiceType(serviceType, limit);

  res.status(200).json(ApiResponse.success({ caregivers }, `Caregivers for ${serviceType} retrieved`));
});

/**
 * Get caregiver preview
 * GET /api/search/caregivers/:caregiverId/preview
 */
export const getCaregiverPreview = asyncHandler(async (req, res) => {
  const { caregiverId } = req.params;
  
  const caregiver = await searchService.getCaregiverPreview(caregiverId);

  res.status(200).json(ApiResponse.success({ caregiver }, 'Caregiver preview retrieved'));
});

/**
 * Get search suggestions (autocomplete)
 * GET /api/search/suggestions
 */
export const getSearchSuggestions = asyncHandler(async (req, res) => {
  const { query, type } = req.query;
  
  if (!query || query.length < 2) {
    return res.status(200).json(ApiResponse.success({ suggestions: {} }, 'Query too short'));
  }
  
  const suggestions = await searchService.getSearchSuggestions(query, type);

  res.status(200).json(ApiResponse.success({ suggestions }, 'Suggestions retrieved'));
});

/**
 * Get filter options
 * GET /api/search/filter-options
 */
export const getFilterOptions = asyncHandler(async (req, res) => {
  const options = await searchService.getFilterOptions();
  res.status(200).json(ApiResponse.success({ options }, 'Filter options retrieved'));
});

/**
 * Budget match caregivers
 * GET /api/search/budget-match
 */
export const budgetMatch = asyncHandler(async (req, res) => {
  const { minBudget, maxBudget, city, rateType = 'hourly', page = 1, limit = 20 } = req.query;
  const result = await searchService.matchByBudget({
    minBudget: minBudget ? parseFloat(minBudget) : undefined,
    maxBudget: maxBudget ? parseFloat(maxBudget) : undefined,
    city, rateType,
    page: parseInt(page),
    limit: Math.min(parseInt(limit), 50),
  });
  res.status(200).json(ApiResponse.success(result, result.message || 'Budget match results'));
});

/**
 * Get admin-recommended caregivers
 * GET /api/search/recommended
 */
export const getRecommendedCaregivers = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 6, 20);
  const caregivers = await searchService.getRecommendedCaregivers(limit);
  res.status(200).json(ApiResponse.success({ caregivers }, 'Recommended caregivers retrieved'));
});

/**
 * Get pricing for a city
 * GET /api/search/pricing
 */
import { getPricingForCity as _getPricing, LOCATION_PRICING } from '../../constants/pricing.constants.js';

export const getPricingForCity = asyncHandler(async (req, res) => {
  const { city } = req.query;
  const pricing = city ? _getPricing(city) : LOCATION_PRICING;
  res.status(200).json(ApiResponse.success({ pricing }, 'Pricing fetched'));
});

export default {
  searchCaregivers,
  getFeaturedCaregivers,
  getTopRatedCaregivers,
  getRecentlyActiveCaregivers,
  getCaregiversByServiceType,
  getCaregiverPreview,
  getSearchSuggestions,
  getFilterOptions,
  budgetMatch,
  getRecommendedCaregivers,
  getPricingForCity,
};
