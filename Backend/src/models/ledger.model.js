// ============================================
// LEDGER MODEL — Sprint D
// Append-only double-entry ledger. Every money movement creates
// one entry with a fromWallet, toWallet, amount, and references.
//
// Operations that write to the ledger:
//   - payment.captured    : careseeker → platform.pending (escrow in)
//   - slot.released       : platform.pending → caregiver.balance (minus commission)
//   - commission.taken    : platform.pending → platform.balance
//   - refund.issued       : platform.pending → careseeker.balance
//   - payout.requested    : caregiver.balance → caregiver (off-platform)
// ============================================

import mongoose from 'mongoose';

export const LEDGER_OP = {
  PAYMENT_CAPTURED:  'payment.captured',
  SLOT_RELEASED:     'slot.released',
  COMMISSION_TAKEN:  'commission.taken',
  REFUND_ISSUED:     'refund.issued',
  PAYOUT_REQUESTED:  'payout.requested',
  PAYOUT_COMPLETED:  'payout.completed',
  ADJUSTMENT:        'adjustment',
};

const ledgerSchema = new mongoose.Schema({
  op: {
    type: String,
    enum: Object.values(LEDGER_OP),
    required: true,
    index: true,
  },

  // Wallet owner IDs (string — supports 'platform' special value)
  fromWallet: { type: String, required: true, index: true },
  toWallet:   { type: String, required: true, index: true },

  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'NPR' },

  // Cross-references — all optional so the ledger can absorb adjustments
  bookingId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Booking',     index: true, sparse: true },
  slotId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Slot',        index: true, sparse: true },
  transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', index: true, sparse: true },
  userId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User',        index: true, sparse: true },

  description: String,
  metadata: { type: mongoose.Schema.Types.Mixed },

  // Running balances at time of entry (for audit)
  balancesAfter: {
    from: {
      balance: Number,
      pendingBalance: Number,
    },
    to: {
      balance: Number,
      pendingBalance: Number,
    },
  },
}, {
  timestamps: { createdAt: true, updatedAt: false },
});

// Append-only: disallow updates after creation
ledgerSchema.pre('findOneAndUpdate', function () {
  throw new Error('Ledger entries are immutable');
});
ledgerSchema.pre('updateOne', function () {
  throw new Error('Ledger entries are immutable');
});

ledgerSchema.index({ createdAt: -1 });
ledgerSchema.index({ bookingId: 1, createdAt: 1 });

const Ledger = mongoose.model('Ledger', ledgerSchema);
export default Ledger;
