"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

interface PaymentResultBannerProps {
  onDismiss?: () => void;
}

/**
 * Reads `?payment=success|cancelled` from the URL search params
 * (set by Stripe Checkout redirect) and displays a banner.
 */
export function PaymentResultBanner({ onDismiss }: PaymentResultBannerProps) {
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [result, setResult] = useState<"success" | "cancelled" | null>(null);

  useEffect(() => {
    const paymentParam = searchParams.get("payment");
    if (paymentParam === "success" || paymentParam === "cancelled") {
      setResult(paymentParam);
      setVisible(true);

      // Auto-dismiss after 8s
      const timer = setTimeout(() => {
        setVisible(false);
        onDismiss?.();
      }, 8000);
      return () => clearTimeout(timer);
    }

    return undefined;
  }, [searchParams, onDismiss]);

  const handleDismiss = () => {
    setVisible(false);
    onDismiss?.();
  };

  return (
    <AnimatePresence>
      {visible && result && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`rounded-xl p-4 flex items-center justify-between ${
            result === "success"
              ? "bg-emerald-50 border border-emerald-200"
              : "bg-amber-50 border border-amber-200"
          }`}
        >
          <div className="flex items-center gap-3">
            {result === "success" ? (
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : (
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            )}
            <div>
              <p className={`text-sm font-semibold ${result === "success" ? "text-emerald-800" : "text-amber-800"}`}>
                {result === "success" ? "Payment Successful!" : "Payment Cancelled"}
              </p>
              <p className={`text-xs ${result === "success" ? "text-emerald-600" : "text-amber-600"}`}>
                {result === "success"
                  ? "Your payment has been processed. It may take a moment to update."
                  : "Payment was not completed. You can try again anytime."}
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-lg hover:bg-black/5 transition-colors"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default PaymentResultBanner;
