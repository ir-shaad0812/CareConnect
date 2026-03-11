// ============================================
// TRANSACTION MODEL
// Handles all financial transactions on the platform
// ============================================

import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  // Unique transaction reference
  transactionNumber: {
    type: String,
    unique: true,
    required: true,
  },

  // Transaction type
  type: {
    type: String,
    enum: ['payment', 'payout', 'refund', 'platform_fee'],
    required: true,
  },

  // Related booking
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
  },

  // Payer (care seeker for payments, platform for refunds/payouts)
  payerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  // Payee (platform for payments, caregiver for payouts, care seeker for refunds)
  payeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  // Financial details
  amount: {
    type: Number,
    required: true,
    min: 0,
  },

  platformFee: {
    type: Number,
    default: 0,
    min: 0,
  },

  platformFeePercentage: {
    type: Number,
    default: 10,
  },

  netAmount: {
    type: Number,
    required: true,
    min: 0,
  },

  currency: {
    type: String,
    default: 'NPR',
  },

  // Transaction status
  status: {
    type: String,
    enum: ['initiated', 'pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled', 'expired'],
    default: 'pending',
  },

  // Payment method
  paymentMethod: {
    type: String,
    enum: ['card', 'bank_transfer', 'stripe', 'stripe_checkout', 'khalti', 'esewa'],
    default: 'stripe_checkout',
  },

  // Sprint-05: Stripe Checkout Session ID
  stripeCheckoutSessionId: {
    type: String,
    index: true,
    sparse: true,
  },

  // Sprint-05: Whether this is a partial payment
  isPartialPayment: {
    type: Boolean,
    default: false,
  },

  // Sprint-05: Running totals at time of this transaction
  runningAmountPaid: {
    type: Number,
    default: 0,
  },

  runningAmountDue: {
    type: Number,
    default: 0,
  },

  // Stripe integration fields
  stripePaymentIntentId: {
    type: String,
    index: true,
    sparse: true,
  },

  stripeChargeId: {
    type: String,
    sparse: true,
  },

  stripeTransferId: {
    type: String,
    sparse: true,
  },

  stripeRefundId: {
    type: String,
    sparse: true,
  },

  // Receipt URL from Stripe
  receiptUrl: {
    type: String,
  },

  // Invoice details
  invoice: {
    invoiceNumber: String,
    issuedAt: Date,
    dueDate: Date,
    items: [{
      description: String,
      quantity: Number,
      unitPrice: Number,
      total: Number,
    }],
    subtotal: Number,
    tax: Number,
    total: Number,
  },

  // Refund details
  refund: {
    reason: String,
    requestedAt: Date,
    processedAt: Date,
    amount: Number,
    stripeRefundId: String,
    status: {
      type: String,
      enum: [
        'requested',
        'auto_approved',
        'under_review',
        'processed',
        'rejected',
        'pending',
        'processing',
        'completed',
        'failed',
      ],
    },
  },

  // Description for audit trail
  description: {
    type: String,
  },

  // Additional metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },

  // Error details for failed transactions
  failureReason: {
    type: String,
  },

  // Timestamps for processing stages
  processedAt: Date,
  completedAt: Date,
  failedAt: Date,

}, {
  timestamps: true,
});

// Indexes
transactionSchema.index({ bookingId: 1 });
transactionSchema.index({ payerId: 1, type: 1 });
transactionSchema.index({ payeeId: 1, type: 1 });
transactionSchema.index({ userId: 1, createdAt: -1 }); // CSV export + history queries
transactionSchema.index({ status: 1, createdAt: -1 });
transactionSchema.index({ type: 1, status: 1 });
transactionSchema.index({ 'invoice.invoiceNumber': 1 }, { sparse: true });

// Generate unique transaction number
transactionSchema.statics.generateTransactionNumber = async function(type = 'PAY') {
  const prefixMap = {
    payment: 'PAY',
    payout: 'PO',
    refund: 'RF',
    platform_fee: 'PF',
  };
  const prefix = prefixMap[type] || 'TXN';
  const date = new Date();
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${dateStr}-${random}`;
};

// Generate invoice number
transactionSchema.statics.generateInvoiceNumber = async function() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const count = await this.countDocuments({
    'invoice.invoiceNumber': { $exists: true },
    createdAt: {
      $gte: new Date(year, date.getMonth(), 1),
      $lt: new Date(year, date.getMonth() + 1, 1),
    },
  });
  return `INV-${year}${month}-${String(count + 1).padStart(5, '0')}`;
};

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;
