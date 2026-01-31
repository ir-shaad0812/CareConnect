// ============================================
// WALLET SERVICE — Sprint D/E
// Thin façade over ledger.service for wallet
// queries and payout business logic.
// All balance mutations go through ledger.service.
// ============================================

import Wallet from '../models/wallet.model.js';
import Ledger, { LEDGER_OP } from '../models/ledger.model.js';
import PayoutRequest from '../models/payoutRequest.model.js';
import ledgerService from './ledger.service.js';
import { USER_ROLES } from '../constants/index.js';

class WalletService {
  /**
   * Get or create a wallet for any user.
   * ownerType derived from user.role if not provided.
   */
  async getOrCreate(userId, ownerType) {
    return ledgerService.getOrCreateWallet(String(userId), ownerType);
  }

  /**
   * Return wallet for the given user, creating if absent.
   */
  async getWalletForUser(user) {
    const ownerType =
      user.role === USER_ROLES.CAREGIVER ? 'caregiver' :
      user.role === USER_ROLES.CARESEEKER ? 'careseeker' : 'careseeker';
    return this.getOrCreate(user._id, ownerType);
  }

  /**
   * Paginated ledger history for a user.
   * Returns { entries, total, hasMore }.
   */
  async getLedger(userId, { limit = 50, skip = 0 } = {}) {
    const query = {
      $or: [
        { fromWallet: String(userId) },
        { toWallet: String(userId) },
        { userId },
      ],
    };
    const [entries, total] = await Promise.all([
      Ledger.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Ledger.countDocuments(query),
    ]);
    return { entries, total, hasMore: skip + entries.length < total };
  }

  /**
   * Admin: get wallet by userId string.
   */
  async getWalletByUserId(userId) {
    return Wallet.findOne({ ownerId: String(userId) }).lean();
  }

  /**
   * Admin: get platform wallet summary.
   */
  async getPlatformWallet() {
    return Wallet.findOne({ ownerId: 'platform' }).lean();
  }

  /**
   * Admin: get all wallets with pagination.
   */
  async getAllWallets({ limit = 50, skip = 0, ownerType } = {}) {
    const query = ownerType ? { ownerType } : {};
    const [wallets, total] = await Promise.all([
      Wallet.find(query)
        .sort({ lastActivityAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Wallet.countDocuments(query),
    ]);
    return { wallets, total };
  }

  /**
   * Admin: manually release payment to caregiver (after service verification).
   * Delegates to ledgerService.onSlotReleased.
   */
  async adminReleasePayment({ bookingId, slotId, caregiverId, amount, currency = 'NPR', commissionPct }) {
    return ledgerService.onSlotReleased({
      bookingId,
      slotId,
      caregiverId,
      amount,
      currency,
      commissionPct,
    });
  }

  /**
   * Admin: issue manual refund.
   */
  async adminIssueRefund({ bookingId, slotId, transactionId, careSeekerId, amount, currency = 'NPR' }) {
    return ledgerService.onRefundIssued({
      bookingId,
      slotId,
      transactionId,
      careSeekerId,
      amount,
      currency,
    });
  }

  /**
   * Caregiver payout request (pending admin approval).
   */
  async requestPayout({ caregiverId, amount, currency = 'NPR', metadata = {} }) {
    const normalizedAmount = Number(amount || 0);
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      throw new Error('Payout amount must be > 0');
    }

    const wallet = await this.getOrCreate(caregiverId, 'caregiver');

    const pendingRequests = await PayoutRequest.find({
      caregiverId,
      status: 'pending',
    })
      .select('amount')
      .lean();

    const pendingRequested = pendingRequests.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0,
    );
    const availableToRequest = Number(wallet.balance || 0) - pendingRequested;

    if (availableToRequest < normalizedAmount) {
      throw new Error('Requested amount exceeds available balance after pending requests');
    }

    const request = await PayoutRequest.create({
      caregiverId,
      amount: normalizedAmount,
      currency,
      metadata,
    });

    const entry = await ledgerService.onPayoutRequested({
      caregiverId,
      amount: normalizedAmount,
      currency,
      metadata: {
        ...metadata,
        payoutRequestId: request._id,
        approvalStatus: 'pending',
      },
    });

    return { request, entry };
  }

  async getPayoutRequestsForCaregiver(caregiverId, { limit = 20, skip = 0 } = {}) {
    const [requests, total] = await Promise.all([
      PayoutRequest.find({ caregiverId: String(caregiverId) })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PayoutRequest.countDocuments({ caregiverId: String(caregiverId) }),
    ]);

    return { requests, total };
  }

  async getAdminPayoutRequests({ status, limit = 20, skip = 0 } = {}) {
    const query = status ? { status } : {};
    const [requests, total] = await Promise.all([
      PayoutRequest.find(query)
        .populate('caregiverId', 'fullName email avatar')
        .populate('approvedBy', 'fullName email')
        .populate('rejectedBy', 'fullName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PayoutRequest.countDocuments(query),
    ]);
    return { requests, total };
  }

  async approvePayoutRequest(requestId, adminId) {
    const request = await PayoutRequest.findById(requestId);
    if (!request) {
      throw new Error('Payout request not found');
    }
    if (request.status !== 'pending') {
      throw new Error('Only pending payout requests can be approved');
    }

    const entry = await ledgerService.onPayoutApproved({
      caregiverId: request.caregiverId,
      amount: Number(request.amount || 0),
      currency: request.currency || 'NPR',
      metadata: {
        payoutRequestId: request._id,
        approvedBy: adminId,
      },
    });

    request.status = 'approved';
    request.approvedAt = new Date();
    request.approvedBy = adminId;
    await request.save();

    return { request, entry };
  }

  async rejectPayoutRequest(requestId, adminId, reason = '') {
    const request = await PayoutRequest.findById(requestId);
    if (!request) {
      throw new Error('Payout request not found');
    }
    if (request.status !== 'pending') {
      throw new Error('Only pending payout requests can be rejected');
    }

    request.status = 'rejected';
    request.rejectedAt = new Date();
    request.rejectedBy = adminId;
    request.rejectionReason = reason || 'Rejected by admin';
    await request.save();

    return request;
  }

  /**
   * Earnings dashboard summary for a caregiver.
   * Returns wallet + recent ledger entries + monthly earnings.
   */
  async getCaregiverEarningsSummary(caregiverId) {
    const wallet = await this.getOrCreate(caregiverId, 'caregiver');

    // Last 10 ledger entries
    const { entries } = await this.getLedger(caregiverId, { limit: 10 });

    // Monthly earnings: sum of SLOT_RELEASED credits for current month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyAgg = await Ledger.aggregate([
      {
        $match: {
          toWallet: String(caregiverId),
          op: LEDGER_OP.SLOT_RELEASED,
          createdAt: { $gte: startOfMonth },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const earningsThisMonth = monthlyAgg[0]?.total ?? 0;

    // Total pending (money in escrow not yet released)
    const pendingAgg = await Ledger.aggregate([
      {
        $match: {
          toWallet: String(caregiverId),
          op: LEDGER_OP.PAYMENT_CAPTURED,
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalHeld = pendingAgg[0]?.total ?? 0;

    return {
      wallet,
      recentTransactions: entries,
      earningsThisMonth,
      totalHeld,
    };
  }

  /**
   * Caregiver's monthly earnings chart data (last 6 months).
   */
  async getMonthlyEarningsChart(caregiverId) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const agg = await Ledger.aggregate([
      {
        $match: {
          toWallet: String(caregiverId),
          op: LEDGER_OP.SLOT_RELEASED,
          createdAt: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    return agg.map(({ _id, total }) => ({
      year: _id.year,
      month: _id.month,
      total,
    }));
  }
}

const walletService = new WalletService();
export default walletService;
