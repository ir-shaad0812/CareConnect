// ============================================
// ESEWA PAYMENT SERVICE - Sprint-05
// Nepal-specific payment gateway integration
// eSewa e-Payment API
// ============================================

import crypto from 'crypto';
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

const PLATFORM_FEE_PERCENTAGE = 10;

class EsewaService {
  constructor() {
    this.secretKey = process.env.ESEWA_SECRET_KEY;
    this.merchantCode = process.env.ESEWA_MERCHANT_CODE || 'EPAYTEST';
    this.apiUrl = process.env.ESEWA_API_URL || 'https://rc-epay.esewa.com.np';
    this.initialized = !!(this.secretKey && this.merchantCode);
    this.startupStatus = this.initialized
      ? { level: 'ok', message: 'eSewa initialized' }
      : { level: 'warn', message: 'eSewa disabled (missing credentials)' };
  }

  getStartupStatus() {
    return this.startupStatus;
  }

  // ============================================
  // CONFIG (public)
  // ============================================

  getConfig() {
    return {
      isAvailable: this.initialized,
      merchantCode: this.merchantCode || null,
    };
  }

  // ============================================
  // GENERATE HMAC SIGNATURE
  // ============================================

  _generateSignature(message) {
    const hmac = crypto.createHmac('sha256', this.secretKey);
    hmac.update(message);
    return hmac.digest('base64');
  }

  // ============================================
  // INITIATE PAYMENT
  // ============================================

  /**
   * Create an eSewa payment session.
   * eSewa uses a form-POST redirect flow:
   *   1. We return form data + signature
   *   2. Frontend submits the form to eSewa
   *   3. eSewa redirects back with encoded data
   *   4. We verify the response
   *
   * @param {string} bookingId
   * @param {string} userId - Care seeker
   * @param {number|null} paymentAmount - null = pay full remaining
   */
  async initiatePayment(bookingId, userId, paymentAmount = null) {
    if (!this.initialized) {
      throw new Error('eSewa payment is not configured. Set ESEWA_SECRET_KEY and ESEWA_MERCHANT_CODE.');
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
    if (booking.paymentStatus === BOOKING_PAYMENT_STATUS.EXPIRED) {
      throw new Error('Payment deadline has expired. Contact support for assistance.');
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

    // Cancel any existing pending eSewa transactions
    await Transaction.updateMany(
      {
        bookingId,
        type: TRANSACTION_TYPE.PAYMENT,
        paymentMethod: 'esewa',
        status: { $in: [TRANSACTION_STATUS.INITIATED, TRANSACTION_STATUS.PENDING] },
      },
      { $set: { status: TRANSACTION_STATUS.EXPIRED, failureReason: 'New payment session initiated' } }
    );

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
      currency: 'NPR',
      status: TRANSACTION_STATUS.INITIATED,
      paymentMethod: 'esewa',
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

    // eSewa form data
    const totalAmount = chargeAmount;
    const taxAmount = 0;
    const productServiceCharge = 0;
    const productDeliveryCharge = 0;
    const transactionUuid = transaction.transactionNumber;

    const signatureMessage = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${this.merchantCode}`;
    const signature = this._generateSignature(signatureMessage);

    // NOTE: Do NOT include query params in successUrl — eSewa always appends
    // "?data=<base64>" directly (no "&"), so any existing "?" results in a
    // malformed URL that breaks `transaction_uuid` lookup on return.
    // The transaction is identified on return via the signed eSewa response data.
    const successUrl = `${process.env.FRONTEND_URL}/booking/${booking._id}/payment`;
    const failureUrl = `${process.env.FRONTEND_URL}/booking/${booking._id}/payment?payment=failed`;

    const formData = {
      amount: chargeAmount,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      transaction_uuid: transactionUuid,
      product_code: this.merchantCode,
      product_service_charge: productServiceCharge,
      product_delivery_charge: productDeliveryCharge,
      success_url: successUrl,
      failure_url: failureUrl,
      signed_field_names: 'total_amount,transaction_uuid,product_code',
      signature,
    };

    // Update booking
    booking.esewaTransactionIds = booking.esewaTransactionIds || [];
    booking.esewaTransactionIds.push(transactionUuid);

    if (
      booking.paymentStatus === BOOKING_PAYMENT_STATUS.UNPAID ||
      booking.paymentStatus === BOOKING_PAYMENT_STATUS.PARTIALLY_PAID
    ) {
      booking.paymentStatus = BOOKING_PAYMENT_STATUS.PAYMENT_PENDING;
    }
    await booking.save();

    return {
      formData,
      paymentUrl: `${this.apiUrl}/api/epay/main/v2/form`,
      transaction,
      chargeAmount,
      isPartialPayment,
      amountDueAfter: amountDue - chargeAmount,
    };
  }

  // ============================================
  // VERIFY PAYMENT
  // ============================================

  /**
   * Verify an eSewa payment after redirect.
   * eSewa sends back a base64-encoded JSON object in the query param `data`.
   *
   * @param {string} encodedData - Base64-encoded response from eSewa
   * @param {string} transactionId - Our transaction ObjectId
   * @param {string} userId - For authorization
   */
  async verifyPayment(encodedData, userId) {
    if (!this.initialized) {
      throw new Error('eSewa is not configured');
    }

    // Decode eSewa response FIRST (before DB lookup)
    let decodedData;
    try {
      const jsonString = Buffer.from(encodedData, 'base64').toString('utf-8');
      decodedData = JSON.parse(jsonString);
    } catch {
      throw new Error('Invalid eSewa response data');
    }

    // Verify eSewa signature BEFORE touching DB (security-first)
    const esewaStatus = decodedData.status;
    const signatureMessage = `transaction_code=${decodedData.transaction_code},status=${esewaStatus},total_amount=${decodedData.total_amount},transaction_uuid=${decodedData.transaction_uuid},product_code=${this.merchantCode},signed_field_names=${decodedData.signed_field_names}`;
    const expectedSignature = this._generateSignature(signatureMessage);

    if (decodedData.signature !== expectedSignature) {
      throw new Error('eSewa payment verification failed: invalid signature');
    }

    // Look up transaction by transaction_uuid (our transactionNumber)
    // txnId is no longer passed via URL because eSewa appends "?data=" directly,
    // which would create a double-? in any existing query string.
    const transaction = await Transaction.findOne({
      transactionNumber: decodedData.transaction_uuid,
      paymentMethod: 'esewa',
    });
    if (!transaction) throw new Error('Transaction not found');

    // Authorization
    if (transaction.payerId.toString() !== userId.toString()) {
      throw new Error('Unauthorized: You are not the payer for this transaction');
    }

    // Idempotency guard
    if (transaction.status === TRANSACTION_STATUS.COMPLETED) {
      return { transaction, alreadyProcessed: true };
    }

    if (esewaStatus === 'COMPLETE') {
      return await this._processSuccessfulPayment(transaction, decodedData);
    } else if (esewaStatus === 'PENDING') {
      transaction.status = TRANSACTION_STATUS.PENDING;
      transaction.metadata = {
        ...(transaction.metadata || {}),
        esewaStatus,
        esewaTransactionCode: decodedData.transaction_code,
      };
      await transaction.save();
      return { transaction, status: 'pending' };
    } else {
      // FAILED, CANCELLED, etc.
      transaction.status = TRANSACTION_STATUS.FAILED;
      transaction.failureReason = `eSewa payment ${esewaStatus.toLowerCase()}`;
      transaction.metadata = {
        ...(transaction.metadata || {}),
        esewaStatus,
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

  // ============================================
  // PROCESS SUCCESSFUL PAYMENT
  // ============================================

  async _processSuccessfulPayment(transaction, esewaData) {
    transaction.status = TRANSACTION_STATUS.COMPLETED;
    transaction.processedAt = new Date();
    transaction.completedAt = new Date();
    transaction.metadata = {
      ...(transaction.metadata || {}),
      esewaStatus: 'COMPLETE',
      esewaTransactionCode: esewaData.transaction_code,
      esewaTotalAmount: esewaData.total_amount,
      esewaRefId: esewaData.ref_id,
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
    const previousBookingStatus = booking.status;

    transaction.runningAmountPaid = newAmountPaid;
    transaction.runningAmountDue = newAmountDue;
    await transaction.save();

    booking.totalAmount = effectiveTotalAmount;
    booking.amountPaid = newAmountPaid;
    booking.amountDue = newAmountDue;
    booking.payment.status = 'held';
    booking.payment.method = 'esewa';
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
            source: 'esewa.processSuccessfulPayment',
            reason: 'Payment completed and escrow held',
            metadata: {
              gateway: 'esewa',
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
      console.error('[eSewa] Wallet capture hook failed:', ledgerErr.message);
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
      console.error('[eSewa] Slot allocation hook failed:', slotErr.message);
    }

    // Push realtime domain events so dashboard widgets refresh immediately.
    eventBus.emitToUser(transaction.payerId, SYSTEM_EVENTS.BOOKING_PAYMENT_COMPLETED, {
      bookingId: booking._id?.toString?.() || booking._id,
      amount: transaction.amount,
      gateway: 'esewa',
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
          source: movedToConfirmed ? 'esewa_verify_payment_confirmed' : 'esewa_verify_full_payment',
          transactionId: transaction._id?.toString?.() || null,
          paymentGateway: 'esewa',
          paymentStatus: booking.paymentStatus,
        });
      } catch (queueError) {
        console.error(
          `[eSewa] Failed to enqueue booking.confirmed workflow for ${booking._id}:`,
          queueError.message,
        );
      }
    }

    console.log(
      `[eSewa] ✅ Payment verified: ${transaction.transactionNumber} | ` +
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
        type: NOTIFICATION_TYPE.PAYMENT_RECEIVED || 'payment_received',
        title: 'Payment Confirmed (eSewa)',
        message: `Your payment of NPR ${transaction.amount.toFixed(2)} for booking #${booking.bookingNumber} has been confirmed via eSewa.`,
        priority: 'normal',
        data: {
          referenceId: transaction._id,
          referenceType: 'transaction',
          actionUrl: `/dashboard/bookings/${booking._id}`,
          metadata: {
            amount: transaction.amount,
            bookingNumber: booking.bookingNumber,
            gateway: 'esewa',
          },
        },
        channels: { inApp: true, email: true, push: true },
      });

      // Notify caregiver
      await Notification.createNotification({
        userId: transaction.payeeId,
        type: NOTIFICATION_TYPE.PAYMENT_RECEIVED || 'payment_received',
        title: 'Payment Received',
        message: `Payment of NPR ${transaction.amount.toFixed(2)} received for booking #${booking.bookingNumber} via eSewa.`,
        priority: 'normal',
        data: {
          referenceId: transaction._id,
          referenceType: 'transaction',
          actionUrl: `/dashboard/bookings/${booking._id}`,
          metadata: {
            amount: transaction.amount,
            bookingNumber: booking.bookingNumber,
            gateway: 'esewa',
          },
        },
        channels: { inApp: true, push: true },
      });
    } catch (err) {
      console.error('[eSewa] Failed to send payment notifications:', err.message);
    }
  }
}

export default new EsewaService();
