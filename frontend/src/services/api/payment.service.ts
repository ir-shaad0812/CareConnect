// ============================================
// PAYMENT API SERVICE - Sprint-05
// Stripe Checkout Sessions, partial payments,
// PDF invoices, booking payment summary
// ============================================

import { apiClient } from "./client";
import { API_CONFIG, AUTH_CONFIG } from "@/config";
import type { ApiResponse, User } from "@/types";

// ---- Enums / Constants ----

export type TransactionType =
  | "payment"
  | "payout"
  | "refund"
  | "platform_fee"
  | "cancellation_fee";

export type TransactionStatus =
  | "initiated"
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled"
  | "expired"
  | "refunded"
  | "partially_refunded";

export type BookingPaymentStatus =
  | "unpaid"
  | "payment_pending"
  | "partially_paid"
  | "fully_paid"
  | "refunded"
  | "partially_refunded"
  | "cancelled"
  | "expired";

// ---- Interfaces ----

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface TransactionInvoice {
  invoiceNumber: string;
  issuedAt: string;
  dueDate?: string;
  items: InvoiceItem[];
  subtotal: number;
  tax?: number;
  total: number;
}

export interface TransactionRefund {
  amount: number;
  reason: string;
  processedAt?: string;
  processedBy?: string | User;
  stripeRefundId?: string;
  status?: string;
}

export interface Transaction {
  _id: string;
  transactionNumber: string;
  type: TransactionType;
  bookingId: string | {
    _id: string;
    bookingNumber: string;
    serviceType: string;
    status: string;
    paymentStatus: BookingPaymentStatus;
    totalAmount: number;
    amountPaid: number;
    amountDue: number;
  };
  payerId: string | User;
  payeeId: string | User;
  amount: number;
  platformFee: number;
  netAmount: number;
  currency: string;
  status: TransactionStatus;
  paymentMethod: string;
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  stripeCheckoutSessionId?: string;
  stripeRefundId?: string;
  receiptUrl?: string;
  isPartialPayment?: boolean;
  runningAmountPaid?: number;
  runningAmountDue?: number;
  description?: string;
  invoice?: TransactionInvoice;
  refund?: TransactionRefund;
  failureReason?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface CheckoutSessionData {
  sessionId: string;
  sessionUrl: string;
  transaction: Transaction;
  chargeAmount: number;
  isPartialPayment: boolean;
  partialPaymentAllowed?: boolean;
  amountDueAfter: number;
}

export interface KhaltiPaymentData {
  pidx: string;
  paymentUrl: string;
  transaction: Transaction;
  chargeAmount: number;
  isPartialPayment: boolean;
  amountDueAfter: number;
}

export interface KhaltiVerifyData {
  transaction: Transaction;
  status: string;
  alreadyProcessed?: boolean;
}

export interface EsewaPaymentData {
  formData: {
    amount: number;
    tax_amount: number;
    total_amount: number;
    transaction_uuid: string;
    product_code: string;
    product_service_charge: number;
    product_delivery_charge: number;
    success_url: string;
    failure_url: string;
    signed_field_names: string;
    signature: string;
  };
  paymentUrl: string;
  transaction: Transaction;
  chargeAmount: number;
  isPartialPayment: boolean;
  amountDueAfter: number;
}

export interface EsewaVerifyData {
  transaction: Transaction;
  status: string;
  alreadyProcessed?: boolean;
}

export interface PaymentGateway {
  available: boolean;
  publishableKey?: string | null;
  publicKey?: string | null;
  currencies: string[];
  label: string;
}

export interface PaymentGatewaysConfig {
  gateways: {
    stripe: PaymentGateway;
    khalti: PaymentGateway;
    esewa: PaymentGateway;
  };
}

export interface StripeConfig {
  publishableKey: string;
}

export interface BookingPaymentSummary {
  booking: {
    _id: string;
    bookingNumber: string;
    status: string;
    paymentStatus: BookingPaymentStatus;
    totalAmount: number;
    amountPaid: number;
    amountDue: number;
    paymentDeadline: string | null;
    isPaymentExpired: boolean;
    canAcceptPayment: boolean;
    partialPaymentAllowed?: boolean;
    allowedPaymentCadence?: string[];
    isReviewEligible: boolean;
    hasPricingIssue?: boolean;
    pricingWarning?: string | null;
  };
  transactions: Transaction[];
  summary: {
    totalPayments: number;
    totalRefunds: number;
    totalPaid: number;
    totalRefunded: number;
    outstandingDue: number;
    paymentDeadline: string | null;
    deadlineExpired: boolean;
    hasPricingIssue?: boolean;
  };
}

export interface EarningsOverview {
  totalEarnings: number;
  pendingEarnings: number;
  withdrawnEarnings: number;
  weeklyEarnings: number;
  monthlyEarnings: number;
  lastPayout?: string;
  pendingTransactions: number;
  pendingAmount: number;
}

export interface MonthlyBreakdown {
  year: number;
  month: number;
  total: number;
  earnings: number;
  count: number;
}

export interface RecentPayout {
  _id: string;
  transactionNumber: string;
  amount: number;
  netAmount: number;
  status: TransactionStatus;
  createdAt: string;
}

export interface EarningsDashboard {
  overview: EarningsOverview;
  monthlyBreakdown: MonthlyBreakdown[];
  recentPayouts: RecentPayout[];
  bankDetails: {
    hasBankDetails: boolean;
    isConfigured?: boolean;
    bankName: string | null;
    verified: boolean;
  };
}

export interface TransactionFilters {
  page?: number;
  limit?: number;
  type?: TransactionType;
  status?: TransactionStatus;
  startDate?: string;
  endDate?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface TransactionListResponse {
  transactions: Transaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface TransactionStats {
  totalRevenue: number;
  totalVolume: number;
  totalPlatformFees: number;
  totalTransactions: number;
  monthlyRevenue: number;
  monthlyPlatformFees: number;
  monthlyTransactions: number;
  totalRefunds: number;
  refundCount: number;
  pendingPayments: number;
  pendingPayouts?: number;
}

export interface AdminPayoutRequest {
  _id: string;
  caregiverId:
    | string
    | {
        _id: string;
        fullName?: string;
        email?: string;
        avatar?: string;
      };
  amount: number;
  currency: string;
  status: "pending" | "approved" | "rejected";
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  createdAt: string;
}

export interface InvoiceData {
  invoice: TransactionInvoice;
  transaction: {
    transactionNumber: string;
    type: string;
    amount: number;
    platformFee: number;
    netAmount: number;
    currency: string;
    status: string;
    paymentMethod: string;
    receiptUrl?: string;
    isPartialPayment?: boolean;
    runningAmountPaid?: number;
    runningAmountDue?: number;
    createdAt: string;
    completedAt?: string;
  };
  booking: {
    bookingNumber: string;
    serviceType: string;
    schedule: { startDate: string; endDate?: string };
    careSeeker: { fullName: string; email: string; phone?: string };
    caregiver: { fullName: string; email: string; phone?: string };
    totalAmount: number;
    amountPaid: number;
    amountDue: number;
    paymentStatus: BookingPaymentStatus;
  } | null;
  company: {
    name: string;
    email: string;
    website: string;
  };
}

// ---- Service ----

class PaymentService {
  // Get Stripe publishable key
  async getStripeConfig(): Promise<ApiResponse<StripeConfig>> {
    return apiClient.get<StripeConfig>("/payments/config");
  }

  // ---- Sprint-05: Checkout Sessions ----

  /**
   * Create a Stripe Checkout Session.
   * Supports partial payments when amount < totalDue.
   */
  async createCheckoutSession(
    bookingId: string,
    amount?: number
  ): Promise<ApiResponse<CheckoutSessionData>> {
    return apiClient.post<CheckoutSessionData>("/payments/checkout-session", {
      bookingId,
      ...(amount !== undefined && { amount }),
    });
  }

  // ---- Khalti Payment Gateway ----

  /**
   * Get available payment gateways config
   */
  async getPaymentGatewaysConfig(): Promise<ApiResponse<PaymentGatewaysConfig>> {
    return apiClient.get<PaymentGatewaysConfig>("/payments/gateways");
  }

  /**
   * Initiate Khalti payment session
   */
  async initiateKhaltiPayment(
    bookingId: string,
    amount?: number
  ): Promise<ApiResponse<KhaltiPaymentData>> {
    return apiClient.post<KhaltiPaymentData>("/payments/khalti/initiate", {
      bookingId,
      ...(amount !== undefined && { amount }),
    });
  }

  /**
   * Verify Khalti payment after redirect
   */
  async verifyKhaltiPayment(
    pidx: string,
    transactionId: string
  ): Promise<ApiResponse<KhaltiVerifyData>> {
    return apiClient.post<KhaltiVerifyData>("/payments/khalti/verify", {
      pidx,
      transactionId,
    });
  }

  // ---- eSewa Payment Gateway ----

  /**
   * Initiate eSewa payment session (returns form data for redirect)
   */
  async initiateEsewaPayment(
    bookingId: string,
    amount?: number
  ): Promise<ApiResponse<EsewaPaymentData>> {
    return apiClient.post<EsewaPaymentData>("/payments/esewa/initiate", {
      bookingId,
      ...(amount !== undefined && { amount }),
    });
  }

  /**
   * Verify eSewa payment after redirect
   */
  async verifyEsewaPayment(
    encodedResponse: string
  ): Promise<ApiResponse<EsewaVerifyData>> {
    return apiClient.post<EsewaVerifyData>("/payments/esewa/verify", {
      encodedResponse,
    });
  }

  // ---- Final Invoice ----

  /**
   * Download final invoice PDF (fully paid bookings only)
   */
  async downloadFinalInvoicePDF(bookingId: string): Promise<string> {
    const baseUrl = API_CONFIG.BASE_URL;
    const response = await fetch(
      `${baseUrl}/payments/bookings/${bookingId}/final-invoice/pdf`,
      {
        headers: {
          Authorization: `Bearer ${this._getToken()}`,
        },
      }
    );
    if (!response.ok) throw new Error("Failed to download final invoice PDF");
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }

  /**
   * Get booking payment summary (amounts, partial payments, deadline, etc.)
   */
  async getBookingPaymentSummary(
    bookingId: string
  ): Promise<ApiResponse<BookingPaymentSummary>> {
    return apiClient.get<BookingPaymentSummary>(
      `/payments/bookings/${bookingId}/summary`
    );
  }

  // ---- Transactions ----

  async getMyTransactions(
    filters: TransactionFilters = {}
  ): Promise<ApiResponse<TransactionListResponse>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== "") {
        params.append(key, String(value));
      }
    });
    const queryString = params.toString();
    return apiClient.get<TransactionListResponse>(
      `/payments/transactions${queryString ? `?${queryString}` : ""}`
    );
  }

  async getTransactionById(
    transactionId: string
  ): Promise<ApiResponse<{ transaction: Transaction }>> {
    return apiClient.get<{ transaction: Transaction }>(
      `/payments/transactions/${transactionId}`
    );
  }

  // ---- Earnings ----

  async getEarningsDashboard(): Promise<ApiResponse<{ dashboard: EarningsDashboard }>> {
    return apiClient.get<{ dashboard: EarningsDashboard }>("/payments/earnings");
  }

  // ---- Invoices ----

  async getInvoice(transactionId: string): Promise<ApiResponse<InvoiceData>> {
    return apiClient.get<InvoiceData>(
      `/payments/transactions/${transactionId}/invoice`
    );
  }

  /**
   * Download invoice as PDF. Returns a Blob URL for the browser.
   */
  async downloadInvoicePDF(transactionId: string): Promise<string> {
    const baseUrl = API_CONFIG.BASE_URL;
    const response = await fetch(
      `${baseUrl}/payments/transactions/${transactionId}/invoice/pdf`,
      {
        headers: {
          Authorization: `Bearer ${this._getToken()}`,
        },
      }
    );
    if (!response.ok) throw new Error("Failed to download invoice PDF");
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }

  // ---- Admin Methods ----

  async getAllTransactions(
    filters: TransactionFilters = {}
  ): Promise<ApiResponse<TransactionListResponse & { stats: TransactionStats }>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== "") {
        params.append(key, String(value));
      }
    });
    const queryString = params.toString();
    return apiClient.get<TransactionListResponse & { stats: TransactionStats }>(
      `/payments/admin/transactions${queryString ? `?${queryString}` : ""}`
    );
  }

  async getTransactionStats(): Promise<ApiResponse<{ stats: TransactionStats }>> {
    return apiClient.get<{ stats: TransactionStats }>("/payments/admin/stats");
  }

  async releasePayment(
    bookingId: string
  ): Promise<ApiResponse<{ transaction: Transaction }>> {
    return apiClient.post<{ transaction: Transaction }>(
      `/payments/admin/${bookingId}/release`
    );
  }

  async processRefund(
    bookingId: string,
    data: { amount?: number; reason: string }
  ): Promise<ApiResponse<{ transaction: Transaction }>> {
    return apiClient.post<{ transaction: Transaction }>(
      `/payments/admin/${bookingId}/refund`,
      data
    );
  }

  async cancelBookingPayment(
    bookingId: string
  ): Promise<ApiResponse<{ booking: unknown }>> {
    return apiClient.post<{ booking: unknown }>(
      `/payments/admin/${bookingId}/cancel-payment`
    );
  }

  async processExpiredDeadlines(): Promise<
    ApiResponse<{ processed: { bookingId: string; action: string }[] }>
  > {
    return apiClient.post<{
      processed: { bookingId: string; action: string }[];
    }>("/payments/admin/process-expired-deadlines");
  }

  async getAdminPayoutRequests(params: {
    status?: "pending" | "approved" | "rejected";
    limit?: number;
    skip?: number;
  } = {}): Promise<ApiResponse<{ requests: AdminPayoutRequest[]; total: number }>> {
    const query = new URLSearchParams();
    if (params.status) query.set("status", params.status);
    if (params.limit) query.set("limit", String(params.limit));
    if (params.skip) query.set("skip", String(params.skip));
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return apiClient.get<{ requests: AdminPayoutRequest[]; total: number }>(`/payments/admin/payout-requests${suffix}`);
  }

  async approvePayoutRequest(requestId: string): Promise<ApiResponse<unknown>> {
    return apiClient.post(`/payments/admin/payout-requests/${requestId}/approve`);
  }

  async rejectPayoutRequest(requestId: string, reason: string): Promise<ApiResponse<unknown>> {
    return apiClient.post(`/payments/admin/payout-requests/${requestId}/reject`, { reason });
  }

  // ---- CSV Export ----

  /**
   * Export transactions as CSV file download
   */
  async exportTransactionsCSV(filters: TransactionFilters = {}): Promise<void> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== "") {
        params.append(key, String(value));
      }
    });
    const queryString = params.toString();
    // Use the same base URL as the API client
    const baseUrl = API_CONFIG.BASE_URL;
    const response = await fetch(
      `${baseUrl}/payments/transactions/export/csv${queryString ? `?${queryString}` : ""}`,
      {
        headers: {
          Authorization: `Bearer ${this._getToken()}`,
        },
      }
    );
    if (!response.ok) throw new Error("Failed to export CSV");
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ---- Helpers ----

  private _getToken(): string {
    if (typeof window !== "undefined") {
      return localStorage.getItem(AUTH_CONFIG.TOKEN_KEY) || "";
    }
    return "";
  }
}

export const paymentService = new PaymentService();
export default paymentService;
