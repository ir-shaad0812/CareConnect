"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  paymentService,
  type BookingPaymentSummary,
  type Transaction,
} from "@/services/api/payment.service";

interface BookingPaymentDashboardProps {
  bookingId: string;
  onPayNow?: () => void;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  unpaid: { bg: "bg-gray-100", text: "text-gray-700", label: "Unpaid" },
  payment_pending: { bg: "bg-amber-100", text: "text-amber-700", label: "Payment Pending" },
  partially_paid: { bg: "bg-blue-100", text: "text-blue-700", label: "Partially Paid" },
  fully_paid: { bg: "bg-emerald-100", text: "text-emerald-700", label: "Fully Paid" },
  refunded: { bg: "bg-purple-100", text: "text-purple-700", label: "Refunded" },
  partially_refunded: { bg: "bg-orange-100", text: "text-orange-700", label: "Partially Refunded" },
  cancelled: { bg: "bg-red-100", text: "text-red-700", label: "Cancelled" },
};

const TX_STATUS_COLORS: Record<string, string> = {
  completed: "text-emerald-600",
  pending: "text-amber-600",
  initiated: "text-blue-600",
  failed: "text-red-600",
  cancelled: "text-gray-500",
  expired: "text-gray-400",
};

export function BookingPaymentDashboard({
  bookingId,
  onPayNow,
}: BookingPaymentDashboardProps) {
  const [data, setData] = useState<BookingPaymentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const resp = await paymentService.getBookingPaymentSummary(bookingId);
      if (resp.success && resp.data) {
        setData(resp.data);
      } else {
        setError(resp.message || "Failed to fetch payment data");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatCurrency = (amount: number, currency = "NPR") => {
    if (currency === "NPR") {
      return `Rs. ${new Intl.NumberFormat("en-NP", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount)}`;
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 bg-gray-200 rounded-xl" />
        <div className="h-20 bg-gray-200 rounded-xl" />
        <div className="h-40 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
        {error || "Failed to load payment data"}
      </div>
    );
  }

  const { booking, transactions, summary } = data;
  const statusInfo = STATUS_COLORS[booking.paymentStatus] || STATUS_COLORS.unpaid;
  const progressPercent = booking.totalAmount > 0
    ? Math.min(100, (booking.amountPaid / booking.totalAmount) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Payment Status Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-[#E1E6EF] p-6 shadow-sm"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Payment Status</h3>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusInfo.bg} ${statusInfo.text}`}>
            {statusInfo.label}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-500">
              Paid: {formatCurrency(booking.amountPaid)}
            </span>
            <span className="text-gray-500">
              Total: {formatCurrency(booking.totalAmount)}
            </span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={`h-full rounded-full ${
                progressPercent >= 100 ? "bg-emerald-500" : "bg-primary-500"
              }`}
            />
          </div>
          <div className="text-right mt-1">
            <span className="text-xs text-gray-400">{progressPercent.toFixed(0)}% paid</span>
          </div>
        </div>

        {/* Amount Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#F0F5FF] rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">Total</p>
            <p className="text-sm font-bold text-gray-900">
              {formatCurrency(booking.totalAmount)}
            </p>
          </div>
          <div className="bg-emerald-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">Paid</p>
            <p className="text-sm font-bold text-emerald-700">
              {formatCurrency(booking.amountPaid)}
            </p>
          </div>
          <div className={`rounded-xl p-3 text-center ${booking.amountDue > 0 ? "bg-amber-50" : "bg-gray-50"}`}>
            <p className="text-xs text-gray-500 mb-1">Due</p>
            <p className={`text-sm font-bold ${booking.amountDue > 0 ? "text-amber-700" : "text-gray-400"}`}>
              {formatCurrency(booking.amountDue)}
            </p>
          </div>
        </div>

        {/* Deadline */}
        {booking.paymentDeadline && (
          <div
            className={`mt-4 flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
              booking.isPaymentExpired
                ? "bg-red-50 text-red-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {booking.isPaymentExpired
              ? "Payment deadline has expired"
              : `Deadline: ${formatDate(booking.paymentDeadline)}`}
          </div>
        )}

        {/* Action */}
        {booking.canAcceptPayment && onPayNow && (
          <button
            onClick={onPayNow}
            className="mt-4 w-full px-4 py-3 text-sm font-semibold text-white bg-primary-500 rounded-xl hover:bg-[#2F4BDB] transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            {booking.amountPaid > 0 ? "Make Additional Payment" : "Pay Now"}
          </button>
        )}

        {/* Review Eligibility Note */}
        {booking.isReviewEligible && (
          <div className="mt-3 flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Eligible to submit a review
          </div>
        )}
      </motion.div>

      {/* Transaction History */}
      {transactions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-[#E1E6EF] p-6 shadow-sm"
        >
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Transaction History ({summary.totalPayments} payment{summary.totalPayments !== 1 ? "s" : ""})
          </h3>
          <div className="space-y-3">
            {transactions.map((tx: Transaction) => (
              <div
                key={tx._id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      tx.type === "payment"
                        ? "bg-primary-500/10 text-primary-500"
                        : tx.type === "refund"
                        ? "bg-purple-100 text-purple-600"
                        : "bg-emerald-100 text-emerald-600"
                    }`}
                  >
                    {tx.type === "payment" ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    ) : tx.type === "refund" ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {tx.transactionNumber}
                      {tx.isPartialPayment && (
                        <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] rounded font-semibold">
                          PARTIAL
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">{formatDate(tx.createdAt)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`text-sm font-semibold ${
                      tx.type === "refund" ? "text-purple-600" : "text-gray-900"
                    }`}
                  >
                    {tx.type === "refund" ? "-" : "+"}
                    {formatCurrency(tx.amount)}
                  </p>
                  <p className={`text-xs font-medium ${TX_STATUS_COLORS[tx.status] || "text-gray-500"}`}>
                    {tx.status.toUpperCase()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default BookingPaymentDashboard;
