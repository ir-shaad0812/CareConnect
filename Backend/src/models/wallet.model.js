// ============================================
// WALLET MODEL — Sprint D
// Per-user wallet holding available + pending balances.
// All money flow is reflected in the Ledger (separate model).
//
// Three logical wallets exist:
//   - careseeker wallet  (refund credits, payment history)
//   - caregiver  wallet  (earnings, payouts)
//   - platform   wallet  (escrow hold, commissions)
// ============================================

import mongoose from 'mongoose';

const walletSchema = new mongoose.Schema({
  // For user wallets this is the user _id; for the platform wallet
  // this is the literal string 'platform'. Stored as string for simplicity.
  ownerId: {
    type: String,
    required: true,
    index: true,
    unique: true,
  },
  ownerType: {
    type: String,
    enum: ['careseeker', 'caregiver', 'platform'],
    required: true,
  },

  // Immediately spendable
  balance: {
    type: Number,
    default: 0,
    min: 0,
  },

  // Escrow — paid by careseeker, held by platform, not yet released
  pendingBalance: {
    type: Number,
    default: 0,
    min: 0,
  },

  currency: {
    type: String,
    default: 'NPR',
  },

  // Lifetime aggregates for display
  lifetime: {
    credited: { type: Number, default: 0 },
    debited: { type: Number, default: 0 },
    released: { type: Number, default: 0 },
    refunded: { type: Number, default: 0 },
  },

  lastActivityAt: Date,
}, {
  timestamps: true,
});

// Helpers
walletSchema.statics.getOrCreate = async function (ownerId, ownerType) {
  let wallet = await this.findOne({ ownerId: String(ownerId) });
  if (!wallet) {
    wallet = await this.create({ ownerId: String(ownerId), ownerType });
  }
  return wallet;
};

walletSchema.statics.getPlatform = async function () {
  return this.getOrCreate('platform', 'platform');
};

const Wallet = mongoose.model('Wallet', walletSchema);
export default Wallet;
