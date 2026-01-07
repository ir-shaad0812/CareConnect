// ============================================
// WALLET CONTROLLER — Sprint D/E
// GET /api/wallet            → own wallet balances
// GET /api/wallet/ledger     → own ledger entries
// POST /api/wallet/payout    → caregiver payout request
// ============================================

import ledgerService from '../../services/ledger.service.js';
import walletService from '../../services/wallet.service.js';
import { ApiResponse, ApiError } from '../../utils/apiResponse.js';
import { USER_ROLES } from '../../constants/index.js';
import { emitWalletUpdate } from '../../config/socket.js';
import User from '../../models/user.model.js';
import Booking from '../../models/booking.model.js';
import Transaction from '../../models/transaction.model.js';
import { BOOKING_STATUS } from '../../constants/booking.constants.js';
import { BOOKING_PAYMENT_STATUS, TRANSACTION_STATUS, TRANSACTION_TYPE } from '../../constants/payment.constants.js';

/**
 * GET /api/wallet
 * Returns the authenticated user's wallet (created on first access).
 */
export const getMyWallet = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const ownerType = req.user.role === USER_ROLES.CAREGIVER ? 'caregiver' : 'careseeker';
    const walletDoc = await ledgerService.getOrCreateWallet(userId, ownerType);
    const wallet = walletDoc.toObject ? walletDoc.toObject() : walletDoc;

    // Legacy fallback: older gateway flows wrote payment notifications without
    // wallet escrow entries. Derive care-seeker escrow from active paid bookings
    // only when pendingBalance is empty so existing ledger truth stays preferred.
    if (ownerType === 'careseeker' && Number(wallet.pendingBalance || 0) <= 0) {
      const activePaidEscrow = await Booking.aggregate([
        {
          $match: {
            careSeekerId: userId,
            status: {
              $in: [
                BOOKING_STATUS.PAYMENT_PENDING,
                BOOKING_STATUS.CONFIRMED,
                BOOKING_STATUS.ACTIVE,
                BOOKING_STATUS.IN_PROGRESS,
              ],
            },
            paymentStatus: {
              $in: [
                BOOKING_PAYMENT_STATUS.PAYMENT_PENDING,
                BOOKING_PAYMENT_STATUS.PARTIALLY_PAID,
                BOOKING_PAYMENT_STATUS.FULLY_PAID,
              ],
            },
          },
        },
        { $group: { _id: null, totalPaid: { $sum: { $ifNull: ['$amountPaid', 0] } } } },
      ]);

      wallet.pendingBalance = Number(activePaidEscrow[0]?.totalPaid || 0);
    }

    return res.status(200).json(ApiResponse.success(wallet, 'Wallet fetched'));
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/wallet/ledger?limit=50&skip=0
 * Returns paginated ledger entries for the authenticated user.
 */
export const getMyLedger = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const skip = parseInt(req.query.skip) || 0;

    let entries = await ledgerService.getLedgerForUser(userId, { limit, skip });

    // Legacy fallback: if no ledger rows exist for a care-seeker, hydrate
    // recent payment history from completed payment transactions.
    if (
      entries.length === 0 &&
      req.user.role === USER_ROLES.CARESEEKER
    ) {
      const txs = await Transaction.find({
        payerId: userId,
        type: TRANSACTION_TYPE.PAYMENT,
        status: TRANSACTION_STATUS.COMPLETED,
      })
        .sort({ completedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('_id amount currency bookingId createdAt completedAt');

      entries = txs.map((tx) => ({
        _id: tx._id,
        op: 'payment.captured',
        fromWallet: String(userId),
        toWallet: 'platform',
        amount: Number(tx.amount || 0),
        currency: tx.currency || 'NPR',
        bookingId: tx.bookingId,
        transactionId: tx._id,
        description: 'Payment received (legacy history backfill)',
        createdAt: tx.completedAt || tx.createdAt,
      }));
    }

    return res.status(200).json(
      ApiResponse.success({ entries }, 'Ledger fetched')
    );
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/wallet/payout
 * Body: { amount: Number }
 * Only caregivers can withdraw from their own balance.
 */
export const requestPayout = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { amount } = req.body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return next(ApiError.badRequest('Amount must be a positive number'));
    }

    const { request, entry } = await walletService.requestPayout({
      caregiverId: userId,
      amount,
      currency: 'NPR',
      metadata: { requestedBy: String(userId), ip: req.ip },
    });

    // Emit real-time wallet update to the caregiver (both room formats)
    const io = req.app.get('io');
    if (io) {
      const updatedWallet = await ledgerService.getWallet(userId);
      emitWalletUpdate(io, userId, {
        wallet: updatedWallet,
        event: 'payout_requested',
        latestEntry: entry,
      });

      io.emit('admin:payout_request_created', {
        requestId: request._id,
        caregiverId: String(userId),
        amount,
        currency: 'NPR',
      });

      const admins = await User.find({ role: USER_ROLES.ADMIN }).select('_id');
      admins.forEach((admin) => {
        io.to(`user:${admin._id}`).emit('notification', {
          type: 'payout_request_created',
          title: 'New Payout Request',
          message: `A caregiver requested withdrawal of NPR ${amount.toFixed(2)}.`,
          data: {
            requestId: request._id,
            caregiverId: String(userId),
          },
        });
      });
    }

    return res.status(200).json(
      ApiResponse.success({ request, entry }, 'Payout request submitted for admin approval')
    );
  } catch (err) {
    // Surface balance errors as 400 rather than 500
    if (
      err.message.includes('Insufficient balance') ||
      err.message.includes('Payout amount must be')
    ) {
      return next(ApiError.badRequest(err.message));
    }
    next(err);
  }
};

/**
 * GET /api/wallet/payout-requests
 * Returns caregiver's own payout requests.
 */
export const getMyPayoutRequests = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = parseInt(req.query.skip) || 0;

    const data = await walletService.getPayoutRequestsForCaregiver(userId, { limit, skip });
    return res.status(200).json(ApiResponse.success(data, 'Payout requests fetched'));
  } catch (err) {
    next(err);
  }
};
