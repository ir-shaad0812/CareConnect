// ============================================
// KHALTI PAYMENT SERVICE - Sprint-05
// Nepal-specific payment gateway integration
// Khalti e-Payment API v2
// ============================================

import Transaction from '../models/transaction.model.js';
import Booking from '../models/booking.model.js';
import User from '../models/user.model.js';
import Notification from '../models/notification.model.js';
import {
  TRANSACTION_TYPE,
  TRANSACTION_STATUS,
  BOOKING_PAYMENT_STATUS,
  PAYMENT_DEADLINE_DAYS,
} from '../constants/payment.constants.js';
import {
  BOOKING_STATUS,
  PLATFORM_FEE_PERCENTAGE,
  NOTIFICATION_TYPE,
} from '../constants/booking.constants.js';
import emailService from './email.service.js';
import chatAccessService from './chatAccess.service.js';
import chatService from './chat.service.js';
import bookingWorkflowQueueService from './bookingWorkflowQueue.service.js';
import bookingStateTransitionService from './bookingStateTransition.service.js';
import slotService from './slot.service.js';
import ledgerService from './ledger.service.js';
import { emitWalletUpdate } from '../config/socket.js';
import { eventBus, SYSTEM_EVENTS } from '../utils/eventBus.js';

const PAYABLE_BOOKING_STATUSES = [
  BOOKING_STATUS.PAYMENT_PENDING,
  BOOKING_STATUS.CONFIRMED,
  BOOKING_STATUS.ACTIVE,
  BOOKING_STATUS.IN_PROGRESS,
];

const getEffectiveBookingTotalAmount = (booking) => {
  const topLevelTotal = Number(booking.totalAmount || 0);
  if (topLevelTotal > 0) {
    return topLevelTotal;
  }

  const pricingTotal = Number(booking.pricing?.total || 0);
  if (pricingTotal > 0) {
    return pricingTotal;
  }

  return 0;
};

class KhaltiService {
  constructor() {
    const rawSecretKey = process.env.KHALTI_SECRET_KEY || '';
    const rawPublicKey = process.env.KHALTI_PUBLIC_KEY || '';

    // Khalti e-Payment v2 requires keys in specific format
    // Valid formats: live_secret_key_xxx, test_secret_key_xxx
    this.secretKey = rawSecretKey;
    this.publicKey = rawPublicKey;
    this.apiUrl = process.env.KHALTI_API_URL || 'https://a.khalti.com/api/v2';
    
    // Check if keys are in expected gateway format
    const hasValidSecretFormat = rawSecretKey.startsWith('live_secret_key_') || rawSecretKey.startsWith('test_secret_key_');
    const hasValidPublicFormat = rawPublicKey.startsWith('live_public_key_') || rawPublicKey.startsWith('test_public_key_');

    this.initialized = !!(rawSecretKey && rawPublicKey);
    this.startupStatus = {
      level: 'warn',
      message: 'Khalti disabled (missing credentials)',
    };

    if (this.initialized) {
      const keyType = rawSecretKey.startsWith('live_') ? 'LIVE' : 'TEST/SANDBOX';
      const formatsValid = hasValidSecretFormat && hasValidPublicFormat;

      if (keyType === 'LIVE' && formatsValid) {
        this.startupStatus = {
          level: 'ok',
          message: 'Khalti initialized (live mode)',
        };
      } else {
        this.startupStatus = {
          level: 'warn',
          message: 'Khalti running in sandbox mode; keys not verified',
        };
      }
    }
  }

  getStartupStatus() {
    return this.startupStatus;
  }

  /**
   * Get the proper authorization key format for Khalti API
   */
  getAuthKey() {
    return this.secretKey;
  }

  // ============================================
  // INITIATE PAYMENT (Khalti e-Payment)
  // ============================================

  /**
   * Create a Khalti payment session.
   * Khalti v2 uses "initiate" → redirect → "lookup" flow.
   *
   * @param {string} bookingId
   * @param {string} userId - Care seeker
   * @param {number|null} paymentAmount - null = pay full remaining
   * @returns {{ pidx: string, paymentUrl: string, transaction: Object }}
   */
  async initiatePayment(bookingId, userId, paymentAmount = null) {
    if (!this.initialized) {
      throw new Error('Khalti payment is not configured. Set KHALTI_SECRET_KEY and KHALTI_PUBLIC_KEY.');
    }

    const booking = await Booking.findById(bookingId)
      .populate('careSeekerId', 'fullName email phone')
      .populate('caregiverId', 'fullName email');

    if (!booking) throw new Error('Booking not found');

    // Authorization
    const careSeekerId = (booking.careSeekerId._id || booking.careSeekerId).toString();
    if (careSeekerId !== userId.toString()) {
      throw new Error('Only the care seeker can make payments for this booking');
    }

    // Status validations
    if (booking.status === BOOKING_STATUS.CANCELLED) {
      throw new Error('Cannot pay for a cancelled booking');
    }
    if (!PAYABLE_BOOKING_STATUSES.includes(booking.status)) {
      throw new Error('Payment can only be made for agreement-approved, confirmed, or active bookings');
    }
    if (booking.paymentStatus === BOOKING_PAYMENT_STATUS.FULLY_PAID) {
      throw new Error('This booking has already been fully paid');
    }
    if (booking.paymentStatus === BOOKING_PAYMENT_STATUS.CANCELLED) {
      throw new Error('Payment has been cancelled for this booking');
    }
    if (booking.isPaymentExpired && booking.isPaymentExpired()) {
      throw new Error('Payment deadline has expired. Contact support for assistance.');
    }

    // Determine amount — fall back to pricing.total for bookings where totalAmount was never synced
    const effectiveTotalAmount = getEffectiveBookingTotalAmount(booking);
    
    // Validate that there is a valid total amount
    if (effectiveTotalAmount <= 0) {
      throw new Error(
        'This booking has no valid price set. The caregiver may not have configured their service rates. ' +
        'Please contact support or ask the caregiver to update their pricing.'
      );
    }

    const amountDue = effectiveTotalAmount - (booking.amountPaid || 0);
    if (amountDue <= 0) throw new Error('No outstanding amount to pay');

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

    // Cancel any existing pending Khalti transactions
    await Transaction.updateMany(
      {
        bookingId,
        type: TRANSACTION_TYPE.PAYMENT,
        paymentMethod: 'khalti',
        status: { $in: [TRANSACTION_STATUS.INITIATED, TRANSACTION_STATUS.PENDING] },
      },
      { $set: { status: TRANSACTION_STATUS.EXPIRED, failureReason: 'New payment session initiated' } }
    );

    // Khalti uses paisa (1 NPR = 100 paisa)
    // Minimum transaction: NPR 10 (1000 paisa), Maximum: NPR 200,000 (20000000 paisa)
    const amountInPaisa = Math.round(chargeAmount * 100);
    
    if (amountInPaisa < 1000) {
      throw new Error('Minimum payment amount for Khalti is NPR 10');
    }
    if (amountInPaisa > 20000000) {
      throw new Error('Maximum payment amount for Khalti is NPR 200,000');
    }

    // Ensure pricing object exists with defaults
    const pricing = booking.pricing || {};
    const platformFeePercentage = pricing.platformFeePercentage || PLATFORM_FEE_PERCENTAGE;

    // Create transaction record first
    const transactionNumber = await Transaction.generateTransactionNumber('payment');
    const platformFee = (chargeAmount * platformFeePercentage) / 100;

    const transaction = new Transaction({
      transactionNumber,
      type: TRANSACTION_TYPE.PAYMENT,
      bookingId: booking._id,
      payerId: booking.careSeekerId._id || booking.careSeekerId,
      payeeId: booking.caregiverId._id || booking.caregiverId,
      amount: chargeAmount,
      platformFee,
      platformFeePercentage,
      netAmount: chargeAmount - platformFee,
      currency: 'NPR',
      status: TRANSACTION_STATUS.INITIATED,
      paymentMethod: 'khalti',
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
            description: `${(booking.serviceType || 'care').replace(/_/g, ' ')} service`,
            quantity: pricing.totalHours || 1,
            unitPrice: pricing.rate || chargeAmount,
            total: chargeAmount,
          },
        ],
        subtotal: chargeAmount - platformFee,
        tax: pricing.taxes || 0,
        total: chargeAmount,
      },
    });

    await transaction.save();

    // Khalti e-Payment initiation
    const returnUrl = `${process.env.FRONTEND_URL}/booking/${booking._id}/payment?payment=khalti_verify&txnId=${transaction._id}`;

    const payload = {
      return_url: returnUrl,
      website_url: process.env.FRONTEND_URL || 'http://localhost:3000',
      amount: amountInPaisa,
      purchase_order_id: transaction.transactionNumber,
      purchase_order_name: `CareConnect Booking #${booking.bookingNumber}`,
      customer_info: {
        name: booking.careSeekerId.fullName || 'CareConnect User',
        email: booking.careSeekerId.email || '',
        phone: booking.careSeekerId.phone || '',
      },
      product_details: [
        {
          identity: booking._id.toString(),
          name: `${booking.serviceType.replace(/_/g, ' ')} Service`,
          total_price: amountInPaisa,
          quantity: 1,
          unit_price: amountInPaisa,
        },
      ],
    };

    let data;
    let response;
    
    try {
      response = await fetch(`${this.apiUrl}/epayment/initiate/`, {
        method: 'POST',
        headers: {
          'Authorization': `Key ${this.getAuthKey()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      data = await response.json();
    } catch (fetchError) {
      console.error('Khalti API fetch error:', fetchError.message);
      transaction.status = TRANSACTION_STATUS.FAILED;
      transaction.failureReason = 'Failed to connect to Khalti API';
      await transaction.save();
      throw new Error('Failed to connect to Khalti payment gateway. Please try again later.');
    }

    // Debug logging for Khalti API response
    if (!response.ok || !data.pidx) {
      console.error('Khalti API Error:', {
        status: response.status,
        response: data,
        hint: 'Get e-Payment v2 keys from https://test-admin.khalti.com/ (test) or https://admin.khalti.com/ (live)',
      });
    }

    if (!data.pidx) {
      transaction.status = TRANSACTION_STATUS.FAILED;
      const errorMsg = data.detail || data.error_key || data.message || JSON.stringify(data) || 'Khalti initiation failed';
      transaction.failureReason = errorMsg;
      await transaction.save();

      // Provide helpful error message based on error type
      if (errorMsg.toLowerCase().includes('invalid') || errorMsg.toLowerCase().includes('token') || errorMsg.toLowerCase().includes('key')) {
        throw new Error('Invalid Khalti API key. Please ensure you have valid e-Payment v2 keys configured.');
      }
      if (errorMsg.toLowerCase().includes('amount')) {
        throw new Error('Invalid payment amount. Minimum amount for Khalti is NPR 10.');
      }
      throw new Error(`Khalti payment failed: ${errorMsg}`);
    }

    // Store Khalti reference
    transaction.metadata = {
      ...(transaction.metadata || {}),
      khaltiPidx: data.pidx,
    };
    await transaction.save();

    // Update booking
    booking.stripeSessionIds = booking.stripeSessionIds || [];
    booking.stripeSessionIds.push(`khalti_${data.pidx}`);

    if (
      booking.paymentStatus === BOOKING_PAYMENT_STATUS.UNPAID ||
      booking.paymentStatus === BOOKING_PAYMENT_STATUS.PARTIALLY_PAID
    ) {
      booking.paymentStatus = BOOKING_PAYMENT_STATUS.PAYMENT_PENDING;
    }
    await booking.save();

    return {
      pidx: data.pidx,
      paymentUrl: data.payment_url,
      transaction,
      chargeAmount,
      isPartialPayment,
      amountDueAfter: amountDue - chargeAmount,
    };
  }

  // VERIFY / LOOKUP PAYMENT


  /**
   * Lookup/verify a Khalti payment using pidx.
   * Called after user returns from Khalti redirect.
   *
   * @param {string} pidx - Khalti payment index
   * @param {string} transactionId - Our transaction ID
   * @param {string} userId - For authorization
   */
  async verifyPayment(pidx, transactionId, userId) {
    if (!this.initialized) {
      throw new Error('Khalti is not configured');
    }

    const transaction = await Transaction.findById(transactionId);
    if (!transaction) throw new Error('Transaction not found');

    // Authorization
    if (transaction.payerId.toString() !== userId.toString()) {
      throw new Error('Unauthorized: You are not the payer for this transaction');
    }

    // Idempotency guard
    if (transaction.status === TRANSACTION_STATUS.COMPLETED) {
      return { transaction, alreadyProcessed: true };
    }

    // Khalti lookup
    let response;
    let data;
    
    try {
      response = await fetch(`${this.apiUrl}/epayment/lookup/`, {
        method: 'POST',
        headers: {
          'Authorization': `Key ${this.getAuthKey()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pidx }),
      });

      data = await response.json();
    } catch (fetchError) {
      console.error('Khalti lookup fetch error:', fetchError.message);
      throw new Error('Failed to verify payment with Khalti. Please try again.');
    }

    if (!response.ok) {
      console.error('Khalti lookup error:', { status: response.status, data });
      transaction.status = TRANSACTION_STATUS.FAILED;
      transaction.failureReason = data.detail || data.message || 'Khalti lookup failed';
      await transaction.save();
      throw new Error(data.detail || data.message || 'Payment verification failed');
    }

    // Khalti states: Completed, Pending, Initiated, Refunded, Expired, User canceled
    const khaltiStatus = data.status;

    if (khaltiStatus === 'Completed') {
      return await this._processSuccessfulPayment(transaction, data);
    } else if (khaltiStatus === 'Pending' || khaltiStatus === 'Initiated') {
      transaction.status = TRANSACTION_STATUS.PENDING;
      transaction.metadata = {
        ...(transaction.metadata || {}),
        khaltiStatus: khaltiStatus,
        khaltiTransactionId: data.transaction_id,
      };
      await transaction.save();
      return { transaction, status: 'pending' };
    } else if (khaltiStatus === 'Refunded') {
      transaction.status = TRANSACTION_STATUS.REFUNDED;
      transaction.metadata = {
        ...(transaction.metadata || {}),
        khaltiStatus: khaltiStatus,
        khaltiTransactionId: data.transaction_id,
      };
      await transaction.save();
      return { transaction, status: 'refunded' };
    } else {
      // Expired or User canceled
      transaction.status = TRANSACTION_STATUS.FAILED;
      transaction.failureReason = `Khalti payment ${khaltiStatus.toLowerCase()}`;
      transaction.metadata = {
        ...(transaction.metadata || {}),
        khaltiStatus: khaltiStatus,
      };
      await transaction.save();

      // Revert booking payment status
      const booking = await Booking.findById(transaction.bookingId);
      if (booking && booking.paymentStatus === BOOKING_PAYMENT_STATUS.PAYMENT_PENDING) {
        booking.paymentStatus = booking.amountPaid > 0
          ? BOOKING_PAYMENT_STATUS.PARTIALLY_PAID
          : BOOKING_PAYMENT_STATUS.UNPAID;
        await booking.save();
      }

      return { transaction, status: 'failed' };
    }
  }


  // PROCESS SUCCESSFUL PAYMENT

  async _processSuccessfulPayment(transaction, khaltiData) {
    transaction.status = TRANSACTION_STATUS.COMPLETED;
    transaction.processedAt = new Date();
    transaction.completedAt = new Date();
    transaction.metadata = {
      ...(transaction.metadata || {}),
      khaltiStatus: 'Completed',
      khaltiTransactionId: khaltiData.transaction_id,
      khaltiTotalAmount: khaltiData.total_amount,
      khaltiPidx: khaltiData.pidx,
      khaltiRefId: khaltiData.ref_id,
    };

    await transaction.save();

    // Update booking financials
    const booking = await Booking.findById(transaction.bookingId);
    if (!booking) {
      transaction.failureReason = 'Booking not found during verification';
      await transaction.save();
      throw new Error('Booking not found');
    }

    const effectiveTotalAmount = getEffectiveBookingTotalAmount(booking);
    const newAmountPaid = (booking.amountPaid || 0) + transaction.amount;
    const newAmountDue = Math.max(0, effectiveTotalAmount - newAmountPaid);

    transaction.runningAmountPaid = newAmountPaid;
    transaction.runningAmountDue = newAmountDue;
    await transaction.save();

    const previousBookingStatus = booking.status;

    booking.totalAmount = effectiveTotalAmount;
    booking.amountPaid = newAmountPaid;
    booking.amountDue = newAmountDue;
    booking.payment.status = 'held';
    booking.payment.method = 'khalti';
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
            source: 'khalti.processSuccessfulPayment',
            reason: 'Payment completed and escrow held',
            metadata: {
              gateway: 'khalti',
              transactionId: transaction._id?.toString?.() || null,
            },
          },
        );
      }
    } else {
      booking.paymentStatus = BOOKING_PAYMENT_STATUS.PARTIALLY_PAID;
    }

    await booking.save();

    // Wallet + ledger hooks (gateway parity with Stripe flow)
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
      console.error('[Khalti] Wallet capture hook failed:', ledgerErr.message);
    }

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
      console.error('[Khalti] Slot allocation hook failed:', slotErr.message);
    }

    // Push realtime domain events so dashboard widgets refresh immediately.
    eventBus.emitToUser(transaction.payerId, SYSTEM_EVENTS.BOOKING_PAYMENT_COMPLETED, {
      bookingId: booking._id?.toString?.() || booking._id,
      amount: transaction.amount,
      gateway: 'khalti',
      paymentStatus: booking.paymentStatus,
    });
    if (booking.status === BOOKING_STATUS.CONFIRMED) {
      eventBus.emitToBookingParties(
        transaction.payerId,
        transaction.payeeId,
        SYSTEM_EVENTS.BOOKING_CONFIRMED,
        {
          bookingId: booking._id?.toString?.() || booking._id,
          bookingNumber: booking.bookingNumber,
        },
      );
    }

    // Update caregiver pending earnings
    await User.findByIdAndUpdate(transaction.payeeId, {
      $inc: { 'earnings.pending': transaction.netAmount },
    });

    // Send notifications
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
          source: movedToConfirmed ? 'khalti_verify_payment_confirmed' : 'khalti_verify_full_payment',
          transactionId: transaction._id?.toString?.() || null,
          paymentGateway: 'khalti',
          paymentStatus: booking.paymentStatus,
        });
      } catch (queueError) {
        console.error(
          `[Khalti] Failed to enqueue booking.confirmed workflow for ${booking._id}:`,
          queueError.message,
        );
      }
    }

    console.log(
      `[Khalti] ✅ Payment verified: ${transaction.transactionNumber} | ` +
      `Paid: ${newAmountPaid}/${booking.totalAmount} | Status: ${booking.paymentStatus}`
    );

    return { transaction, status: 'completed' };
  }

  // ============================================
  // NOTIFICATIONS
  // ============================================

  async _sendPaymentNotifications(transaction, booking) {
    try {
      // Notify care seeker
      await Notification.createNotification({
        userId: transaction.payerId,
        type: NOTIFICATION_TYPE.PAYMENT_RECEIVED,
        title: 'Payment Confirmed (Khalti)',
        message: `Your payment of NPR ${transaction.amount.toFixed(2)} for booking #${booking.bookingNumber} has been confirmed via Khalti.`,
        priority: 'high',
        data: {
          referenceId: transaction._id,
          referenceType: 'transaction',
          actionUrl: `/dashboard/bookings/${booking._id}`,
          metadata: {
            amount: transaction.amount,
            bookingNumber: booking.bookingNumber,
            paymentMethod: 'khalti',
          },
        },
        channels: { inApp: true, email: true, push: true },
      });

      // Notify caregiver
      await Notification.createNotification({
        userId: transaction.payeeId,
        type: NOTIFICATION_TYPE.PAYMENT_RECEIVED,
        title: 'Payment Received',
        message: `Payment of NPR ${transaction.netAmount.toFixed(2)} received for booking #${booking.bookingNumber}.`,
        priority: 'normal',
        data: {
          referenceId: transaction._id,
          referenceType: 'transaction',
          actionUrl: `/dashboard/bookings/${booking._id}`,
        },
        channels: { inApp: true, email: true, push: true },
      });

      // Send email
      const careSeekerUser = await User.findById(transaction.payerId);
      if (careSeekerUser) {
        try {
          await emailService.sendPaymentConfirmationEmail(
            careSeekerUser.email,
            careSeekerUser.fullName,
            {
              amount: transaction.amount,
              currency: 'NPR',
              bookingNumber: booking.bookingNumber,
              transactionNumber: transaction.transactionNumber,
              paymentMethod: 'Khalti',
            }
          );
        } catch (emailErr) {
          console.error('Failed to send Khalti payment email:', emailErr.message);
        }
      }
    } catch (err) {
      console.error('Failed to send Khalti payment notifications:', err.message);
    }
  }

  // CONFIG

  getConfig() {
    return {
      publicKey: this.publicKey,
      isAvailable: this.initialized,
    };
  }
}

const khaltiService = new KhaltiService();
export default khaltiService;
