/**
 * AI Match Routes
 * 
 * Routes for AI-powered caregiver matching, search,
 * personalization, and interaction tracking.
 */

import { Router } from 'express';
import { authenticate, optionalAuth } from '../middleware/auth.middleware.js';
import {
  aiSearch,
  getMatchScore,
  getSearchSuggestions,
  trackInteraction,
  getPreferences,
  updatePreferences,
} from '../controllers/aiMatch/aiMatch.controller.js';

const router = Router();

// ─── Public / Optional Auth ────────────────────────────────────────

// POST /api/ai-match/search — AI-powered search (works for both anon & auth)
router.post('/search', optionalAuth, aiSearch);

// GET /api/ai-match/suggestions — Autocomplete suggestions
router.get('/suggestions', getSearchSuggestions);

// ─── Authenticated ─────────────────────────────────────────────────

// GET /api/ai-match/score/:caregiverId — Single caregiver match score
router.get('/score/:caregiverId', authenticate, getMatchScore);

// POST /api/ai-match/track — Track user interaction
router.post('/track', authenticate, trackInteraction);

// GET /api/ai-match/preferences — Get user preferences
router.get('/preferences', authenticate, getPreferences);

// PUT /api/ai-match/preferences — Update user preferences
router.put('/preferences', authenticate, updatePreferences);

export default router;
