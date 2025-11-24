// ============================================
// DISPUTE ROUTES
// Ticket-based dispute resolution system
// ============================================

import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { USER_ROLES } from '../constants/index.js';
import {
  createDispute,
  getUserDisputes,
  getDisputeById,
  addMessage,
  addEvidence,
  adminGetDisputes,
  adminUpdateStatus,
  adminResolve,
  adminSendMessage,
  adminAddNote,
  getDisputeStats,
} from '../controllers/dispute/dispute.controller.js';

const router = Router();

router.use(authenticate);

// User routes
router.post('/', authorize(USER_ROLES.CAREGIVER, USER_ROLES.CARESEEKER), createDispute);
router.get('/', authorize(USER_ROLES.CAREGIVER, USER_ROLES.CARESEEKER), getUserDisputes);
router.get('/:disputeId', getDisputeById);
router.post('/:disputeId/message', authorize(USER_ROLES.CAREGIVER, USER_ROLES.CARESEEKER), addMessage);
router.post('/:disputeId/evidence', authorize(USER_ROLES.CAREGIVER, USER_ROLES.CARESEEKER), addEvidence);

// Admin routes
router.get('/admin/all', authorize(USER_ROLES.ADMIN), adminGetDisputes);
router.get('/admin/stats', authorize(USER_ROLES.ADMIN), getDisputeStats);
router.patch('/admin/:disputeId/status', authorize(USER_ROLES.ADMIN), adminUpdateStatus);
router.post('/admin/:disputeId/resolve', authorize(USER_ROLES.ADMIN), adminResolve);
router.post('/admin/:disputeId/message', authorize(USER_ROLES.ADMIN), adminSendMessage);
router.post('/admin/:disputeId/note', authorize(USER_ROLES.ADMIN), adminAddNote);

export default router;
