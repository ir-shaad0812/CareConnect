"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Clock, AlertTriangle } from "lucide-react";
import { paymentService, type PaymentGateway } from "@/services/api/payment.service";

// -- Types --
interface PaymentGatewaySelectionProps {
  bookingId: string;
  totalAmount: number;
  amountDue: number;
  amountPaid: number;
  currency?: string;
  paymentDeadline?: string | null;
  bookingNumber?: string;
  serviceType?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
}

type GatewayId = "stripe" | "khalti" | "esewa";

interface GatewayOption {
  id: GatewayId;
  label: string;
  description: string;
  icon: React.ReactNode;
  currencies: string[];
  gradient: string;
  borderColor: string;
  available: boolean;
}

// -- Icons --
const StripeIcon = () => (
  <svg viewBox="0 0 40 40" className="w-8 h-8" fill="none">
    <rect width="40" height="40" rx="8" fill="#635BFF" />
    <path d="M18.75 16.73c0-.93.77-1.3 2.04-1.3 1.82 0 4.12.56 5.94 1.55V12.1c-2-.79-3.97-1.1-5.94-1.1-4.86 0-8.1 2.54-8.1 6.78 0 6.62 9.12 5.56 9.12 8.42 0 1.1-.96 1.46-2.3 1.46-1.99 0-4.54-.82-6.56-1.92v4.96c2.23.96 4.48 1.37 6.56 1.37 4.98 0 8.4-2.46 8.4-6.76-.01-7.15-9.16-5.88-9.16-8.58z" fill="white" />
  </svg>
);

const KhaltiIcon = () => (
  <svg viewBox="0 0 40 40" className="w-8 h-8" fill="none">
    <rect width="40" height="40" rx="8" fill="#5C2D91" />
    <text x="50%" y="56%" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="11" fontWeight="bold" fontFamily="Arial">K</text>
  </svg>
);

const EsewaIcon = () => (
  <svg viewBox="0 0 40 40" className="w-8 h-8" fill="none">
    <rect width="40" height="40" rx="8" fill="#60BB46" />
    <text x="50%" y="56%" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="10" fontWeight="bold" fontFamily="Arial">eSewa</text>
  </svg>
);

const ShieldIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const LockIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

// -- Main Component --
export function PremiumPaymentGateway({
  bookingId,
  totalAmount,
  amountDue,
  amountPaid,
  currency = "NPR",
  paymentDeadline,
  bookingNumber,
  serviceType,
  onSuccess,
  onError,
  onCancel,
}: PaymentGatewaySelectionProps) {
  const [selectedGateway, setSelectedGateway] = useState<GatewayId | null>(null);
  const [paymentMode, setPaymentMode] = useState<"full" | "partial">("full");
  const [partialAmount, setPartialAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [availableGateways, setAvailableGateways] = useState<Record<string, PaymentGateway>>({});
  const [loadingGateways, setLoadingGateways] = useState(true);

  const formatCurrency = useCallback(
    (amt: number) => {
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
    },
    [currency]
  );

  const deadlineDate = paymentDeadline ? new Date(paymentDeadline) : null;
  const isExpired = deadlineDate ? deadlineDate < new Date() : false;
  const progressPercent = totalAmount > 0 ? Math.min((amountPaid / totalAmount) * 100, 100) : 0;

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

  // Load available gateways
  useEffect(() => {
    async function loadGateways() {
      try {
        const response = await paymentService.getPaymentGatewaysConfig();
        if (response.success && response.data?.gateways) {
          setAvailableGateways(response.data.gateways);
          // Auto-select first available gateway
          const gws = response.data.gateways;
          if (gws.stripe?.available) setSelectedGateway("stripe");
          else if (gws.khalti?.available) setSelectedGateway("khalti");
          else if (gws.esewa?.available) setSelectedGateway("esewa");
        }
      } catch {
        // Fallback: assume Stripe available
        setSelectedGateway("stripe");
      } finally {
        setLoadingGateways(false);
      }
    }
    loadGateways();
  }, []);

  const GATEWAY_OPTIONS: GatewayOption[] = [
    {
      id: "stripe",
      label: "Stripe",
      description: "Credit/Debit Card",
      icon: <StripeIcon />,
      currencies: ["USD", "EUR", "GBP", "AUD", "CAD"],
      gradient: "from-[#635BFF]/5 to-[#635BFF]/10",
      borderColor: "border-[#635BFF]",
      available: !!availableGateways?.stripe?.available,
    },
    {
      id: "khalti",
      label: "Khalti",
      description: "Nepal Digital Wallet",
      icon: <KhaltiIcon />,
      currencies: ["NPR"],
      gradient: "from-[#5C2D91]/5 to-[#5C2D91]/10",
      borderColor: "border-[#5C2D91]",
      available: !!availableGateways?.khalti?.available,
    },
    {
      id: "esewa",
      label: "eSewa",
      description: "Nepal eSewa Wallet",
      icon: <EsewaIcon />,
      currencies: ["NPR"],
      gradient: "from-[#60BB46]/5 to-[#60BB46]/10",
      borderColor: "border-[#60BB46]",
      available: !!availableGateways?.esewa?.available,
    },
  ];

  const visibleGatewayOptions = GATEWAY_OPTIONS.filter((gateway) => gateway.available);
  const selectedGatewayOption = selectedGateway
    ? GATEWAY_OPTIONS.find((gateway) => gateway.id === selectedGateway) ?? null
    : null;

  const parsedPartialAmount = Number.parseFloat(partialAmount);
  const hasPartialInput = partialAmount.trim().length > 0;
  const isPartialAmountValid =
    Number.isFinite(parsedPartialAmount) && parsedPartialAmount > 0 && parsedPartialAmount <= amountDue;
  const payableAmount =
    paymentMode === "partial" && isPartialAmountValid ? parsedPartialAmount : amountDue;
  const disablePayAction =
    isProcessing ||
    !selectedGateway ||
    visibleGatewayOptions.length === 0 ||
    (paymentMode === "partial" && !isPartialAmountValid);

  const handlePayment = useCallback(async () => {
    if (!selectedGateway || isExpired) return;

    setIsProcessing(true);
    setError("");

    try {
      const amount = paymentMode === "partial" ? parseFloat(partialAmount) : undefined;

      if (paymentMode === "partial") {
        if (!amount || amount <= 0) throw new Error("Enter a valid partial payment amount");
        if (amount > amountDue) throw new Error(`Amount exceeds outstanding balance of ${formatCurrency(amountDue)}`);
      }

      if (selectedGateway === "stripe") {
        const response = await paymentService.createCheckoutSession(bookingId, amount);
        if (!response.success || !response.data) {
          throw new Error(response.message || "Failed to create checkout session");
        }
        window.location.href = response.data.sessionUrl;
      } else if (selectedGateway === "khalti") {
        const response = await paymentService.initiateKhaltiPayment(bookingId, amount);
        if (!response.success || !response.data) {
          throw new Error(response.message || "Failed to initiate Khalti payment");
        }
        window.location.href = response.data.paymentUrl;
      } else if (selectedGateway === "esewa") {
        const response = await paymentService.initiateEsewaPayment(bookingId, amount);
        if (!response.success || !response.data) {
          throw new Error(response.message || "Failed to initiate eSewa payment");
        }
        // eSewa uses a form POST redirect — create and submit hidden form
        const { formData, paymentUrl } = response.data;
        const form = document.createElement("form");
        form.method = "POST";
        form.action = paymentUrl;
        Object.entries(formData).forEach(([key, value]) => {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = key;
          input.value = String(value);
          form.appendChild(input);
        });
        document.body.appendChild(form);
        form.submit();
        return;
      }

      onSuccess?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Payment failed. Try again.";
      setError(msg);
      onError?.(msg);
    } finally {
      setIsProcessing(false);
    }
  }, [selectedGateway, paymentMode, partialAmount, bookingId, amountDue, isExpired, onSuccess, onError, formatCurrency]);

  // -- Fully Paid State --
  if (amountDue <= 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden rounded-2xl bg-linear-to-br from-emerald-50 via-white to-teal-50 border border-emerald-200"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-emerald-400 to-teal-400" />
        <div className="p-8 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            className="w-20 h-20 mx-auto mb-5 bg-linear-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200"
          >
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </motion.div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Payment Complete</h3>
          <p className="text-gray-600 mb-4">Full amount of {formatCurrency(totalAmount)} has been received.</p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 rounded-full text-emerald-700 text-sm font-medium">
            <ShieldIcon />
            Verified &amp; Secured
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl bg-white border border-[#E1E6EF] shadow-xl shadow-gray-100/50"
    >
      {/* Top Gradient Bar */}
      <div className="h-1.5 bg-linear-to-r from-primary-500 via-[#7C3AED] to-[#EC4899]" />

      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Make a Payment</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {bookingNumber && `Booking #${bookingNumber}`}
              {serviceType && ` · ${serviceType.replace(/_/g, " ")}`}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Choose payment method and amount, then continue to secure checkout.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full">
            <ShieldIcon />
            <span>Secure Payment</span>
          </div>
        </div>

        {/* Payment Progress Card */}
        <div className="relative bg-linear-to-br from-[#F0F5FF] via-white to-[#F8F5FF] rounded-xl p-5 border border-primary-500/10">
          <div className="grid grid-cols-3 gap-4 text-center mb-4">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total</p>
              <p className="text-lg font-bold text-gray-900 mt-0.5">{formatCurrency(totalAmount)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Paid</p>
              <p className="text-lg font-bold text-emerald-600 mt-0.5">{formatCurrency(amountPaid)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Due</p>
              <p className="text-lg font-bold text-amber-600 mt-0.5">{formatCurrency(amountDue)}</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="absolute inset-y-0 left-0 bg-linear-to-r from-primary-500 to-emerald-400 rounded-full"
            />
            {progressPercent > 0 && progressPercent < 100 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute inset-y-0 bg-white/30 rounded-full"
                style={{ left: `${progressPercent - 2}%`, width: "4%" }}
              />
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2 text-right">{progressPercent.toFixed(0)}% complete</p>
        </div>

        {/* Deadline Warning */}
        {deadlineDate && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${
              isExpired
                ? "bg-red-50 border border-red-200 text-red-700"
                : "bg-amber-50 border border-amber-200 text-amber-700"
            }`}
          >
            {isExpired ? (
              <AlertTriangle className="w-5 h-5 shrink-0" />
            ) : (
              <Clock className="w-5 h-5 shrink-0" />
            )}
            <div>
              <span className="font-semibold">
                {isExpired ? "Payment Deadline Expired" : `Deadline: ${deadlineDate.toLocaleDateString()}`}
              </span>
              <span className="ml-2 font-normal opacity-80">{getTimeRemaining()}</span>
            </div>
          </motion.div>
        )}

        {/* Gateway Selection */}
        {!isExpired && (
          <>
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-3 block">1. Select Payment Method</label>
              <p className="text-xs text-gray-500 mb-3">
                Pick a gateway to complete this payment.
              </p>
              {loadingGateways ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />
                  ))}
                </div>
              ) : visibleGatewayOptions.length === 0 ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Payment methods are temporarily unavailable. Please refresh and try again.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {visibleGatewayOptions.map((gateway) => (
                    <motion.button
                      key={gateway.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedGateway(gateway.id)}
                      className={`relative p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                        selectedGateway === gateway.id
                          ? `${gateway.borderColor} bg-linear-to-br ${gateway.gradient} shadow-lg`
                          : "border-[#E1E6EF] bg-white hover:border-gray-300 hover:shadow-md"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="shrink-0">{gateway.icon}</div>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{gateway.label}</p>
                            <p className="text-xs text-gray-500">{gateway.description}</p>
                          </div>
                        </div>
                        <span
                          className={`mt-1 inline-flex h-4 w-4 rounded-full border items-center justify-center ${
                            selectedGateway === gateway.id
                              ? "border-emerald-500 bg-emerald-50"
                              : "border-gray-300 bg-white"
                          }`}
                        >
                          {selectedGateway === gateway.id ? (
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          ) : null}
                        </span>
                      </div>
                      <div className="mt-2 flex gap-1">
                        {gateway.currencies.slice(0, 3).map((c) => (
                          <span key={c} className="text-[10px] bg-white/80 border border-gray-200 rounded px-1.5 py-0.5 text-gray-500 font-mono">
                            {c}
                          </span>
                        ))}
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>

            {/* Payment Mode */}
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-3 block">2. Choose Payment Amount</label>
              <p className="text-xs text-gray-500 mb-3">
                Pay the full due balance or enter a custom amount.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setPaymentMode("full")}
                  className={`p-4 rounded-xl border-2 text-center transition-all ${
                    paymentMode === "full"
                      ? "border-primary-500 bg-[#F0F5FF] shadow-md"
                      : "border-[#E1E6EF] bg-white hover:border-gray-300"
                  }`}
                >
                  <p className="font-semibold text-gray-900">Pay Full Balance</p>
                  <p className="text-sm text-gray-500 mt-0.5">{formatCurrency(amountDue)}</p>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setPaymentMode("partial")}
                  className={`p-4 rounded-xl border-2 text-center transition-all ${
                    paymentMode === "partial"
                      ? "border-primary-500 bg-[#F0F5FF] shadow-md"
                      : "border-[#E1E6EF] bg-white hover:border-gray-300"
                  }`}
                >
                  <p className="font-semibold text-gray-900">Partial Payment</p>
                  <p className="text-sm text-gray-500 mt-0.5">Custom amount</p>
                </motion.button>
              </div>

              <AnimatePresence>
                {paymentMode === "partial" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3"
                  >
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
                        {currency === "NPR" ? "Rs." : "$"}
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={amountDue}
                        value={partialAmount}
                        onChange={(e) => setPartialAmount(e.target.value)}
                        placeholder={`Max ${formatCurrency(amountDue)}`}
                        className="w-full pl-12 pr-4 py-3.5 border border-[#E1E6EF] rounded-xl text-gray-900 text-lg font-semibold focus:ring-2 focus:ring-[#4461F2] focus:border-transparent outline-none transition-shadow"
                      />
                    </div>
                    {hasPartialInput && !isPartialAmountValid && (
                      <p className="text-xs text-red-600 mt-2">
                        Enter an amount between {formatCurrency(0.01)} and {formatCurrency(amountDue)}.
                      </p>
                    )}
                    {hasPartialInput && isPartialAmountValid && (
                      <p className="text-xs text-gray-500 mt-2">
                        Remaining after payment: {formatCurrency(amountDue - parsedPartialAmount)}
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-gray-500">3. Confirm and Pay</p>
                <p className="text-sm text-gray-700 mt-0.5">
                  {selectedGatewayOption
                    ? `You will be redirected to ${selectedGatewayOption.label} to finish your payment.`
                    : "Select a payment method to continue."}
                </p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-[11px] uppercase tracking-wide text-gray-500">Amount to pay</p>
                <p className="text-lg font-bold text-gray-900 mt-0.5">{formatCurrency(payableAmount)}</p>
              </div>
            </div>
          </>
        )}

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl"
            >
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              <p className="text-sm">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        {!isExpired && (
          <div className="flex gap-3 pt-2">
            {onCancel && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onCancel}
                disabled={isProcessing}
                className="shrink-0 px-6 py-3.5 text-sm font-medium text-gray-700 bg-white border border-[#E1E6EF] rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50"
              >
                Cancel
              </motion.button>
            )}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handlePayment}
              disabled={disablePayAction}
              className="flex-1 relative overflow-hidden px-6 py-3.5 text-sm font-bold text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 bg-linear-to-r from-primary-500 to-[#7C3AED] hover:from-[#3651E0] hover:to-[#6D2ED9] shadow-lg shadow-[#4461F2]/25"
            >
              {isProcessing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Redirecting...</span>
                </>
              ) : (
                <>
                  <LockIcon />
                  <span>
                    {`Pay ${formatCurrency(payableAmount)}`}
                  </span>
                  <span className="ml-1 text-white/70">
                    via {selectedGatewayOption?.label ?? "Gateway"}
                  </span>
                </>
              )}
            </motion.button>
          </div>
        )}

        {/* Security Footer */}
        <div className="flex items-center justify-center gap-4 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <ShieldIcon />
            <span>SSL Encrypted</span>
          </div>
          <div className="w-px h-3 bg-gray-200" />
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <LockIcon />
            <span>PCI Compliant</span>
          </div>
          <div className="w-px h-3 bg-gray-200" />
          <div className="text-xs text-gray-400">
            {selectedGateway === "khalti" ? "Powered by Khalti" : selectedGateway === "esewa" ? "Powered by eSewa" : "Powered by Stripe"}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default PremiumPaymentGateway;
