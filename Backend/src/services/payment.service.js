// ============================================
// PAYMENT SERVICE - Sprint-05
// Stripe Checkout Sessions, Partial Payments,
// Webhook-driven state management, Refunds,
// Deadline enforcement, Transaction history
// ============================================

import Stripe from 'stripe';
import Transaction from '../models/transaction.model.js';
import PayoutRequest from '../models/payoutRequest.model.js';
import Booking from '../models/booking.model.js';
import User from '../models/user.model.js';
import Notification from '../models/notification.model.js';
import {
  TRANSACTION_TYPE,
  TRANSACTION_STATUS,
  BOOKING_PAYMENT_STATUS,
  PAYMENT_STATUS_TRANSITIONS,
  PAYMENT_DEADLINE_DAYS,
  PAYMENT_REMINDER_HOURS,
  PAYMENT_REMINDER_FINAL_HOURS,
  PAYMENT_GATEWAY,
} from '../constants/payment.constants.js';
import {
  BOOKING_STATUS,
  PLATFORM_FEE_PERCENTAGE,
  NOTIFICATION_TYPE,
} from '../constants/booking.constants.js';
import { USER_ROLES } from '../constants/index.js';
import emailService from './email.service.js';
import chatAccessService from './chatAccess.service.js';
import chatService from './chat.service.js';
import taskService from './task.service.js';
import bookingWorkflowQueueService from './bookingWorkflowQueue.service.js';
import bookingStateTransitionService from './bookingStateTransition.service.js';
import slotService from './slot.service.js';
import refundService from './refund.service.js';
import ledgerService from './ledger.service.js';
import { emitWalletUpdate } from '../config/socket.js';
import { eventBus, SYSTEM_EVENTS } from '../utils/eventBus.js';

const round2 = (value) => Math.round(Number(value || 0) * 100) / 100;

class PaymentService {
  constructor() {
    this.stripe = null;
    this.startupStatus = {
      level: 'warn',
      message: 'Stripe disabled (missing secret key)',
    };
    this.initializeStripe();
  }

  initializeStripe() {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (secretKey) {
      this.stripe = new Stripe(secretKey, { apiVersion: '2024-12-18.acacia' });
      this.startupStatus = {
        level: 'ok',
        message: 'Stripe initialized',
      };
    } else {
      this.startupStatus = {
        level: 'warn',
        message: 'Stripe disabled (missing secret key)',
      };
    }
  }

  getStartupStatus() {
    return this.startupStatus;
  }

  getPayableBookingStatuses() {
    return [
      BOOKING_STATUS.PAYMENT_PENDING,
      BOOKING_STATUS.CONFIRMED,
      BOOKING_STATUS.ACTIVE,
      BOOKING_STATUS.IN_PROGRESS,
    ];
  }

  getEffectiveTotalAmount(booking) {
    const topLevelTotal = Number(booking.totalAmount || 0);
    if (topLevelTotal > 0) {
      return topLevelTotal;
    }

    const pricingTotal = Number(booking.pricing?.total || 0);
    if (pricingTotal > 0) {
      return pricingTotal;
    }

    return 0;
  }

  // ============================================
  // PAYMENT STATUS STATE MACHINE
  // ============================================

  /**
   * Validate payment status transitions
   */
  validatePaymentStatusTransition(currentStatus, newStatus) {
    const allowed = PAYMENT_STATUS_TRANSITIONS[currentStatus];
    if (!allowed || !allowed.includes(newStatus)) {
      throw new Error(
        `Invalid payment status transition: ${currentStatus} → ${newStatus}. ` +
        `Allowed: [${(allowed || []).join(', ')}]`
      );
    }
    return true;
  }

  // ============================================
  // STRIPE CHECKOUT SESSION CREATION
  // ============================================

  /**
   * Create a Stripe Checkout Session for a booking payment.
   * Supports full and partial payments.
   *
   * @param {string} bookingId - Booking ID
   * @param {string} userId - Authenticated user (care seeker) ID
   * @param {number|null} paymentAmount - Amount to charge (null = pay full remaining)
   */
  async createCheckoutSession(bookingId, userId, paymentAmount = null) {
    if (!this.stripe) {
      throw new Error('Payment processing is not configured. Set STRIPE_SECRET_KEY.');
    }

    const booking = await Booking.findById(bookingId)
      .populate('careSeekerId', 'fullName email')
      .populate('caregiverId', 'fullName email');

    if (!booking) {
      throw new Error('Booking not found');
    }

    // Authorization
    const careSeekerId = (booking.careSeekerId._id || booking.careSeekerId).toString();
    if (careSeekerId !== userId.toString()) {
      throw new Error('Only the care seeker can make payments for this booking');
    }

    // Status validations
    if (booking.status === BOOKING_STATUS.CANCELLED) {
      throw new Error('Cannot pay for a cancelled booking');
    }
    if (!this.getPayableBookingStatuses().includes(booking.status)) {
      throw new Error(
        'Payment can only be made for agreement-approved, confirmed, or active bookings'
      );
    }
    if (booking.paymentStatus === BOOKING_PAYMENT_STATUS.FULLY_PAID) {
      throw new Error('This booking has already been fully paid');
    }
    if (booking.paymentStatus === BOOKING_PAYMENT_STATUS.CANCELLED) {
      throw new Error('Payment has been cancelled for this booking');
    }
    if (booking.isPaymentExpired()) {
      throw new Error('Payment deadline has expired. Contact support for assistance.');
    }

    // Determine amount — fall back to pricing.total for bookings where totalAmount was never synced
    const effectiveTotalAmount = this.getEffectiveTotalAmount(booking);
    
    // Validate that there is a valid total amount
    if (effectiveTotalAmount <= 0) {
      throw new Error(
        'This booking has no valid price set. This may happen if the caregiver has not configured their service rates. ' +
        'Please contact support or ask the caregiver to update their pricing.'
      );
    }

    const amountDue = effectiveTotalAmount - (booking.amountPaid || 0);
    if (amountDue <= 0) {
      throw new Error('No outstanding amount to pay');
    }

    let chargeAmount = amountDue;
    let isPartialPayment = false;

    if (paymentAmount !== null && paymentAmount !== undefined) {
      if (paymentAmount <= 0) throw new Error('Payment amount must be greater than zero');
      if (paymentAmount > amountDue) {
        throw new Error(`Payment amount (${paymentAmount}) exceeds outstanding due (${amountDue})`);
      }
      chargeAmount = paymentAmount;
      isPartialPayment = chargeAmount < amountDue;
    }

    // Expire any existing open checkout sessions
    const existingPendingTx = await Transaction.findOne({
      bookingId,
      type: TRANSACTION_TYPE.PAYMENT,
      status: { $in: [TRANSACTION_STATUS.INITIATED, TRANSACTION_STATUS.PENDING] },
    });

    if (existingPendingTx && existingPendingTx.stripeCheckoutSessionId) {
      try {
        const existingSession = await this.stripe.checkout.sessions.retrieve(
          existingPendingTx.stripeCheckoutSessionId
        );
        if (existingSession.status === 'open') {
          await this.stripe.checkout.sessions.expire(existingSession.id);
        }
      } catch (err) {
        // ignore
      }
      existingPendingTx.status = TRANSACTION_STATUS.EXPIRED;
      await existingPendingTx.save();
    }

    // Create Stripe Checkout Session
    const amountInSmallestUnit = Math.round(chargeAmount * 100);
    const currency = (booking.pricing.currency || 'usd').toLowerCase();

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: booking.careSeekerId.email,
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: `CareConnect Booking #${booking.bookingNumber}`,
              description: isPartialPayment
                ? `Partial payment – ${booking.serviceType.replace(/_/g, ' ')} service`
                : `Full payment – ${booking.serviceType.replace(/_/g, ' ')} service`,
            },
            unit_amount: amountInSmallestUnit,
          },
          quantity: 1,
        },
      ],
      metadata: {
        bookingId: booking._id.toString(),
        bookingNumber: booking.bookingNumber,
        careSeekerId,
        caregiverId: (booking.caregiverId._id || booking.caregiverId).toString(),
        isPartialPayment: isPartialPayment.toString(),
        chargeAmount: chargeAmount.toString(),
      },
      success_url: `${process.env.FRONTEND_URL}/dashboard/bookings/${booking._id}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/dashboard/bookings/${booking._id}?payment=cancelled`,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30-minute session expiry
    });

    // Create transaction record
    const transactionNumber = await Transaction.generateTransactionNumber('payment');
    const platformFee = (chargeAmount * (booking.pricing.platformFeePercentage || PLATFORM_FEE_PERCENTAGE)) / 100;

    const transaction = new Transaction({
      transactionNumber,
      type: TRANSACTION_TYPE.PAYMENT,
      bookingId: booking._id,
      payerId: booking.careSeekerId._id || booking.careSeekerId,
      payeeId: booking.caregiverId._id || booking.caregiverId,
      amount: chargeAmount,
      platformFee,
      platformFeePercentage: booking.pricing.platformFeePercentage || PLATFORM_FEE_PERCENTAGE,
      netAmount: chargeAmount - platformFee,
      currency: booking.pricing.currency || 'USD',
      status: TRANSACTION_STATUS.INITIATED,
      paymentMethod: 'stripe_checkout',
      stripeCheckoutSessionId: session.id,
      isPartialPayment,
      description: isPartialPayment
        ? `Partial payment for booking #${booking.bookingNumber}`
        : `Full payment for booking #${booking.bookingNumber}`,
      invoice: {
        invoiceNumber: await Transaction.generateInvoiceNumber(),
        issuedAt: new Date(),
        dueDate: booking.paymentDeadline || new Date(Date.now() + PAYMENT_DEADLINE_DAYS * 24 * 60 * 60 * 1000),
        items: [
          {
            description: `${booking.serviceType.replace(/_/g, ' ')} service`,
            quantity: booking.pricing.totalHours || 1,
            unitPrice: booking.pricing.rate,
            total: chargeAmount,
          },
        ],
        subtotal: chargeAmount - platformFee,
        tax: booking.pricing.taxes || 0,
        total: chargeAmount,
      },
    });

    await transaction.save();

    // Update booking
    booking.stripeSessionIds = booking.stripeSessionIds || [];
    booking.stripeSessionIds.push(session.id);

    if (
      booking.paymentStatus === BOOKING_PAYMENT_STATUS.UNPAID ||
      booking.paymentStatus === BOOKING_PAYMENT_STATUS.PARTIALLY_PAID
    ) {
      booking.paymentStatus = BOOKING_PAYMENT_STATUS.PAYMENT_PENDING;
    }

    await booking.save();

    return {
      sessionId: session.id,
      sessionUrl: session.url,
      transaction,
      chargeAmount,
      isPartialPayment,
      amountDueAfter: amountDue - chargeAmount,
    };
  }

  // ============================================
  // STRIPE WEBHOOK HANDLERS
  // ============================================

  /**
   * checkout.session.completed — the ONLY path for confirming payments
   */
  async handleCheckoutSessionCompleted(session) {
    const sessionId = session.id;

    const transaction = await Transaction.findOne({
      stripeCheckoutSessionId: sessionId,
    });

    if (!transaction) {
      console.error(`[Webhook] No transaction found for session: ${sessionId}`);
      return null;
    }

    // Idempotency guard
    if (transaction.status === TRANSACTION_STATUS.COMPLETED) {
      console.log(`[Webhook] Transaction ${transaction.transactionNumber} already completed. Skipping.`);
      return transaction;
    }

    // Retrieve full session from Stripe for verification
    let fullSession;
    try {
      fullSession = await this.stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['payment_intent', 'payment_intent.latest_charge'],
      });
    } catch (err) {
      console.error(`[Webhook] Failed to retrieve session ${sessionId}:`, err.message);
      throw err;
    }

    if (fullSession.payment_status !== 'paid') {
      console.warn(`[Webhook] Session ${sessionId} not paid (${fullSession.payment_status})`);
      return null;
    }

    // Update transaction
    transaction.status = TRANSACTION_STATUS.COMPLETED;
    transaction.processedAt = new Date();
    transaction.completedAt = new Date();

    if (fullSession.payment_intent) {
      const pi = typeof fullSession.payment_intent === 'string'
        ? fullSession.payment_intent
        : fullSession.payment_intent.id;
      transaction.stripePaymentIntentId = pi;

      if (typeof fullSession.payment_intent === 'object' && fullSession.payment_intent.latest_charge) {
        const charge = typeof fullSession.payment_intent.latest_charge === 'object'
          ? fullSession.payment_intent.latest_charge
          : null;
        if (charge) {
          transaction.stripeChargeId = charge.id;
          transaction.receiptUrl = charge.receipt_url;
        }
      }
    }

    // Update booking financials
    const booking = await Booking.findById(transaction.bookingId);
    if (!booking) {
      console.error(`[Webhook] Booking not found for transaction ${transaction.transactionNumber}`);
      transaction.failureReason = 'Booking not found during webhook processing';
      await transaction.save();
      return null;
    }

    const previousBookingStatus = booking.status;
    const effectiveTotalAmount = this.getEffectiveTotalAmount(booking);
    const newAmountPaid = (booking.amountPaid || 0) + transaction.amount;
    const newAmountDue = Math.max(0, effectiveTotalAmount - newAmountPaid);

    transaction.runningAmountPaid = newAmountPaid;
    transaction.runningAmountDue = newAmountDue;
    await transaction.save();

    // Update booking
    booking.totalAmount = effectiveTotalAmount;
    booking.amountPaid = newAmountPaid;
    booking.amountDue = newAmountDue;
    booking.payment.status = 'held';
    booking.payment.method = 'stripe';
    booking.payment.transactionId = transaction.transactionNumber;
    booking.payment.paidAt = new Date();
    booking.payment.escrowHeld = true;
    booking.lastPaymentDate = new Date();

    if (newAmountDue <= 0) {
      booking.paymentStatus = BOOKING_PAYMENT_STATUS.FULLY_PAID;
      if (booking.status === BOOKING_STATUS.PAYMENT_PENDING) {
        await bookingStateTransitionService.transition(
          booking,
          BOOKING_STATUS.CONFIRMED,
          {
            source: 'payment.processSuccessfulPayment',
            reason: 'Payment completed and escrow held',
            metadata: {
              gateway: 'stripe',
              transactionId: transaction._id?.toString?.() || null,
            },
          },
        );
      }
    } else {
      booking.paymentStatus = BOOKING_PAYMENT_STATUS.PARTIALLY_PAID;
    }

    await booking.save();

    // Ledger + wallet hooks
    // 1) Capture escrow movement for audit trail and careseeker wallet history.
    try {
      await ledgerService.onPaymentCaptured({
        bookingId: booking._id,
        transactionId: transaction._id,
        careSeekerId: transaction.payerId,
        amount: transaction.amount,
        currency: transaction.currency || booking.pricing?.currency || 'NPR',
      });

      const io = global.__careconnect_io;
      if (io) {
        const careSeekerWallet = await ledgerService.getWallet(transaction.payerId);
        if (careSeekerWallet) {
          emitWalletUpdate(io, transaction.payerId, {
            wallet: careSeekerWallet,
            event: 'payment_captured',
            bookingId: booking._id,
            transactionId: transaction._id,
          });
        }
      }
    } catch (ledgerErr) {
      console.error('[PaymentService] Wallet capture hook failed:', ledgerErr.message);
    }

    // 2) Distribute paid amount into slot-level balances.
    // If any slot is already completed, slot service auto-releases paid amount.
    try {
      await slotService.createSlotsForBooking(booking);
      await slotService.allocatePaymentToSlots(booking._id, transaction.amount);

      const io = global.__careconnect_io;
      if (io) {
        const caregiverWallet = await ledgerService.getWallet(transaction.payeeId);
        if (caregiverWallet) {
          emitWalletUpdate(io, transaction.payeeId, {
            wallet: caregiverWallet,
            event: 'payment_allocated',
            bookingId: booking._id,
            transactionId: transaction._id,
          });
        }
      }
    } catch (slotErr) {
      console.error('[PaymentService] Slot allocation hook failed:', slotErr.message);
    }

    // Task center: create or resolve payment_due task
    try {
      if (newAmountDue <= 0) {
        // Fully paid — resolve any outstanding task
        await taskService.resolvePaymentTask(booking._id);
      } else {
        // Partial payment — upsert a payment_due task with latest deadline
        await taskService.createPaymentDueTask(
          booking.careSeekerId, booking._id, newAmountDue, booking.paymentDeadline
        );
      }
    } catch (taskErr) {
      console.error('[PaymentService] Task update error:', taskErr.message);
    }

    // Update caregiver pending earnings
    await User.findByIdAndUpdate(transaction.payeeId, {
      $inc: { 'earnings.pending': transaction.netAmount },
    });

    // Notifications
    await this._sendPaymentNotifications(transaction, booking);

    const movedToConfirmed =
      previousBookingStatus === BOOKING_STATUS.PAYMENT_PENDING &&
      booking.status === BOOKING_STATUS.CONFIRMED;

    if (
      booking.paymentStatus === BOOKING_PAYMENT_STATUS.FULLY_PAID &&
      booking.status === BOOKING_STATUS.CONFIRMED
    ) {
      try {
        await bookingWorkflowQueueService.enqueueBookingConfirmed(booking._id, {
          source: movedToConfirmed ? 'stripe_webhook_payment_confirmed' : 'stripe_webhook_full_payment',
          transactionId: transaction._id?.toString?.() || null,
          paymentGateway: 'stripe',
          paymentStatus: booking.paymentStatus,
        });
      } catch (queueError) {
        console.error(
          `[PaymentService] Failed to enqueue booking.confirmed workflow for ${booking._id}:`,
          queueError.message,
        );
      }
    }

    console.log(
      `[Webhook] ✅ Payment confirmed: ${transaction.transactionNumber} | ` +
      `Paid: ${newAmountPaid}/${booking.totalAmount} | Status: ${booking.paymentStatus}`
    );

    return transaction;
  }

  /**
   * checkout.session.expired
   */
  async handleCheckoutSessionExpired(session) {
    const transaction = await Transaction.findOne({
      stripeCheckoutSessionId: session.id,
    });

    if (!transaction) return;
    if (transaction.status === TRANSACTION_STATUS.COMPLETED) return;

    transaction.status = TRANSACTION_STATUS.EXPIRED;
    transaction.failedAt = new Date();
    transaction.failureReason = 'Checkout session expired';
    await transaction.save();

    const booking = await Booking.findById(transaction.bookingId);
    if (booking && booking.paymentStatus === BOOKING_PAYMENT_STATUS.PAYMENT_PENDING) {
      booking.paymentStatus = booking.amountPaid > 0
        ? BOOKING_PAYMENT_STATUS.PARTIALLY_PAID
        : BOOKING_PAYMENT_STATUS.UNPAID;
      await booking.save();
    }

    console.log(`[Webhook] Checkout session expired: ${session.id}`);
  }

  /**
   * payment_intent.payment_failed
   */
  async handlePaymentFailed(paymentIntent) {
    let transaction = await Transaction.findOne({
      stripePaymentIntentId: paymentIntent.id,
    });

    if (!transaction) {
      const bookingId = paymentIntent.metadata?.bookingId;
      if (bookingId) {
        transaction = await Transaction.findOne({
          bookingId,
          status: { $in: [TRANSACTION_STATUS.INITIATED, TRANSACTION_STATUS.PENDING] },
        });
      }
    }

    if (!transaction) {
      console.warn(`[Webhook] No transaction for failed PI: ${paymentIntent.id}`);
      return;
    }

    transaction.status = TRANSACTION_STATUS.FAILED;
    transaction.failureReason = paymentIntent.last_payment_error?.message || 'Payment failed';
    transaction.failedAt = new Date();
    await transaction.save();

    const booking = await Booking.findById(transaction.bookingId);
    if (booking && booking.paymentStatus === BOOKING_PAYMENT_STATUS.PAYMENT_PENDING) {
      booking.paymentStatus = booking.amountPaid > 0
        ? BOOKING_PAYMENT_STATUS.PARTIALLY_PAID
        : BOOKING_PAYMENT_STATUS.UNPAID;
      await booking.save();
    }

    await this.sendPaymentNotification(
      transaction,
      NOTIFICATION_TYPE.PAYMENT_FAILED,
      transaction.payerId,
      'Payment failed'
    );
  }

  // ============================================
  // CANCELLATION & REFUND
  // ============================================

  /**
   * Cancel payment for a booking (expire sessions, cancel pending txns)
   */
  async cancelBookingPayment(bookingId) {
    const booking = await Booking.findById(bookingId);
    if (!booking) throw new Error('Booking not found');

    if (booking.stripeSessionIds && booking.stripeSessionIds.length > 0 && this.stripe) {
      for (const sid of booking.stripeSessionIds) {
        try {
          const sess = await this.stripe.checkout.sessions.retrieve(sid);
          if (sess.status === 'open') await this.stripe.checkout.sessions.expire(sid);
        } catch (err) {
          // ignore
        }
      }
    }

    await Transaction.updateMany(
      { bookingId, status: { $in: [TRANSACTION_STATUS.INITIATED, TRANSACTION_STATUS.PENDING] } },
      { $set: { status: TRANSACTION_STATUS.CANCELLED, failureReason: 'Booking cancelled' } }
    );

    booking.paymentStatus = BOOKING_PAYMENT_STATUS.CANCELLED;
    await booking.save();
    return booking;
  }

  /**
   * Process refund (full or partial)
   */
  async processRefund(bookingId, amount, reason, adminId) {
    const booking = await Booking.findById(bookingId);
    if (!booking) throw new Error('Booking not found');
    if (booking.amountPaid <= 0) throw new Error('No payments to refund');

    const refundPreview = await refundService.previewRefund(bookingId, { cancelledByRole: 'careseeker' });
    const eligibleRefundAmount = Number(refundPreview.totalRefund || 0);

    if (eligibleRefundAmount <= 0) {
      throw new Error(refundPreview.refundDecisionReason || 'Refund not eligible for this booking');
    }

    const requestedRefundAmount = amount == null || amount === ''
      ? eligibleRefundAmount
      : Number(amount);

    if (!Number.isFinite(requestedRefundAmount) || requestedRefundAmount <= 0) {
      throw new Error('Refund amount must be a positive number');
    }

    if (requestedRefundAmount > eligibleRefundAmount) {
      throw new Error(`Refund (${requestedRefundAmount}) exceeds eligible refund (${eligibleRefundAmount})`);
    }

    const refundAmount = round2(requestedRefundAmount);

    const paymentTxns = await Transaction.find({
      bookingId,
      type: TRANSACTION_TYPE.PAYMENT,
      status: TRANSACTION_STATUS.COMPLETED,
    }).sort({ completedAt: 1 });

    if (paymentTxns.length === 0) throw new Error('No completed payments found');

    let totalRefunded = 0;
    const stripeRefundIds = [];

    for (const txn of paymentTxns) {
      if (totalRefunded >= refundAmount) break;
      const refundForTxn = Math.min(txn.amount, refundAmount - totalRefunded);

      if (this.stripe && txn.stripePaymentIntentId) {
        try {
          const sr = await this.stripe.refunds.create({
            payment_intent: txn.stripePaymentIntentId,
            amount: Math.round(refundForTxn * 100),
            reason: 'requested_by_customer',
          });
          stripeRefundIds.push(sr.id);
        } catch (err) {
          throw new Error(`Stripe refund failed: ${err.message}`);
        }
      }
      totalRefunded += refundForTxn;
    }

    // Create refund transaction
    const refundNumber = await Transaction.generateTransactionNumber('refund');
    const refundTransaction = new Transaction({
      transactionNumber: refundNumber,
      type: TRANSACTION_TYPE.REFUND,
      bookingId,
      payerId: paymentTxns[0].payeeId,
      payeeId: paymentTxns[0].payerId,
      amount: totalRefunded,
      platformFee: 0,
      netAmount: totalRefunded,
      currency: paymentTxns[0].currency,
      status: TRANSACTION_STATUS.COMPLETED,
      paymentMethod: 'stripe_checkout',
      stripeRefundId: stripeRefundIds[0] || null,
      description: `Refund for booking #${booking.bookingNumber}: ${reason}`,
      refund: {
        reason,
        requestedAt: new Date(),
        processedAt: new Date(),
        amount: totalRefunded,
        stripeRefundId: stripeRefundIds.join(', '),
        status: 'processed',
      },
      processedAt: new Date(),
      completedAt: new Date(),
      metadata: { adminId, stripeRefundIds },
    });

    await refundTransaction.save();

    // Update booking
    booking.payment = booking.payment || {};
    booking.amountDue = Math.max((booking.totalAmount || 0) - (booking.amountPaid || 0), 0);

    if (totalRefunded >= Number(booking.amountPaid || 0)) {
      booking.paymentStatus = BOOKING_PAYMENT_STATUS.REFUNDED;
      booking.payment.status = 'refunded';
    } else {
      booking.paymentStatus = BOOKING_PAYMENT_STATUS.PARTIALLY_REFUNDED;
      booking.payment.status = 'partially_refunded';
    }

    booking.cancellation = {
      ...(booking.cancellation || {}),
      refundAmount: totalRefunded,
      refundStatus: 'processed',
      refundRequestedAt: booking.cancellation?.refundRequestedAt || new Date(),
      refundProcessedAt: new Date(),
      refundDecisionReason: reason,
    };
    await booking.save();

    await ledgerService.onRefundIssued({
      bookingId,
      transactionId: refundTransaction._id,
      careSeekerId: paymentTxns[0].payerId,
      amount: totalRefunded,
      currency: paymentTxns[0].currency,
    });

    const io = global.__careconnect_io;
    if (io) {
      const updatedWallet = await ledgerService.getWallet(paymentTxns[0].payerId);
      if (updatedWallet) {
        emitWalletUpdate(io, paymentTxns[0].payerId, {
          wallet: updatedWallet,
          event: 'refund_processed',
          refundTransactionId: refundTransaction._id,
          bookingId: booking._id,
          amount: totalRefunded,
        });
      }
    }

    // Notify
    await this.sendPaymentNotification(
      refundTransaction, NOTIFICATION_TYPE.REFUND_PROCESSED,
      paymentTxns[0].payerId, 'Refund processed'
    );

    const payer = await User.findById(paymentTxns[0].payerId);
    if (payer) {
      try {
        await emailService.sendGenericNotificationEmail(
          payer.email, payer.fullName, 'Refund Processed',
          `A refund of ${paymentTxns[0].currency} ${totalRefunded.toFixed(2)} for booking #${booking.bookingNumber} has been processed.`
        );
      } catch (err) {
        console.error('Failed to send refund email:', err.message);
      }
    }

    return refundTransaction;
  }

  // ============================================
  // PAYMENT RELEASE
  // ============================================

  async releasePayment(bookingId, adminId = null) {
    const booking = await Booking.findById(bookingId);
    if (!booking) throw new Error('Booking not found');
    if (booking.status !== BOOKING_STATUS.COMPLETED) {
      throw new Error('Payment can only be released for completed bookings');
    }
    if (booking.paymentStatus !== BOOKING_PAYMENT_STATUS.FULLY_PAID) {
      throw new Error('Payment can only be released when fully paid');
    }
    if (booking.payment.status === 'released') {
      throw new Error('Payment has already been released');
    }

    const paymentTxns = await Transaction.find({
      bookingId, type: TRANSACTION_TYPE.PAYMENT, status: TRANSACTION_STATUS.COMPLETED,
    });
    const totalNetAmount = paymentTxns.reduce((s, t) => s + t.netAmount, 0);

    const payoutNumber = await Transaction.generateTransactionNumber('payout');
    const payoutTx = new Transaction({
      transactionNumber: payoutNumber,
      type: TRANSACTION_TYPE.PAYOUT,
      bookingId,
      payerId: paymentTxns[0]?.payerId,
      payeeId: paymentTxns[0]?.payeeId,
      amount: totalNetAmount,
      platformFee: 0,
      netAmount: totalNetAmount,
      currency: paymentTxns[0]?.currency || 'USD',
      status: TRANSACTION_STATUS.COMPLETED,
      paymentMethod: 'bank_transfer',
      description: `Payout for booking #${booking.bookingNumber}`,
      processedAt: new Date(),
      completedAt: new Date(),
      metadata: { adminId },
    });
    await payoutTx.save();

    booking.payment.status = 'released';
    booking.payment.releasedAt = new Date();
    booking.payment.escrowHeld = false;
    await booking.save();

    if (paymentTxns[0]?.payeeId) {
      await User.findByIdAndUpdate(paymentTxns[0].payeeId, {
        $inc: { 'earnings.pending': -totalNetAmount, 'earnings.total': totalNetAmount },
        $set: { 'earnings.lastPayout': new Date() },
      });
    }

    await this.sendPaymentNotification(
      payoutTx, NOTIFICATION_TYPE.PAYOUT_SENT,
      paymentTxns[0]?.payeeId, 'Payment released to your account'
    );

    return payoutTx;
  }

  // ============================================
  // DEADLINE MANAGEMENT
  // ============================================

  async handleExpiredDeadlines() {
    const expired = await Booking.find({
      paymentDeadline: { $lt: new Date() },
      paymentStatus: { $in: ['unpaid', 'payment_pending', 'partially_paid'] },
      status: { $in: ['payment_pending', 'confirmed', 'active', 'in_progress'] },
    });

    const results = [];
    for (const booking of expired) {
      try {
        // Expire open Stripe sessions
        if (booking.stripeSessionIds && this.stripe) {
          for (const sid of booking.stripeSessionIds) {
            try {
              const sess = await this.stripe.checkout.sessions.retrieve(sid);
              if (sess.status === 'open') await this.stripe.checkout.sessions.expire(sid);
            } catch (e) { /* ignore */ }
          }
        }

        // Expire all pending transactions across gateways
        await Transaction.updateMany(
          { bookingId: booking._id, status: { $in: [TRANSACTION_STATUS.INITIATED, TRANSACTION_STATUS.PENDING] } },
          { $set: { status: TRANSACTION_STATUS.EXPIRED, failedAt: new Date(), failureReason: 'Payment deadline expired' } }
        );

        if (booking.amountPaid <= 0) {
          // No payment received — auto-cancel
          if (booking.canTransitionTo(BOOKING_STATUS.CANCELLED)) {
            await bookingStateTransitionService.transition(
              booking,
              BOOKING_STATUS.CANCELLED,
              {
                source: 'payment.handleExpiredDeadlines',
                reason: 'Auto-cancelled due to payment deadline expiry',
                metadata: {
                  bookingId: booking._id?.toString?.() || null,
                },
              },
            );
            booking.paymentStatus = BOOKING_PAYMENT_STATUS.CANCELLED;
            booking.cancellation = {
              reason: 'Auto-cancelled: payment deadline expired',
              cancelledAt: new Date(),
              refundAmount: 0,
            };
          } else {
            booking.paymentStatus = BOOKING_PAYMENT_STATUS.EXPIRED;
          }
        } else {
          // Partial payment received — mark as expired (not cancelled, needs manual resolution)
          booking.paymentStatus = BOOKING_PAYMENT_STATUS.EXPIRED;
        }
        await booking.save();

        // Send deadline expiry notification to care seeker
        try {
          const careSeeker = await User.findById(booking.careSeekerId);
          if (careSeeker) {
            await Notification.createNotification({
              userId: booking.careSeekerId,
              type: NOTIFICATION_TYPE.PAYMENT_FAILED,
              title: 'Payment Deadline Expired',
              message: booking.amountPaid > 0
                ? `Payment deadline for booking #${booking.bookingNumber} has expired. Outstanding balance: NPR ${booking.amountDue.toFixed(2)}. Please contact support.`
                : `Booking #${booking.bookingNumber} has been auto-cancelled due to expired payment deadline.`,
              priority: 'high',
              data: {
                referenceId: booking._id,
                referenceType: 'booking',
                actionUrl: `/dashboard/bookings/${booking._id}`,
                metadata: { bookingNumber: booking.bookingNumber, amountDue: booking.amountDue },
              },
              channels: { inApp: true, email: true, push: true },
            });

            await emailService.sendGenericNotificationEmail(
              careSeeker.email, careSeeker.fullName, 'Payment Deadline Expired',
              booking.amountPaid > 0
                ? `The payment deadline for booking #${booking.bookingNumber} has expired with an outstanding balance of NPR ${booking.amountDue.toFixed(2)}. Please contact support to resolve this.`
                : `Booking #${booking.bookingNumber} has been auto-cancelled because the payment deadline expired without any payment received.`
            );
          }
        } catch (notifErr) {
          console.error(`Failed to send deadline expiry notification for ${booking._id}:`, notifErr.message);
        }

        results.push({ bookingId: booking._id, action: booking.amountPaid > 0 ? 'deadline_expired' : 'auto_cancelled' });
      } catch (err) {
        console.error(`Handle expired deadline error for ${booking._id}:`, err.message);
      }
    }
    return results;
  }

  // ============================================
  // PAYMENT REMINDERS
  // ============================================

  async sendPaymentReminders() {
    const now = new Date();
    const reminderThreshold = new Date(now.getTime() + PAYMENT_REMINDER_HOURS * 60 * 60 * 1000);
    const finalThreshold = new Date(now.getTime() + PAYMENT_REMINDER_FINAL_HOURS * 60 * 60 * 1000);

    // Find bookings with upcoming deadlines that still have outstanding balance
    const bookingsNeedingReminder = await Booking.find({
      paymentDeadline: { $gt: now, $lte: finalThreshold },
      paymentStatus: { $in: ['unpaid', 'payment_pending', 'partially_paid'] },
      status: { $in: ['payment_pending', 'confirmed', 'active', 'in_progress'] },
      amountDue: { $gt: 0 },
    }).populate('careSeekerId', 'fullName email');

    const results = [];
    for (const booking of bookingsNeedingReminder) {
      try {
        const hoursLeft = Math.ceil((booking.paymentDeadline - now) / (1000 * 60 * 60));
        const isUrgent = hoursLeft <= PAYMENT_REMINDER_HOURS;
        const careSeeker = booking.careSeekerId;
        if (!careSeeker) continue;

        await Notification.createNotification({
          userId: careSeeker._id,
          type: NOTIFICATION_TYPE.PAYMENT_PENDING,
          title: isUrgent ? 'Urgent: Payment Due Soon' : 'Payment Reminder',
          message: `Booking #${booking.bookingNumber} has NPR ${booking.amountDue.toFixed(2)} outstanding. Payment deadline: ${hoursLeft} hours remaining.`,
          priority: isUrgent ? 'high' : 'normal',
          data: {
            referenceId: booking._id,
            referenceType: 'booking',
            actionUrl: `/dashboard/bookings/${booking._id}/payment`,
            metadata: { bookingNumber: booking.bookingNumber, amountDue: booking.amountDue, hoursLeft },
          },
          channels: { inApp: true, email: isUrgent, push: isUrgent },
        });

        if (isUrgent) {
          await emailService.sendGenericNotificationEmail(
            careSeeker.email, careSeeker.fullName, 'Urgent: Payment Due Soon',
            `Your booking #${booking.bookingNumber} has an outstanding balance of NPR ${booking.amountDue.toFixed(2)}. ` +
            `The payment deadline expires in ${hoursLeft} hours. Please make your payment to avoid cancellation.`
          );
        }

        results.push({ bookingId: booking._id, hoursLeft, isUrgent });
      } catch (err) {
        console.error(`Failed to send payment reminder for ${booking._id}:`, err.message);
      }
    }
    return results;
  }

  // ============================================
  // TRANSACTION QUERIES
  // ============================================

  async getUserTransactions(userId, filters = {}) {
    const query = { $or: [{ payerId: userId }, { payeeId: userId }] };
    if (filters.type) query.type = filters.type;
    if (filters.status) query.status = filters.status;
    if (filters.startDate && filters.endDate) {
      query.createdAt = { $gte: new Date(filters.startDate), $lte: new Date(filters.endDate) };
    }

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 10;
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      Transaction.find(query)
        .populate('bookingId', 'bookingNumber serviceType schedule status paymentStatus totalAmount amountPaid amountDue')
        .populate('payerId', 'fullName email avatar')
        .populate('payeeId', 'fullName email avatar')
        .sort({ createdAt: -1 }).skip(skip).limit(limit),
      Transaction.countDocuments(query),
    ]);

    return { transactions, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async getTransactionById(transactionId, userId) {
    const transaction = await Transaction.findById(transactionId)
      .populate('bookingId', 'bookingNumber serviceType schedule pricing careRecipient status paymentStatus totalAmount amountPaid amountDue paymentDeadline')
      .populate('payerId', 'fullName email avatar phone')
      .populate('payeeId', 'fullName email avatar phone');

    if (!transaction) throw new Error('Transaction not found');

    if (userId) {
      const pId = (transaction.payerId._id || transaction.payerId).toString();
      const eId = (transaction.payeeId._id || transaction.payeeId).toString();
      const involved = pId === userId.toString() || eId === userId.toString();
      const user = await User.findById(userId);
      if (!involved && user?.role !== USER_ROLES.ADMIN) {
        throw new Error('Not authorized to view this transaction');
      }
    }
    return transaction;
  }

  async getBookingPaymentSummary(bookingId, userId) {
    const booking = await Booking.findById(bookingId)
      .populate('careSeekerId', 'fullName email')
      .populate('caregiverId', 'fullName email');
    if (!booking) throw new Error('Booking not found');

    if (userId) {
      const csId = (booking.careSeekerId._id || booking.careSeekerId).toString();
      const cgId = (booking.caregiverId._id || booking.caregiverId).toString();
      const user = await User.findById(userId);
      if (csId !== userId.toString() && cgId !== userId.toString() && user?.role !== USER_ROLES.ADMIN) {
        throw new Error('Not authorized to view payment summary');
      }
    }

    const transactions = await Transaction.find({ bookingId }).sort({ createdAt: -1 });
    const payments = transactions.filter(t => t.type === TRANSACTION_TYPE.PAYMENT && t.status === TRANSACTION_STATUS.COMPLETED);
    const refunds = transactions.filter(t => t.type === TRANSACTION_TYPE.REFUND);

    // Sprint-05: Fallback to pricing.total if totalAmount was never synced (old bookings)
    const effectiveTotalAmount = booking.totalAmount > 0
      ? booking.totalAmount
      : (booking.pricing?.total || 0);
    const effectiveAmountPaid = booking.amountPaid || 0;
    const effectiveAmountDue = Math.max(0, effectiveTotalAmount - effectiveAmountPaid);

    // Check if booking has pricing issues
    const hasPricingIssue = effectiveTotalAmount <= 0;
    const pricingWarning = hasPricingIssue
      ? 'This booking has no valid price set. The caregiver may not have configured their service rates. Please contact support.'
      : null;

    return {
      booking: {
        _id: booking._id,
        bookingNumber: booking.bookingNumber,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        totalAmount: effectiveTotalAmount,
        amountPaid: effectiveAmountPaid,
        amountDue: effectiveAmountDue,
        paymentDeadline: booking.paymentDeadline,
        isPaymentExpired: booking.isPaymentExpired(),
        canAcceptPayment: booking.canAcceptPayment() && !hasPricingIssue, // Block payment if no valid price
        isReviewEligible: booking.isReviewEligible(),
        hasPricingIssue,
        pricingWarning,
      },
      transactions,
      summary: {
        totalPayments: payments.length,
        totalRefunds: refunds.length,
        totalPaid: effectiveAmountPaid,
        totalRefunded: refunds.reduce((s, t) => s + t.amount, 0),
        outstandingDue: effectiveAmountDue,
        paymentDeadline: booking.paymentDeadline,
        deadlineExpired: booking.isPaymentExpired(),
        hasPricingIssue,
      },
    };
  }

  // ============================================
  // EARNINGS DASHBOARD
  // ============================================

  async getEarningsDashboard(caregiverId) {
    const user = await User.findById(caregiverId).select('earnings bankDetails');
    const payouts = await Transaction.find({
      payeeId: caregiverId, type: TRANSACTION_TYPE.PAYOUT, status: TRANSACTION_STATUS.COMPLETED,
    }).sort({ createdAt: -1 }).limit(10);

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const monthlyEarnings = await Transaction.aggregate([
      { $match: { payeeId: user._id, type: TRANSACTION_TYPE.PAYMENT, status: TRANSACTION_STATUS.COMPLETED, createdAt: { $gte: twelveMonthsAgo } } },
      { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, total: { $sum: '$netAmount' }, count: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const weeklyAgg = await Transaction.aggregate([
      { $match: { payeeId: user._id, type: TRANSACTION_TYPE.PAYMENT, status: TRANSACTION_STATUS.COMPLETED, createdAt: { $gte: startOfWeek } } },
      { $group: { _id: null, total: { $sum: '$netAmount' }, count: { $sum: 1 } } },
    ]);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyTotal = await Transaction.aggregate([
      { $match: { payeeId: user._id, type: TRANSACTION_TYPE.PAYMENT, status: TRANSACTION_STATUS.COMPLETED, createdAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$netAmount' }, count: { $sum: 1 } } },
    ]);

    const pendingRev = await Transaction.aggregate([
      { $match: { payeeId: user._id, type: TRANSACTION_TYPE.PAYMENT, status: { $in: [TRANSACTION_STATUS.PENDING, TRANSACTION_STATUS.INITIATED] } } },
      { $group: { _id: null, total: { $sum: '$netAmount' }, count: { $sum: 1 } } },
    ]);

    return {
      overview: {
        totalEarnings: user.earnings?.total || 0,
        pendingEarnings: user.earnings?.pending || 0,
        withdrawnEarnings: user.earnings?.withdrawn || 0,
        lastPayout: user.earnings?.lastPayout,
        weeklyEarnings: weeklyAgg[0]?.total || 0,
        monthlyEarnings: monthlyTotal[0]?.total || 0,
        pendingTransactions: pendingRev[0]?.count || 0,
        pendingAmount: pendingRev[0]?.total || 0,
      },
      monthlyBreakdown: monthlyEarnings.map(e => ({ year: e._id.year, month: e._id.month, total: e.total, count: e.count })),
      recentPayouts: payouts,
      bankDetails: {
        hasBankDetails: !!(user.bankDetails?.accountNumber),
        bankName: user.bankDetails?.bankName || null,
        verified: user.bankDetails?.verified || false,
      },
    };
  }

  // ============================================
  // ADMIN
  // ============================================

  async getAllTransactions(filters = {}) {
    const query = {};
    if (filters.type) query.type = filters.type;
    if (filters.status) query.status = filters.status;
    if (filters.paymentMethod) query.paymentMethod = filters.paymentMethod;
    if (filters.startDate && filters.endDate) {
      query.createdAt = { $gte: new Date(filters.startDate), $lte: new Date(filters.endDate) };
    }
    if (filters.search) {
      query.$or = [
        { transactionNumber: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 10;
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      Transaction.find(query)
        .populate('bookingId', 'bookingNumber serviceType paymentStatus')
        .populate('payerId', 'fullName email avatar')
        .populate('payeeId', 'fullName email avatar')
        .sort({ createdAt: -1 }).skip(skip).limit(limit),
      Transaction.countDocuments(query),
    ]);

    const stats = await this.getTransactionStats();
    return { transactions, pagination: { page, limit, total, pages: Math.ceil(total / limit) }, stats };
  }

  async getTransactionStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalRev, monthlyRev, totalRef, pendingPay, pendingPayouts] = await Promise.all([
      Transaction.aggregate([
        { $match: { type: TRANSACTION_TYPE.PAYMENT, status: TRANSACTION_STATUS.COMPLETED } },
        { $group: { _id: null, total: { $sum: '$amount' }, fees: { $sum: '$platformFee' }, count: { $sum: 1 } } },
      ]),
      Transaction.aggregate([
        { $match: { type: TRANSACTION_TYPE.PAYMENT, status: TRANSACTION_STATUS.COMPLETED, createdAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' }, fees: { $sum: '$platformFee' }, count: { $sum: 1 } } },
      ]),
      Transaction.aggregate([
        { $match: { type: TRANSACTION_TYPE.REFUND, status: TRANSACTION_STATUS.COMPLETED } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Transaction.countDocuments({ type: TRANSACTION_TYPE.PAYMENT, status: { $in: [TRANSACTION_STATUS.PENDING, TRANSACTION_STATUS.INITIATED] } }),
      PayoutRequest.countDocuments({ status: 'pending' }),
    ]);

    return {
      totalRevenue: totalRev[0]?.total || 0,
      totalPlatformFees: totalRev[0]?.fees || 0,
      totalTransactions: totalRev[0]?.count || 0,
      monthlyRevenue: monthlyRev[0]?.total || 0,
      monthlyPlatformFees: monthlyRev[0]?.fees || 0,
      monthlyTransactions: monthlyRev[0]?.count || 0,
      totalRefunds: totalRef[0]?.total || 0,
      refundCount: totalRef[0]?.count || 0,
      pendingPayments: pendingPay,
      pendingPayouts,
    };
  }

  // ============================================
  // INVOICE DATA
  // ============================================

  async getInvoiceData(transactionId, userId) {
    const transaction = await this.getTransactionById(transactionId, userId);
    if (!transaction.invoice) throw new Error('Invoice not available for this transaction');

    const booking = await Booking.findById(transaction.bookingId)
      .populate('careSeekerId', 'fullName email phone location')
      .populate('caregiverId', 'fullName email phone location');

    return {
      invoice: transaction.invoice,
      transaction: {
        transactionNumber: transaction.transactionNumber,
        type: transaction.type,
        amount: transaction.amount,
        platformFee: transaction.platformFee,
        netAmount: transaction.netAmount,
        currency: transaction.currency,
        status: transaction.status,
        paymentMethod: transaction.paymentMethod,
        receiptUrl: transaction.receiptUrl,
        isPartialPayment: transaction.isPartialPayment,
        runningAmountPaid: transaction.runningAmountPaid,
        runningAmountDue: transaction.runningAmountDue,
        createdAt: transaction.createdAt,
        completedAt: transaction.completedAt,
      },
      booking: booking ? {
        bookingNumber: booking.bookingNumber,
        serviceType: booking.serviceType,
        schedule: booking.schedule,
        careSeeker: booking.careSeekerId,
        caregiver: booking.caregiverId,
        careRecipient: booking.careRecipient,
        totalAmount: booking.totalAmount,
        amountPaid: booking.amountPaid,
        amountDue: booking.amountDue,
        paymentStatus: booking.paymentStatus,
      } : null,
      company: {
        name: 'CareConnect',
        email: 'billing@careconnect.com',
        website: process.env.FRONTEND_URL || 'https://careconnect.com',
      },
    };
  }

  // ============================================
  // NOTIFICATIONS
  // ============================================

  async _sendPaymentNotifications(transaction, booking) {
    await this.sendPaymentNotification(transaction, NOTIFICATION_TYPE.PAYMENT_RECEIVED, transaction.payerId, 'Payment successful');
    await this.sendPaymentNotification(transaction, NOTIFICATION_TYPE.PAYMENT_RECEIVED, transaction.payeeId, 'New payment received');

    const payer = await User.findById(transaction.payerId);
    if (payer) {
      const label = transaction.isPartialPayment ? 'Partial Payment' : 'Payment';
      try {
        await emailService.sendGenericNotificationEmail(
          payer.email, payer.fullName, `${label} Confirmation`,
          `Your ${label.toLowerCase()} of ${transaction.currency} ${transaction.amount.toFixed(2)} for booking #${booking.bookingNumber} has been processed successfully.` +
          (transaction.isPartialPayment ? ` Outstanding balance: ${transaction.currency} ${transaction.runningAmountDue.toFixed(2)}` : '')
        );
      } catch (err) {
        console.error('Failed to send payment email:', err.message);
      }
    }
  }

  async sendPaymentNotification(transaction, type, userId, customTitle = null) {
    const resolveActionUrl = async () => {
      const walletUrlByRole = async () => {
        const user = await User.findById(userId).select('role').lean();
        if (user?.role === USER_ROLES.CAREGIVER) return '/dashboard/caregiver/wallet';
        if (user?.role === USER_ROLES.CARESEEKER) return '/dashboard/careseeker/wallet';
        return '/dashboard/payments';
      };

      if ([
        NOTIFICATION_TYPE.PAYMENT_RECEIVED,
        NOTIFICATION_TYPE.PAYMENT_RELEASED,
        NOTIFICATION_TYPE.REFUND_PROCESSED,
        NOTIFICATION_TYPE.PAYOUT_SENT,
      ].includes(type)) {
        return walletUrlByRole();
      }

      if ([NOTIFICATION_TYPE.PAYMENT_PENDING, NOTIFICATION_TYPE.PAYMENT_FAILED].includes(type)) {
        return transaction.bookingId ? `/booking/${transaction.bookingId}/payment` : '/dashboard/payments';
      }

      return transaction.bookingId ? `/dashboard/bookings/${transaction.bookingId}` : '/dashboard/payments';
    };

    const actionUrl = await resolveActionUrl();

    const titles = {
      [NOTIFICATION_TYPE.PAYMENT_RECEIVED]: 'Payment Received',
      [NOTIFICATION_TYPE.PAYMENT_RELEASED]: 'Payment Released',
      [NOTIFICATION_TYPE.PAYMENT_PENDING]: 'Payment Pending',
      [NOTIFICATION_TYPE.PAYMENT_FAILED]: 'Payment Failed',
      [NOTIFICATION_TYPE.REFUND_PROCESSED]: 'Refund Processed',
      [NOTIFICATION_TYPE.PAYOUT_SENT]: 'Payout Sent',
    };

    const messages = {
      [NOTIFICATION_TYPE.PAYMENT_RECEIVED]: `Payment of ${transaction.currency} ${transaction.amount.toFixed(2)} received – #${transaction.transactionNumber}`,
      [NOTIFICATION_TYPE.PAYMENT_RELEASED]: `Payment of ${transaction.currency} ${transaction.netAmount.toFixed(2)} released`,
      [NOTIFICATION_TYPE.PAYMENT_PENDING]: `Payment of ${transaction.currency} ${transaction.amount.toFixed(2)} is pending`,
      [NOTIFICATION_TYPE.PAYMENT_FAILED]: `Payment of ${transaction.currency} ${transaction.amount.toFixed(2)} failed`,
      [NOTIFICATION_TYPE.REFUND_PROCESSED]: `Refund of ${transaction.currency} ${transaction.amount.toFixed(2)} processed`,
      [NOTIFICATION_TYPE.PAYOUT_SENT]: `Payout of ${transaction.currency} ${transaction.netAmount.toFixed(2)} sent`,
    };

    await Notification.createNotification({
      userId,
      type,
      title: customTitle || titles[type] || 'Payment Update',
      message: messages[type] || `Transaction #${transaction.transactionNumber} updated`,
      priority: type === NOTIFICATION_TYPE.PAYMENT_FAILED ? 'high' : 'normal',
      data: {
        referenceId: transaction._id,
        referenceType: 'payment',
        actionUrl,
        metadata: { transactionNumber: transaction.transactionNumber, amount: transaction.amount, type: transaction.type },
      },
      channels: { inApp: true, email: true, push: true },
    });
  }
}

export default new PaymentService();
