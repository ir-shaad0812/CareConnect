// ============================================
// AI ROUTES - AI chatbot endpoints
// ============================================

import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middleware/auth.middleware.js';
import aiController from '../controllers/ai.controller.js';
import { validateAIChat, validateObjectId } from '../validators/chat.validator.js';
import { handleValidationErrors } from '../middleware/validation.middleware.js';

const router = express.Router();

// Rate limiter for AI endpoints (20 requests per 15 minutes)
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many AI requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// All routes require authentication
router.use(authenticate);

// Generate AI response
router.post('/chat', aiLimiter, validateAIChat, handleValidationErrors, aiController.chat);

// Get quick suggestions based on user role
router.get('/suggestions', aiController.getSuggestions);

// Clear conversation history
router.delete(
  '/history/:conversationId',
  validateObjectId('conversationId'),
  handleValidationErrors,
  aiController.clearHistory
);

// Check AI availability
router.get('/status', aiController.getStatus);

export default router;
