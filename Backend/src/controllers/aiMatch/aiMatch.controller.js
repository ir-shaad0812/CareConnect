/**
 * AI Match Controller
 * 
 * Handles HTTP requests for AI-powered caregiver matching.
 * All endpoints return explainable, transparent results.
 */

import { ApiResponse, ApiError, asyncHandler } from '../../utils/apiResponse.js';
import aiMatchService from '../../services/aiMatch.service.js';
import personalizationService from '../../services/personalization.service.js';

/**
 * POST /api/ai-match/search
 * 
 * AI-powered caregiver search with natural language support
 * Supports both authenticated and anonymous users
 */
export const aiSearch = asyncHandler(async (req, res) => {
  const {
    query = '',
    filters = {},
    location = null,
    budget = null,
    serviceTypes = [],
    skills = [],
    sortBy = 'match_score',
    page = 1,
    limit = 12,
  } = req.body;

  // Validate pagination
  const validPage = Math.max(1, parseInt(page) || 1);
  const validLimit = Math.min(50, Math.max(1, parseInt(limit) || 12));

  const result = await aiMatchService.search({
    query,
    userId: req.user?._id || null,
    filters,
    location,
    budget,
    serviceTypes,
    skills,
    sortBy,
    page: validPage,
    limit: validLimit,
  });

  return res.status(200).json(new ApiResponse(200, result, 'Caregivers matched successfully'));
});

/**
 * GET /api/ai-match/score/:caregiverId
 * 
 * Get match score for a specific caregiver (requires auth)
 */
export const getMatchScore = asyncHandler(async (req, res) => {
  const { caregiverId } = req.params;

  if (!caregiverId) {
    throw ApiError.badRequest('Caregiver ID is required');
  }

  const result = await aiMatchService.getMatchScore(caregiverId, req.user._id);

  if (!result) {
    throw ApiError.notFound('Caregiver not found');
  }

  return res.status(200).json(new ApiResponse(200, result, 'Match score computed'));
});

/**
 * GET /api/ai-match/suggestions
 * 
 * Get search suggestions for autocomplete (public)
 */
export const getSearchSuggestions = asyncHandler(async (req, res) => {
  const { q = '' } = req.query;
  const suggestions = aiMatchService.getSuggestions(q);
  return res.status(200).json(new ApiResponse(200, { suggestions }, 'Suggestions retrieved'));
});

/**
 * POST /api/ai-match/track
 * 
 * Track user interaction with a caregiver (requires auth)
 */
export const trackInteraction = asyncHandler(async (req, res) => {
  const { caregiverId, action, metadata = {} } = req.body;

  if (!caregiverId || !action) {
    throw ApiError.badRequest('caregiverId and action are required');
  }

  const validActions = ['viewed', 'shortlisted', 'contacted', 'booked', 'reviewed', 'removed', 'profile_click'];
  if (!validActions.includes(action)) {
    throw ApiError.badRequest(`Invalid action. Must be one of: ${validActions.join(', ')}`);
  }

  await aiMatchService.trackInteraction(req.user._id, caregiverId, action, metadata);

  return res.status(200).json(new ApiResponse(200, null, 'Interaction tracked'));
});

/**
 * GET /api/ai-match/preferences
 * 
 * Get user's AI match preferences (requires auth)
 */
export const getPreferences = asyncHandler(async (req, res) => {
  const prefs = await personalizationService.getUserPreferences(req.user._id);
  return res.status(200).json(new ApiResponse(200, prefs, 'Preferences retrieved'));
});

/**
 * PUT /api/ai-match/preferences
 * 
 * Update user's AI match preferences (requires auth)
 */
export const updatePreferences = asyncHandler(async (req, res) => {
  const updated = await personalizationService.updatePreferences(req.user._id, req.body);
  return res.status(200).json(new ApiResponse(200, updated, 'Preferences updated'));
});
