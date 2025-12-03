// ============================================
// PAYMENT ROUTES - Sprint-05
// Stripe Checkout, partial payments, invoices,
// webhook, admin controls
// ============================================

import { Router } from 'express';
import * as paymentController from '../controllers/payment/payment.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validateRequest } from '../shared/validators/joiRequest.validator.js';
import {
	checkoutSessionSchema,
	gatewayInitiateSchema,
	khaltiVerifySchema,
	esewaVerifySchema,
	bookingIdParamSchema,
	transactionIdParamSchema,
} from '../modules/payment/payment.validation.js';

const router = Router();
const validateBookingIdParam = validateRequest({ params: bookingIdParamSchema });
const validateTransactionIdParam = validateRequest({ params: transactionIdParamSchema });

// ---- Public ----
router.get('/config', paymentController.getStripeConfig);
router.get('/gateways', paymentController.getPaymentGatewaysConfig);
router.get('/khalti/config', paymentController.getKhaltiConfig);
router.get('/esewa/config', paymentController.getEsewaConfig);

// Stripe webhook (raw body applied in server.js BEFORE express.json)
router.post('/webhook', paymentController.stripeWebhook);

// ---- Authenticated ----
router.use(authenticate);

// Checkout Session (Stripe)
router.post('/checkout-session', validateRequest({ body: checkoutSessionSchema }), paymentController.createCheckoutSession);

// Khalti Payment
router.post('/khalti/initiate', validateRequest({ body: gatewayInitiateSchema }), paymentController.initiateKhaltiPayment);
router.post('/khalti/verify', validateRequest({ body: khaltiVerifySchema }), paymentController.verifyKhaltiPayment);

// eSewa Payment
router.post('/esewa/initiate', validateRequest({ body: gatewayInitiateSchema }), paymentController.initiateEsewaPayment);
router.post('/esewa/verify', validateRequest({ body: esewaVerifySchema }), paymentController.verifyEsewaPayment);

// Booking payment summary
router.get('/bookings/:bookingId/summary', validateBookingIdParam, paymentController.getBookingPaymentSummary);

// Transactions
router.get('/transactions', paymentController.getMyTransactions);
router.get('/transactions/export/csv', paymentController.exportTransactionsCSV);
router.get('/transactions/:transactionId', validateTransactionIdParam, paymentController.getTransactionById);

// Invoices
router.get('/transactions/:transactionId/invoice', validateTransactionIdParam, paymentController.getInvoice);
router.get('/transactions/:transactionId/invoice/pdf', validateTransactionIdParam, paymentController.downloadInvoicePDF);

// Final invoice (fully paid bookings only)
router.get('/bookings/:bookingId/final-invoice/pdf', validateBookingIdParam, paymentController.downloadFinalInvoicePDF);

// Earnings (caregiver)
router.get('/earnings', paymentController.getEarningsDashboard);

// ---- Admin ----
router.get('/admin/transactions', authorize('admin'), paymentController.getAllTransactions);
router.get('/admin/stats', authorize('admin'), paymentController.getTransactionStats);
router.get('/admin/payout-requests', authorize('admin'), paymentController.getPayoutRequests);
router.post('/admin/payout-requests/:requestId/approve', authorize('admin'), paymentController.approvePayoutRequest);
router.post('/admin/payout-requests/:requestId/reject', authorize('admin'), paymentController.rejectPayoutRequest);
router.post('/admin/:bookingId/release', authorize('admin'), validateBookingIdParam, paymentController.releasePayment);
router.post('/admin/:bookingId/refund', authorize('admin'), validateBookingIdParam, paymentController.processRefund);
router.post('/admin/:bookingId/cancel-payment', authorize('admin'), validateBookingIdParam, paymentController.cancelBookingPayment);
router.post('/admin/process-expired-deadlines', authorize('admin'), paymentController.processExpiredDeadlines);
router.post('/admin/send-payment-reminders', authorize('admin'), paymentController.triggerPaymentReminders);

export default router;
