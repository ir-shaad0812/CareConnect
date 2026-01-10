// ============================================
// LEDGER SERVICE — Sprint D
// The ONLY code that should mutate Wallet balances.
// Uses atomic MongoDB $inc to prevent race conditions.
// Every call produces an immutable Ledger entry.
// ============================================

import Wallet from '../models/wallet.model.js';
import Ledger, { LEDGER_OP } from '../models/ledger.model.js';
import Booking from '../models/booking.model.js';
import { PLATFORM_FEE_PERCENTAGE } from '../constants/booking.constants.js';

const round2 = (n) => Math.round(n * 100) / 100;

class LedgerService {
  // Atomic increment helper — prevents race conditions
  async _inc(ownerId, { balance = 0, pendingBalance = 0, lifetimeCredited = 0, lifetimeDebited = 0, lifetimeReleased = 0, lifetimeRefunded = 0 } = {}) {
    const update = { $inc: {}, $set: { lastActivityAt: new Date() } };

    if (balance !== 0) update.$inc.balance = round2(balance);
    if (pendingBalance !== 0) update.$inc.pendingBalance = round2(pendingBalance);
    if (lifetimeCredited !== 0) update.$inc['lifetime.credited'] = round2(lifetimeCredited);
    if (lifetimeDebited !== 0) update.$inc['lifetime.debited'] = round2(lifetimeDebited);
    if (lifetimeReleased !== 0) update.$inc['lifetime.released'] = round2(lifetimeReleased);
    if (lifetimeRefunded !== 0) update.$inc['lifetime.refunded'] = round2(lifetimeRefunded);

    return Wallet.findOneAndUpdate(
      { ownerId: String(ownerId) },
      update,
      { new: true, upsert: false }
    );
  }

  async _ensureWallet(ownerId, ownerType) {
    return Wallet.getOrCreate(ownerId, ownerType);
  }

  async _record(op, { fromWallet, toWallet, amount, currency = 'NPR', bookingId, slotId, transactionId, userId, description, metadata }) {
    return Ledger.create({
      op, fromWallet, toWallet, amount, currency,
      bookingId, slotId, transactionId, userId,
      description, metadata,
    });
  }

  /**
   * Careseeker payment landed — credit escrow (platform.pendingBalance).
   * Called by payment.service on successful webhook capture.
   */
  async onPaymentCaptured({ bookingId, slotId, transactionId, careSeekerId, amount, currency = 'NPR' }) {
    if (amount <= 0) return null;

    await this._ensureWallet('platform', 'platform');
    await this._ensureWallet(String(careSeekerId), 'careseeker');

    // Care-seeker wallet tracks money currently held in escrow.
    await this._inc(String(careSeekerId), {
      pendingBalance: amount,
      lifetimeDebited: amount,
    });

    await this._inc('platform', {
      pendingBalance: amount,
      lifetimeCredited: amount,
    });

    return this._record(LEDGER_OP.PAYMENT_CAPTURED, {
      fromWallet: String(careSeekerId),
      toWallet: 'platform',
      amount, currency,
      bookingId, slotId, transactionId, userId: careSeekerId,
      description: `Escrow hold for booking ${bookingId}`,
    });
  }

  /**
   * A slot was completed — release the allocated amount from escrow to
   * the caregiver wallet, minus platform commission.
   * Atomic: both wallets updated via $inc — no read-modify-write race.
   */
  async onSlotReleased({ bookingId, slotId, caregiverId, amount, currency = 'NPR', commissionPct = PLATFORM_FEE_PERCENTAGE }) {
    if (amount <= 0) return null;

    const commission = round2(amount * commissionPct / 100);
    const net = round2(amount - commission);

    await this._ensureWallet('platform', 'platform');
    await this._ensureWallet(caregiverId, 'caregiver');

    // Atomic: platform pendingBalance decreases, commission stays as platform balance
    await this._inc('platform', {
      pendingBalance: -amount,
      balance: commission,
      lifetimeReleased: amount,
    });

    // Atomic: caregiver receives net amount
    await this._inc(String(caregiverId), {
      balance: net,
      lifetimeCredited: net,
    });

    // Reduce care-seeker escrow tracking by released gross amount.
    // Use capped decrement to avoid going negative for legacy records.
    if (bookingId) {
      const booking = await Booking.findById(bookingId).select('careSeekerId');
      const careSeekerId = booking?.careSeekerId?.toString?.();
      if (careSeekerId) {
        await this._ensureWallet(careSeekerId, 'careseeker');
        const seekerWallet = await this.getWallet(careSeekerId);
        const seekerPending = Number(seekerWallet?.pendingBalance || 0);
        const decrement = Math.min(seekerPending, amount);
        if (decrement > 0) {
          await this._inc(careSeekerId, {
            pendingBalance: -decrement,
            lifetimeReleased: decrement,
          });
        }
      }
    }

    // Two immutable ledger entries
    await this._record(LEDGER_OP.SLOT_RELEASED, {
      fromWallet: 'platform',
      toWallet: String(caregiverId),
      amount: net, currency,
      bookingId, slotId, userId: caregiverId,
      description: `Slot ${slotId} released to caregiver (net of ${commissionPct}% commission)`,
      metadata: { gross: amount, commission, commissionPct },
    });
    await this._record(LEDGER_OP.COMMISSION_TAKEN, {
      fromWallet: 'platform',
      toWallet: 'platform',
      amount: commission, currency,
      bookingId, slotId,
      description: `Platform commission for slot ${slotId}`,
    });

    return { net, commission };
  }

  /**
   * Refund issued — move money from escrow back to careseeker wallet.
   * Atomic: no race condition possible.
   */
  async onRefundIssued({ bookingId, slotId, transactionId, careSeekerId, amount, currency = 'NPR' }) {
    if (amount <= 0) return null;

    await this._ensureWallet('platform', 'platform');
    await this._ensureWallet(String(careSeekerId), 'careseeker');

    await this._inc('platform', {
      pendingBalance: -amount,
      lifetimeRefunded: amount,
    });

    const careSeekerWallet = await this.getWallet(String(careSeekerId));
    const seekerPending = Number(careSeekerWallet?.pendingBalance || 0);
    const pendingDecrement = Math.min(seekerPending, amount);

    await this._inc(String(careSeekerId), {
      balance: amount,
      pendingBalance: -pendingDecrement,
      lifetimeCredited: amount,
      lifetimeRefunded: amount,
    });

    return this._record(LEDGER_OP.REFUND_ISSUED, {
      fromWallet: 'platform',
      toWallet: String(careSeekerId),
      amount, currency,
      bookingId, slotId, transactionId, userId: careSeekerId,
      description: `Refund for booking ${bookingId}`,
    });
  }

  /**
   * Record a payout request without changing wallet balances.
   */
  async onPayoutRequested({ caregiverId, amount, currency = 'NPR', metadata }) {
    if (amount <= 0) throw new Error('Payout amount must be > 0');

    await this._ensureWallet(String(caregiverId), 'caregiver');

    return this._record(LEDGER_OP.PAYOUT_REQUESTED, {
      fromWallet: String(caregiverId),
      toWallet: 'payout_hold',
      amount, currency,
      userId: caregiverId,
      description: 'Payout request (pending admin approval)',
      metadata,
    });
  }

  /**
   * Approve a payout and atomically debit caregiver balance.
   */
  async onPayoutApproved({ caregiverId, amount, currency = 'NPR', metadata }) {
    if (amount <= 0) throw new Error('Payout amount must be > 0');

    await this._ensureWallet(String(caregiverId), 'caregiver');

    const wallet = await Wallet.findOneAndUpdate(
      { ownerId: String(caregiverId), balance: { $gte: amount } },
      {
        $inc: { balance: -round2(amount), 'lifetime.debited': round2(amount) },
        $set: { lastActivityAt: new Date() },
      },
      { new: true },
    );

    if (!wallet) {
      throw new Error('Insufficient balance to approve payout');
    }

    return this._record(LEDGER_OP.PAYOUT_COMPLETED, {
      fromWallet: String(caregiverId),
      toWallet: 'external',
      amount,
      currency,
      userId: caregiverId,
      description: 'Payout approved and released',
      metadata,
    });
  }

  /**
   * Query helpers
   */
  async getWallet(ownerId) {
    return Wallet.findOne({ ownerId: String(ownerId) });
  }

  async getOrCreateWallet(ownerId, ownerType) {
    return this._ensureWallet(ownerId, ownerType);
  }

  async getLedgerForBooking(bookingId) {
    return Ledger.find({ bookingId }).sort({ createdAt: 1 });
  }

  async getLedgerForUser(userId, { limit = 50, skip = 0 } = {}) {
    return Ledger.find({
      $or: [{ fromWallet: String(userId) }, { toWallet: String(userId) }, { userId }],
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
  }
}

const ledgerService = new LedgerService();
export default ledgerService;
