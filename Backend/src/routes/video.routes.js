// ============================================
// VIDEO CALL ROUTES
// WebRTC-based audio/video call API endpoints.
// Signaling (offer/answer/ICE) happens via
// Socket.IO — these REST endpoints handle
// configuration and call metadata only.
// ============================================

import express from 'express';
import videoController from '../controllers/video/video.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { USER_ROLES } from '../constants/index.js';
import { callInitLimiter } from '../middleware/rateLimiter.middleware.js';

const router = express.Router();

// All video routes require authentication
router.use(authenticate);

/**
 * GET /api/video/config
 * Returns WebRTC ICE server configuration (STUN/TURN).
 */
router.get(
  '/config',
  authorize(USER_ROLES.CAREGIVER, USER_ROLES.CARESEEKER, USER_ROLES.ADMIN),
  videoController.getConfig,
);

/**
 * GET /api/video/status
 * Health check for the call subsystem.
 */
router.get(
  '/status',
  authorize(USER_ROLES.CAREGIVER, USER_ROLES.CARESEEKER, USER_ROLES.ADMIN),
  videoController.getStatus,
);

/**
 * POST /api/video/call/init
 * Validate call access and return callId + ICE config.
 */
router.post(
  '/call/init',
  authorize(USER_ROLES.CAREGIVER, USER_ROLES.CARESEEKER),
  callInitLimiter,
  videoController.initializeCall,
);

/**
 * GET /api/video/call/:callId
 * Retrieve metadata for an active or recent call.
 */
router.get(
  '/call/:callId',
  authorize(USER_ROLES.CAREGIVER, USER_ROLES.CARESEEKER),
  videoController.getCallDetails,
);

export default router;
