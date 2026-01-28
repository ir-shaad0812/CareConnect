"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { paymentService } from "@/services/api/payment.service";

interface PaymentCheckoutFormProps {
  bookingId: string;
  totalAmount: number;
  amountDue: number;
  amountPaid: number;
  currency?: string;
  paymentDeadline?: string | null;
  onSuccess: (sessionUrl: string) => void;
  onError: (error: string) => void;
  onCancel?: () => void;
}

export function PaymentCheckoutForm({
  bookingId,
  totalAmount,
  amountDue,
  amountPaid,
  currency = "NPR",
  paymentDeadline,
  onSuccess,
  onError,
  onCancel,
}: PaymentCheckoutFormProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMode, setPaymentMode] = useState<"full" | "partial">("full");
  const [partialAmount, setPartialAmount] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState("");

  const formatCurrency = (amt: number) => {
    if (currency === "NPR") {
      return `Rs. ${new Intl.NumberFormat("en-NP", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amt)}`;
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(amt);
  };

  const deadlineDate = paymentDeadline ? new Date(paymentDeadline) : null;
  const isExpired = deadlineDate ? deadlineDate < new Date() : false;

  const getTimeRemaining = () => {
    if (!deadlineDate) return null;
    const diff = deadlineDate.getTime() - Date.now();
    if (diff <= 0) return "Expired";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days}d ${hours}h remaining`;
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m remaining`;
  };

  const handleCheckout = async () => {
    if (isExpired) {
      setErrorMessage("Payment deadline has expired. Contact support.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage("");

    try {
      const amount = paymentMode === "partial" ? parseFloat(partialAmount) : undefined;

      if (paymentMode === "partial") {
        if (!amount || amount <= 0) {
          throw new Error("Enter a valid partial payment amount");
        }
        if (amount > amountDue) {
          throw new Error(`Amount exceeds outstanding balance of ${formatCurrency(amountDue)}`);
        }
      }

      const response = await paymentService.createCheckoutSession(bookingId, amount);

      if (!response.success || !response.data) {
        throw new Error(response.message || "Failed to create checkout session");
      }

      const { sessionUrl } = response.data;
      onSuccess(sessionUrl);

      // Redirect to Stripe Checkout
      window.location.href = sessionUrl;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Payment failed. Try again.";
      setErrorMessage(message);
      onError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (amountDue <= 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-8"
      >
        <div className="w-16 h-16 mx-auto mb-4 bg-emerald-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Fully Paid</h3>
        <p className="text-gray-600">Total of {formatCurrency(totalAmount)} has been paid.</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Payment Summary */}
      <div className="bg-[#F0F5FF] rounded-xl p-5 border border-primary-500/10">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Payment Summary</h4>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Total Amount</span>
            <span className="font-medium text-gray-900">{formatCurrency(totalAmount)}</span>
          </div>
          {amountPaid > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Already Paid</span>
              <span className="font-medium text-emerald-600">{formatCurrency(amountPaid)}</span>
            </div>
          )}
          <div className="border-t border-primary-500/10 pt-2 flex justify-between">
            <span className="text-sm font-semibold text-gray-700">Outstanding Due</span>
            <span className="text-lg font-bold text-gray-900">{formatCurrency(amountDue)}</span>
          </div>
        </div>
      </div>

      {/* Payment Deadline */}
      {deadlineDate && (
        <div
          className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm ${
            isExpired
              ? "bg-red-50 border border-red-200 text-red-700"
              : "bg-amber-50 border border-amber-200 text-amber-700"
          }`}
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            Payment deadline: {deadlineDate.toLocaleDateString()} —{" "}
            <strong>{getTimeRemaining()}</strong>
          </span>
        </div>
      )}

      {/* Payment Mode Selection */}
      {amountDue > 0 && !isExpired && (
        <div className="space-y-3">
          <label className="text-sm font-semibold text-gray-700">Payment Option</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPaymentMode("full")}
              className={`p-3 rounded-xl border-2 text-center transition-all ${
                paymentMode === "full"
                  ? "border-primary-500 bg-[#F0F5FF]"
                  : "border-[#E1E6EF] bg-white hover:border-gray-300"
              }`}
            >
              <div className="text-sm font-semibold text-gray-900">Pay Full</div>
              <div className="text-xs text-gray-500 mt-1">{formatCurrency(amountDue)}</div>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMode("partial")}
              className={`p-3 rounded-xl border-2 text-center transition-all ${
                paymentMode === "partial"
                  ? "border-primary-500 bg-[#F0F5FF]"
                  : "border-[#E1E6EF] bg-white hover:border-gray-300"
              }`}
            >
              <div className="text-sm font-semibold text-gray-900">Partial</div>
              <div className="text-xs text-gray-500 mt-1">Custom amount</div>
            </button>
          </div>

          {/* Partial Amount Input */}
          {paymentMode === "partial" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="space-y-2"
            >
              <label className="text-sm text-gray-600">Enter amount ({currency})</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={amountDue}
                value={partialAmount}
                onChange={(e) => setPartialAmount(e.target.value)}
                placeholder={`Max ${formatCurrency(amountDue)}`}
                className="w-full px-4 py-3 border border-[#E1E6EF] rounded-xl text-gray-900 focus:ring-2 focus:ring-[#4461F2] focus:border-transparent outline-none"
              />
            </motion.div>
          )}
        </div>
      )}

      {/* Error */}
      {errorMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2"
        >
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {errorMessage}
        </motion.div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 bg-white border border-[#E1E6EF] rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={handleCheckout}
          disabled={isProcessing || isExpired}
          className="flex-1 px-4 py-3 text-sm font-semibold text-white bg-primary-500 rounded-xl hover:bg-[#2F4BDB] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Redirecting to Checkout...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              {paymentMode === "partial" && partialAmount
                ? `Pay ${formatCurrency(parseFloat(partialAmount))}`
                : `Pay ${formatCurrency(amountDue)}`}
            </>
          )}
        </button>
      </div>

      <p className="text-center text-xs text-gray-500">
        You will be redirected to Stripe&apos;s secure checkout page.
      </p>
    </div>
  );
}

export default PaymentCheckoutForm;
