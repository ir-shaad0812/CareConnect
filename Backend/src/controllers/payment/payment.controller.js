// ============================================
// PAYMENT CONTROLLER - Sprint-05
// Stripe Checkout Sessions, partial payments,
// webhook-driven confirmation, PDF invoices
// ============================================

import paymentService from '../../services/payment.service.js';
import walletService from '../../services/wallet.service.js';
import khaltiService from '../../services/khalti.service.js';
import esewaService from '../../services/esewa.service.js';
import invoiceService from '../../services/invoice.service.js';
import Transaction from '../../models/transaction.model.js';
import { ApiResponse, asyncHandler, ApiError } from '../../utils/apiResponse.js';
import { USER_ROLES } from '../../constants/index.js';
import ledgerService from '../../services/ledger.service.js';
import { emitWalletUpdate } from '../../config/socket.js';
import Stripe from 'stripe';

// Module-level singleton — instantiate once, not per-request
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' })
  : null;

// ============================================
// CHECKOUT SESSION
// ============================================

/**
 * Create a Stripe Checkout Session (supports partial payments)
 */
export const createCheckoutSession = asyncHandler(async (req, res) => {
  const { bookingId, amount } = req.body;
  const userId = req.user._id;

  if (!bookingId) {
    throw ApiError.badRequest('Booking ID is required');
  }

  const result = await paymentService.createCheckoutSession(
    bookingId,
    userId,
    amount || null
  );

  res.status(200).json(
    new ApiResponse(200, result, 'Checkout session created successfully')
  );
});

// ============================================
// STRIPE WEBHOOK
// ============================================

/**
 * Stripe webhook handler – requires raw body
 */
export const stripeWebhook = asyncHandler(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  // SECURITY: Require webhook secret in production
  if (!endpointSecret) {
    console.error('🔴 CRITICAL: STRIPE_WEBHOOK_SECRET not configured');
    if (process.env.NODE_ENV === 'production') {
      return res.status(500).json({ 
        error: 'Webhook endpoint not properly configured' 
      });
    }
  }

  let event;

  if (endpointSecret && sig) {
    if (!stripe) {
      console.error('🔴 CRITICAL: Stripe not initialized — STRIPE_SECRET_KEY missing');
      return res.status(500).json({ error: 'Payment provider not configured' });
    }
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      console.error('⚠️  Webhook signature verification failed:', err.message);
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }
  } else {
    // Only allow unsigned webhooks in development
    if (process.env.NODE_ENV === 'production') {
      console.error('🔴 Production webhook received without signature');
      return res.status(401).json({ error: 'Webhook signature required' });
    }
    // Dev mode fallback (no signature verification)
    event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    console.warn('⚠️  Webhook received without signature verification (dev mode only)');
  }

  console.log(`[Webhook] Event: ${event.type} | ID: ${event.id}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await paymentService.handleCheckoutSessionCompleted(event.data.object);
        break;

      case 'checkout.session.expired':
        await paymentService.handleCheckoutSessionExpired(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await paymentService.handlePaymentFailed(event.data.object);
        break;

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error(`[Webhook] Processing error for ${event.type}:`, err.message);
    // Still return 200 to prevent Stripe retries for processing errors
    res.status(200).json({ received: true, error: err.message });
  }
});

// ============================================
// TRANSACTION QUERIES
// ============================================

/**
 * Get user's transaction history
 */
export const getMyTransactions = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const result = await paymentService.getUserTransactions(userId, req.query);

  res.status(200).json(
    new ApiResponse(200, result, 'Transactions fetched successfully')
  );
});

/**
 * Get transaction by ID
 */
export const getTransactionById = asyncHandler(async (req, res) => {
  const { transactionId } = req.params;
  const userId = req.user._id;

  const transaction = await paymentService.getTransactionById(transactionId, userId);

  res.status(200).json(
    new ApiResponse(200, { transaction }, 'Transaction fetched successfully')
  );
});

/**
 * Get booking payment summary (amounts, partial payments, deadline)
 */
export const getBookingPaymentSummary = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const userId = req.user._id;

  const summary = await paymentService.getBookingPaymentSummary(bookingId, userId);

  res.status(200).json(
    new ApiResponse(200, summary, 'Payment summary fetched successfully')
  );
});

// ============================================
// EARNINGS
// ============================================

/**
 * Get caregiver earnings dashboard
 */
export const getEarningsDashboard = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  if (req.user.role !== USER_ROLES.CAREGIVER) {
    throw ApiError.forbidden('Earnings dashboard is only available for caregivers');
  }

  const dashboard = await paymentService.getEarningsDashboard(userId);

  res.status(200).json(
    new ApiResponse(200, { dashboard }, 'Earnings dashboard fetched successfully')
  );
});

// ============================================
// INVOICES
// ============================================

/**
 * Get invoice data (JSON)
 */
export const getInvoice = asyncHandler(async (req, res) => {
  const { transactionId } = req.params;
  const userId = req.user._id;

  const invoiceData = await paymentService.getInvoiceData(transactionId, userId);

  res.status(200).json(
    new ApiResponse(200, invoiceData, 'Invoice data fetched successfully')
  );
});

/**
 * Download invoice as PDF
 */
export const downloadInvoicePDF = asyncHandler(async (req, res) => {
  const { transactionId } = req.params;
  const userId = req.user._id;

  const { stream, filename } = await invoiceService.generateInvoicePDF(transactionId, userId);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  stream.pipe(res);
});

/**
 * Download final invoice PDF (only for fully paid bookings)
 */
export const downloadFinalInvoicePDF = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const userId = req.user._id;

  const { stream, filename } = await invoiceService.generateFinalInvoicePDF(bookingId, userId);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  stream.pipe(res);
});

// ============================================
// ADMIN
// ============================================

/**
 * Release payment to caregiver (admin)
 */
export const releasePayment = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const adminId = req.user._id;

  const transaction = await paymentService.releasePayment(bookingId, adminId);

  res.status(200).json(
    new ApiResponse(200, { transaction }, 'Payment released successfully')
  );
});

/**
 * Process refund (admin)
 */
export const processRefund = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const { amount, reason } = req.body;
  const adminId = req.user._id;

  if (!reason) {
    throw ApiError.badRequest('Refund reason is required');
  }

  const transaction = await paymentService.processRefund(bookingId, amount, reason, adminId);

  res.status(200).json(
    new ApiResponse(200, { transaction }, 'Refund processed successfully')
  );
});

/**
 * Cancel payment for a booking (admin)
 */
export const cancelBookingPayment = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;

  const booking = await paymentService.cancelBookingPayment(bookingId);

  res.status(200).json(
    new ApiResponse(200, { booking }, 'Booking payment cancelled successfully')
  );
});

/**
 * Get all transactions (admin)
 */
export const getAllTransactions = asyncHandler(async (req, res) => {
  const result = await paymentService.getAllTransactions(req.query);

  res.status(200).json(
    new ApiResponse(200, result, 'All transactions fetched successfully')
  );
});

/**
 * Get transaction statistics (admin)
 */
export const getTransactionStats = asyncHandler(async (req, res) => {
  const stats = await paymentService.getTransactionStats();

  res.status(200).json(
    new ApiResponse(200, { stats }, 'Transaction statistics fetched successfully')
  );
});

/**
 * List payout requests (admin).
 */
export const getPayoutRequests = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const skip = parseInt(req.query.skip) || 0;
  const status = req.query.status;

  const result = await walletService.getAdminPayoutRequests({ status, limit, skip });

  res.status(200).json(
    new ApiResponse(200, result, 'Payout requests fetched successfully')
  );
});

/**
 * Approve payout request (admin).
 */
export const approvePayoutRequest = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const adminId = req.user._id;

  const result = await walletService.approvePayoutRequest(requestId, adminId);

  const io = req.app.get('io');
  if (io) {
    const caregiverId = result.request.caregiverId;
    const updatedWallet = await ledgerService.getWallet(caregiverId);

    if (updatedWallet) {
      emitWalletUpdate(io, caregiverId, {
        wallet: updatedWallet,
        event: 'payout_approved',
        payoutRequestId: result.request._id,
        amount: result.request.amount,
      });
    }

    io.to(`user:${caregiverId}`).emit('notification', {
      type: 'payout_approved',
      title: 'Withdrawal Approved',
      message: `Your withdrawal request of ${result.request.currency} ${Number(result.request.amount).toFixed(2)} has been approved.`,
      data: { requestId: result.request._id },
    });

    io.emit('admin:payout_request_updated', {
      requestId: result.request._id,
      status: 'approved',
    });
  }

  res.status(200).json(
    new ApiResponse(200, result, 'Payout request approved successfully')
  );
});

/**
 * Reject payout request (admin).
 */
export const rejectPayoutRequest = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const adminId = req.user._id;
  const { reason } = req.body;

  const request = await walletService.rejectPayoutRequest(requestId, adminId, reason);

  const io = req.app.get('io');
  if (io) {
    io.to(`user:${request.caregiverId}`).emit('notification', {
      type: 'payout_rejected',
      title: 'Withdrawal Rejected',
      message: reason || 'Your withdrawal request was rejected by admin.',
      data: { requestId: request._id },
    });

    io.emit('admin:payout_request_updated', {
      requestId: request._id,
      status: 'rejected',
    });
  }

  res.status(200).json(
    new ApiResponse(200, { request }, 'Payout request rejected successfully')
  );
});

/**
 * Trigger expired deadline processing (admin/cron)
 */
export const processExpiredDeadlines = asyncHandler(async (req, res) => {
  const results = await paymentService.handleExpiredDeadlines();

  res.status(200).json(
    new ApiResponse(200, { processed: results }, `Processed ${results.length} expired deadlines`)
  );
});

// ============================================
// CONFIG
// ============================================

/**
 * Get Stripe publishable key (public)
 */
export const getStripeConfig = asyncHandler(async (req, res) => {
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;

  if (!publishableKey) {
    throw ApiError.internal('Stripe is not configured');
  }

  res.status(200).json(
    new ApiResponse(200, { publishableKey }, 'Stripe config fetched')
  );
});

/**
 * Get available payment gateways config
 */
export const getPaymentGatewaysConfig = asyncHandler(async (req, res) => {
  const gateways = {
    stripe: {
      available: !!process.env.STRIPE_SECRET_KEY,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || null,
      currencies: ['USD', 'EUR', 'GBP', 'AUD', 'CAD'],
      label: 'Stripe (Card)',
    },
    khalti: {
      available: khaltiService.getConfig().isAvailable,
      publicKey: khaltiService.getConfig().publicKey || null,
      currencies: ['NPR'],
      label: 'Khalti',
    },
    esewa: {
      available: esewaService.getConfig().isAvailable,
      merchantCode: esewaService.getConfig().merchantCode || null,
      currencies: ['NPR'],
      label: 'eSewa',
    },
  };

  res.status(200).json(
    new ApiResponse(200, { gateways }, 'Payment gateways config fetched')
  );
});

// ============================================
// KHALTI PAYMENT GATEWAY
// ============================================

/**
 * Initiate Khalti payment
 */
export const initiateKhaltiPayment = asyncHandler(async (req, res) => {
  const { bookingId, amount } = req.body;
  const userId = req.user._id;

  if (!bookingId) {
    throw ApiError.badRequest('Booking ID is required');
  }

  const result = await khaltiService.initiatePayment(bookingId, userId, amount || null);

  res.status(200).json(
    new ApiResponse(200, result, 'Khalti payment initiated successfully')
  );
});

/**
 * Verify Khalti payment (after redirect back)
 */
export const verifyKhaltiPayment = asyncHandler(async (req, res) => {
  const { pidx, transactionId } = req.body;
  const userId = req.user._id;

  if (!pidx || !transactionId) {
    throw ApiError.badRequest('pidx and transactionId are required');
  }

  const result = await khaltiService.verifyPayment(pidx, transactionId, userId);

  res.status(200).json(
    new ApiResponse(200, result, 'Khalti payment verification complete')
  );
});

/**
 * Get Khalti config
 */
export const getKhaltiConfig = asyncHandler(async (req, res) => {
  const config = khaltiService.getConfig();
  res.status(200).json(
    new ApiResponse(200, config, 'Khalti config fetched')
  );
});

// ============================================
// ESEWA PAYMENT GATEWAY
// ============================================

/**
 * Initiate eSewa payment
 */
export const initiateEsewaPayment = asyncHandler(async (req, res) => {
  const { bookingId, amount } = req.body;
  const userId = req.user._id;

  if (!bookingId) {
    throw ApiError.badRequest('Booking ID is required');
  }

  const result = await esewaService.initiatePayment(bookingId, userId, amount || null);

  res.status(200).json(
    new ApiResponse(200, result, 'eSewa payment initiated successfully')
  );
});

/**
 * Verify eSewa payment (after redirect back)
 */
export const verifyEsewaPayment = asyncHandler(async (req, res) => {
  const { encodedResponse } = req.body;
  const userId = req.user._id;

  if (!encodedResponse) {
    throw ApiError.badRequest('encodedResponse is required');
  }

  const result = await esewaService.verifyPayment(encodedResponse, userId);

  res.status(200).json(
    new ApiResponse(200, result, 'eSewa payment verification complete')
  );
});

/**
 * Get eSewa config
 */
export const getEsewaConfig = asyncHandler(async (req, res) => {
  const config = esewaService.getConfig();
  res.status(200).json(
    new ApiResponse(200, config, 'eSewa config fetched')
  );
});

// ============================================
// PAYMENT REMINDERS (ADMIN/CRON)
// ============================================

/**
 * Trigger payment reminders (admin/cron)
 */
export const triggerPaymentReminders = asyncHandler(async (req, res) => {
  const results = await paymentService.sendPaymentReminders();

  res.status(200).json(
    new ApiResponse(200, { sent: results }, `Sent ${results.length} payment reminders`)
  );
});

// ============================================
// CSV EXPORT
// ============================================

/**
 * Export user transactions as CSV — streamed via DB cursor to avoid OOM
 */
export const exportTransactionsCSV = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const date = new Date().toISOString().split('T')[0];

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="transactions-${date}.csv"`);

  const headers = [
    'Transaction #', 'Date', 'Type', 'Amount', 'Platform Fee',
    'Net Amount', 'Currency', 'Status', 'Payment Method', 'Booking #', 'Description',
  ];
  res.write(headers.join(',') + '\n');

  const cursor = Transaction
    .find({ userId })
    .populate('bookingId', 'bookingNumber')
    .lean()
    .cursor();

  for await (const txn of cursor) {
    const row = [
      txn.transactionNumber ?? '',
      txn.createdAt ? new Date(txn.createdAt).toISOString().split('T')[0] : '',
      txn.type ?? '',
      typeof txn.amount === 'number' ? txn.amount.toFixed(2) : '0.00',
      typeof txn.platformFee === 'number' ? txn.platformFee.toFixed(2) : '0.00',
      typeof txn.netAmount === 'number' ? txn.netAmount.toFixed(2) : (typeof txn.amount === 'number' ? txn.amount.toFixed(2) : '0.00'),
      txn.currency ?? 'NPR',
      txn.status ?? '',
      txn.paymentMethod ?? 'N/A',
      txn.bookingId?.bookingNumber ?? txn.bookingId ?? 'N/A',
      (txn.description ?? '').replace(/,/g, ';').replace(/\n/g, ' '),
    ].map(v => `"${String(v).replace(/"/g, '""')}"`); // quote all fields for safety
    res.write(row.join(',') + '\n');
  }

  res.end();
});
