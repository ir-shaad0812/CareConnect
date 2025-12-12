// ============================================
// WALLET ROUTES — Sprint D/E
// Base: /api/wallet
// ============================================

import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { USER_ROLES } from '../constants/index.js';
import {
  getMyWallet,
  getMyLedger,
  requestPayout,
  getMyPayoutRequests,
} from '../controllers/wallet/wallet.controller.js';

const router = Router();

// All wallet routes require authentication
router.use(authenticate);

// GET /api/wallet — own wallet balances (any authenticated user)
router.get('/', getMyWallet);

// GET /api/wallet/ledger — own ledger history (any authenticated user)
router.get('/ledger', getMyLedger);

// POST /api/wallet/payout — caregivers only
router.post('/payout', authorize(USER_ROLES.CAREGIVER), requestPayout);

// GET /api/wallet/payout-requests — caregivers only
router.get('/payout-requests', authorize(USER_ROLES.CAREGIVER), getMyPayoutRequests);

export default router;
