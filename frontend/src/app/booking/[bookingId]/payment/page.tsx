"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authService } from "@/modules/auth/services";
import { Logo } from "@/components/ui/Logo";
import { bookingService, type Booking } from "@/modules/booking/services";
import {
  paymentService,
  type BookingPaymentSummary,
  type EsewaPaymentData,
} from "@/services/api/payment.service";

const GATEWAY_CONFIG = [
  {
    id: "khalti",
    label: "Khalti",
    description: "Pay via Khalti e-wallet",
    icon: (
      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#5C2D91] shadow-sm">
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="white">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
        </svg>
      </div>
    ),
    currencies: ["NPR"],
    badge: "Nepal",
    badgeColor: "bg-purple-100 text-purple-700",
    selectedBorder: "border-purple-500",
    selectedBg: "bg-purple-50",
    selectedRadio: "border-purple-500 bg-purple-500",
    buttonGradient: "from-[#5C2D91] to-[#7B3FBF]",
    buttonHover: "hover:from-[#4B257A] hover:to-[#6A2FA0]",
    buttonShadow: "hover:shadow-purple-200",
  },
  {
    id: "esewa",
    label: "eSewa",
    description: "Pay via eSewa e-wallet",
    icon: (
      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#60BB46] shadow-sm">
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="white">
          <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
        </svg>
      </div>
    ),
    currencies: ["NPR"],
    badge: "Nepal",
    badgeColor: "bg-emerald-100 text-emerald-700",
    selectedBorder: "border-emerald-500",
    selectedBg: "bg-emerald-50",
    selectedRadio: "border-emerald-500 bg-emerald-500",
    buttonGradient: "from-[#3E9A28] to-[#60BB46]",
    buttonHover: "hover:from-[#2F7A1C] hover:to-[#4FA837]",
    buttonShadow: "hover:shadow-green-200",
  },
  {
    id: "stripe",
    label: "Card / Stripe",
    description: "Visa, Mastercard, and more",
    icon: (
      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#635BFF] shadow-sm">
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="white">
          <path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
        </svg>
      </div>
    ),
    currencies: ["NPR", "USD"],
    badge: "International",
    badgeColor: "bg-indigo-100 text-indigo-700",
    selectedBorder: "border-indigo-500",
    selectedBg: "bg-indigo-50",
    selectedRadio: "border-indigo-500 bg-indigo-500",
    buttonGradient: "from-[#635BFF] to-[#4F46E5]",
    buttonHover: "hover:from-[#4F48CC] hover:to-[#3D37C0]",
    buttonShadow: "hover:shadow-indigo-200",
  },
];

const SERVICE_LABELS: Record<string, string> = {
  elderly_care: "Elderly Care",
  child_care: "Child Care",
  special_needs: "Special Needs",
  disability_care: "Disability Care",
  post_surgery: "Post-Surgery",
  companionship: "Companionship",
  respite_care: "Respite Care",
  palliative_care: "Palliative Care",
};

const HOUR_MS = 60 * 60 * 1000;
const DEADLINE_LEAD_HOURS_BY_DURATION: Record<string, number> = {
  hourly: 6,
  daily: 12,
  weekly: 24,
  monthly: 48,
};

const resolveScheduleAwareDeadline = (
  booking: Booking | null,
  rawDeadline: string | null | undefined,
): Date | null => {
  const fallbackDeadline = rawDeadline ? new Date(rawDeadline) : null;
  const hasFallbackDeadline =
    fallbackDeadline !== null && !Number.isNaN(fallbackDeadline.getTime());

  const startDateValue = booking?.schedule?.startDate;
  if (!startDateValue) {
    return hasFallbackDeadline ? fallbackDeadline : null;
  }

  const serviceStartDate = new Date(startDateValue);
  if (Number.isNaN(serviceStartDate.getTime())) {
    return hasFallbackDeadline ? fallbackDeadline : null;
  }

  const durationKey = String(
    booking?.durationType || booking?.pricing?.rateType || "",
  ).toLowerCase();
  const leadHours = DEADLINE_LEAD_HOURS_BY_DURATION[durationKey] ?? 24;
  const scheduleDeadline = new Date(serviceStartDate.getTime() - leadHours * HOUR_MS);

  if (!hasFallbackDeadline) {
    return scheduleDeadline;
  }

  return scheduleDeadline < fallbackDeadline ? scheduleDeadline : fallbackDeadline;
};

const formatNPR = (amount: number) =>
  new Intl.NumberFormat("en-NP", { style: "currency", currency: "NPR", maximumFractionDigits: 0 }).format(amount);

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = params.bookingId as string;
  const esewaFormRef = useRef<HTMLFormElement>(null);

  const [booking, setBooking] = useState<Booking | null>(null);
  const [summary, setSummary] = useState<BookingPaymentSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedGateway, setSelectedGateway] = useState<"khalti" | "esewa" | "stripe">("esewa");
  const [isPartial, setIsPartial] = useState(false);
  const [partialAmount, setPartialAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [esewaFormData, setEsewaFormData] = useState<EsewaPaymentData["formData"] | null>(null);
  const [esewaPaymentUrl, setEsewaPaymentUrl] = useState("");
  const [verifyStatus, setVerifyStatus] = useState<"idle" | "verifying" | "success" | "failed">("idle");

  // â”€â”€ Payment redirect-back verification (eSewa + Khalti) â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    const esewaData = searchParams.get("data");       // base64 response from eSewa
    const txnId = searchParams.get("txnId");          // our transaction ObjectId
    const paymentParam = searchParams.get("payment"); // "failed" | "khalti_verify"
    const khaltiPidx = searchParams.get("pidx");      // Khalti payment identifier

    if (paymentParam === "failed") {
      setVerifyStatus("failed");
      setError("Payment was cancelled or failed. Please try again.");
      return;
    }

    // â”€â”€ Khalti verification â”€â”€
    if (paymentParam === "khalti_verify" && khaltiPidx && txnId) {
      (async () => {
        setVerifyStatus("verifying");
        try {
          const res = await paymentService.verifyKhaltiPayment(khaltiPidx, txnId);
          if (res.success && (res.data?.status === "completed" || res.data?.alreadyProcessed)) {
            setVerifyStatus("success");
            setTimeout(() => router.push("/dashboard/bookings"), 3000);
          } else if (res.data?.status === "pending") {
            setVerifyStatus("idle");
            setError("Payment is pending verification. Please check back in a moment.");
          } else {
            setVerifyStatus("failed");
            setError("Khalti payment verification failed. If money was deducted, please contact support.");
          }
        } catch (err) {
          setVerifyStatus("failed");
          setError(err instanceof Error ? err.message : "Khalti payment verification failed.");
        }
      })();
      return;
    }

    // â”€â”€ eSewa verification â”€â”€
    // txnId is intentionally NOT checked here â€” eSewa appends "?data=" directly
    // to whatever success_url we send, so any "?" already in the URL produces a
    // malformed double-? URL.  We identify the transaction from the signed
    // eSewa response data (via transaction_uuid â†’ transactionNumber) instead.
    if (esewaData) {
      (async () => {
        setVerifyStatus("verifying");
        try {
          const res = await paymentService.verifyEsewaPayment(esewaData);
          if (res.success && res.data?.status === "completed") {
            setVerifyStatus("success");
            setTimeout(() => router.push("/dashboard/bookings"), 3000);
          } else if (res.data?.status === "pending") {
            setVerifyStatus("idle");
            setError("Payment is pending verification. Please check back in a moment.");
          } else {
            setVerifyStatus("failed");
            setError("Payment verification failed. If money was deducted, please contact support.");
          }
        } catch (err) {
          setVerifyStatus("failed");
          setError(err instanceof Error ? err.message : "Payment verification failed.");
        }
      })();
    }
  // Only run on mount based on URL params
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (!user) {
      router.push(`/login?redirect=/booking/${bookingId}/payment`);
      return;
    }
    if (user.role !== "careseeker") {
      router.push("/dashboard/bookings");
      return;
    }
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  // Auto-submit eSewa form when data arrives
  useEffect(() => {
    if (esewaFormData && esewaFormRef.current) {
      esewaFormRef.current.submit();
    }
  }, [esewaFormData]);

  const fetchData = async () => {
    setIsLoading(true);
    setError("");
    try {
      const [bookingRes, summaryRes] = await Promise.all([
        bookingService.getBookingById(bookingId),
        paymentService.getBookingPaymentSummary(bookingId),
      ]);

      if (bookingRes.success && bookingRes.data?.booking) {
        setBooking(bookingRes.data.booking);
      } else {
        setError("Booking not found.");
        return;
      }

      if (summaryRes.success && summaryRes.data) {
        setSummary(summaryRes.data);
        // Default partial amount to 50%
        const due = summaryRes.data.booking.amountDue;
        setPartialAmount(Math.ceil(due * 0.5).toString());
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load booking details.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const getPayAmount = (): number => {
    if (!summary) return 0;
    const due = summary.booking.amountDue;
    if (!isPartial) return due;
    const parsed = parseFloat(partialAmount);
    if (isNaN(parsed) || parsed <= 0) return due;
    return Math.min(parsed, due);
  };

  const getCannotPayMessage = (): string => {
    const status = booking?.status;

    if (status === "pending") {
      return "Your booking request is awaiting caregiver response.";
    }

    if (status === "accepted" || status === "agreement_pending") {
      return "Payment opens after both parties accept the service agreement.";
    }

    if (["cancelled", "rejected", "completed", "disputed", "expired"].includes(String(status))) {
      return "This booking is no longer payable in its current state.";
    }

    return "Payment is not available for this booking in its current state.";
  };

  const handlePay = async () => {
    if (!summary?.booking.canAcceptPayment) {
      setError(getCannotPayMessage());
      return;
    }

    if (isPartial && !summary?.booking.partialPaymentAllowed) {
      setError(
        "Partial payment is only available for long-term care plans.",
      );
      return;
    }

    setIsSubmitting(true);
    setError("");

    const amount = isPartial ? getPayAmount() : undefined;

    try {
      if (selectedGateway === "khalti") {
        const res = await paymentService.initiateKhaltiPayment(bookingId, amount);
        if (res.success && res.data?.paymentUrl) {
          window.location.href = res.data.paymentUrl;
        } else {
          setError("Failed to initiate Khalti payment.");
        }
      } else if (selectedGateway === "esewa") {
        const res = await paymentService.initiateEsewaPayment(bookingId, amount);
        if (res.success && res.data?.formData && res.data?.paymentUrl) {
          setEsewaPaymentUrl(res.data.paymentUrl);
          setEsewaFormData(res.data.formData);
          // form submission happens via useEffect
        } else {
          setError("Failed to initiate eSewa payment.");
        }
      } else {
        // Stripe
        const res = await paymentService.createCheckoutSession(bookingId, amount);
        if (res.success && res.data?.sessionUrl) {
          window.location.href = res.data.sessionUrl;
        } else {
          setError("Failed to initiate Stripe payment.");
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Payment initiation failed.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const cannotPay = !summary?.booking.canAcceptPayment;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50/40 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 font-medium">Loading payment details&hellip;</p>
        </div>
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50/40 to-indigo-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-10 max-w-sm w-full text-center">
          <div className="text-5xl mb-4">âš ï¸</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Unable to Load</h1>
          <p className="text-gray-500 text-sm mb-6">{error}</p>
          <Link href="/dashboard/bookings" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-500 text-white rounded-xl hover:bg-primary-600 font-semibold text-sm">
            â† Back to Bookings
          </Link>
        </div>
      </div>
    );
  }

  const payAmount = getPayAmount();
  const displayPaymentDeadline = resolveScheduleAwareDeadline(
    booking,
    summary?.booking.paymentDeadline ?? null,
  );
  const isPaymentExpired =
    Boolean(summary?.booking.isPaymentExpired) ||
    (displayPaymentDeadline !== null && displayPaymentDeadline.getTime() < Date.now());

  return (
    <div className="min-h-screen bg-linear-to-b from-[#39B54A]/5 via-white to-[#39B54A]/3">
      {/* Hidden eSewa form â€” auto-submitted when esewaFormData is set */}
      {esewaFormData && (
        <form ref={esewaFormRef} method="POST" action={esewaPaymentUrl} className="hidden">
          {Object.entries(esewaFormData).map(([key, value]) => (
            <input key={key} type="hidden" name={key} value={String(value)} />
          ))}
        </form>
      )}

      {/* eSewa Verification overlay */}
      {verifyStatus === "verifying" && (
        <div className="fixed inset-0 z-50 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
          <div className="w-14 h-14 border-4 border-[#60BB46] border-t-transparent rounded-full animate-spin" />
          <p className="text-lg font-bold text-gray-800">Verifying eSewa Payment&hellip;</p>
          <p className="text-sm text-gray-500">Please wait while we confirm your transaction.</p>
        </div>
      )}
      {verifyStatus === "success" && (
        <div className="fixed inset-0 z-50 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-xl font-extrabold text-gray-900">Payment Successful!</p>
          <p className="text-sm text-gray-500 text-center max-w-xs">Your payment has been confirmed. Redirecting to your bookings&hellip;</p>
        </div>
      )}

      {verifyStatus === "failed" && (
        <div className="fixed inset-0 z-50 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center gap-4 p-4">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <p className="text-xl font-extrabold text-gray-900">Payment Failed</p>
          <p className="text-sm text-gray-500 text-center max-w-xs">
            {error || "Payment could not be verified. If money was deducted, please contact support."}
          </p>
          <button
            onClick={() => { setVerifyStatus("idle"); setError(""); }}
            className="mt-2 px-6 py-2.5 bg-[#39B54A] text-white rounded-xl font-semibold text-sm hover:bg-primary-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#39B54A]/20 shadow-[0_1px_8px_rgba(57,181,74,0.08)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Logo variant="default" showText href="/home" />
          <Link href="/dashboard/bookings" className="text-sm text-gray-500 hover:text-[#39B54A] font-medium flex items-center gap-1.5 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Back to Bookings
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Hero strip */}
        <div className="bg-linear-to-r from-[#39B54A] to-primary-600 rounded-2xl px-6 py-5 mb-6 shadow-lg shadow-[#39B54A]/15">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-0.5">Secure Checkout</p>
              <h1 className="text-xl font-extrabold text-white">Complete Your Payment</h1>
              <p className="text-white/75 text-sm mt-0.5">Booking #{booking?.bookingNumber}</p>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 bg-white/15 px-3 py-1.5 rounded-xl">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              <span className="text-white text-xs font-semibold">Secured & Encrypted</span>
            </div>
          </div>
        </div>

        {/* Progress steps */}
        <div className="flex items-center gap-2 mb-6 text-xs font-semibold">
          <span className="flex items-center gap-1.5 text-[#39B54A]">
            <span className="w-5 h-5 rounded-full bg-[#39B54A]/15 flex items-center justify-center text-[#39B54A]">🍃1.</span>
            Booking Placed
          </span>
          <span className="flex-1 h-px bg-[#39B54A]/30" />
          <span className="flex items-center gap-1.5 text-[#39B54A]">
            <span className="w-5 h-5 rounded-full bg-[#39B54A] flex items-center justify-center text-white ring-2 ring-[#39B54A]/30">2</span>
            Payment
          </span>
          <span className="flex-1 h-px bg-gray-200" />
          <span className="flex items-center gap-1.5 text-gray-400">
            <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center">3</span>
            Service Starts
          </span>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* LEFT: Payment form */}
          <div className="lg:col-span-3 space-y-5">

            {/* Pricing issue warning - critical error */}
            {summary?.booking.hasPricingIssue && (
              <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-5 flex items-start gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-red-800 text-sm">Pricing Issue Detected</p>
                  <p className="text-red-700 text-sm mt-1">
                    {summary.booking.pricingWarning || 
                      "This booking has no valid price set. The caregiver may not have configured their service rates. Please contact support or the caregiver to resolve this issue."}
                  </p>
                  <Link 
                    href="/dashboard/bookings" 
                    className="inline-flex items-center gap-1.5 mt-3 text-sm font-semibold text-red-700 hover:text-red-800"
                  >
                    â† Return to Bookings
                  </Link>
                </div>
              </div>
            )}

            {/* Status banner when payment not yet available */}
            {cannotPay && !summary?.booking.hasPricingIssue && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div>
                  <p className="font-semibold text-amber-800 text-sm">Payment not available yet</p>
                  <p className="text-amber-700 text-sm mt-0.5">{getCannotPayMessage()}</p>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {error}
              </div>
            )}

            {/* Gateway Selection */}
            <div className="bg-white rounded-2xl shadow-sm border border-[#39B54A]/15 p-6">
              <h2 className="text-base font-bold text-gray-900 mb-1">Choose Payment Method</h2>
              <p className="text-xs text-gray-400 mb-4">All payments are processed securely in NPR</p>
              <div className="space-y-3">
                {GATEWAY_CONFIG.map((gw) => (
                  <label
                    key={gw.id}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedGateway === gw.id
                        ? `${gw.selectedBorder} ${gw.selectedBg}`
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="gateway"
                      value={gw.id}
                      checked={selectedGateway === gw.id}
                      onChange={() => setSelectedGateway(gw.id as typeof selectedGateway)}
                      className="sr-only"
                    />
                    <div className="shrink-0">{gw.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm">{gw.label}</p>
                      <p className="text-xs text-gray-400">{gw.description}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ${gw.badgeColor}`}>{gw.badge}</span>
                    <div className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                      selectedGateway === gw.id ? gw.selectedRadio : "border-slate-300"
                    }`}>
                      {selectedGateway === gw.id && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Partial Payment Toggle */}
            {!cannotPay &&
              summary &&
              summary.booking.amountDue > 0 &&
              summary.booking.partialPaymentAllowed && (
              <div className="bg-white rounded-2xl shadow-sm border border-[#39B54A]/15 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-bold text-gray-900">Partial Payment</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Pay a portion now, rest later</p>
                  </div>
                  <button
                    onClick={() => setIsPartial(!isPartial)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isPartial ? "bg-[#39B54A]" : "bg-slate-200"}`}
                  >
                    <span className={`inline-block w-4 h-4 bg-white rounded-full shadow transition-transform ${isPartial ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>

                {isPartial && (
                  <div className="mt-2">
                    <label className="block text-xs font-semibold text-gray-600 mb-2">
                      Amount to Pay (NPR) â€” Full due: {formatNPR(summary.booking.amountDue)}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">NPR</span>
                      <input
                        type="number"
                        value={partialAmount}
                        onChange={(e) => setPartialAmount(e.target.value)}
                        min={1}
                        max={summary.booking.amountDue}
                        className="w-full pl-12 pr-4 py-3 border border-[#39B54A]/30 rounded-xl focus:ring-2 focus:ring-[#39B54A]/30 focus:border-[#39B54A] outline-none text-sm"
                        placeholder="Enter amount"
                      />
                    </div>
                    <div className="flex gap-2 mt-2">
                      {[25, 50, 75].map((pct) => (
                        <button
                          key={pct}
                          onClick={() => setPartialAmount(Math.ceil(summary.booking.amountDue * pct / 100).toString())}
                          className="flex-1 py-1.5 text-xs font-semibold bg-[#39B54A]/5 border border-[#39B54A]/20 rounded-lg hover:bg-[#39B54A]/10 hover:border-[#39B54A]/40 hover:text-[#39B54A] transition-colors"
                        >
                          {pct}%
                        </button>
                      ))}
                      <button
                        onClick={() => setPartialAmount(summary.booking.amountDue.toString())}
                        className="flex-1 py-1.5 text-xs font-semibold bg-[#39B54A]/5 border border-[#39B54A]/20 rounded-lg hover:bg-[#39B54A]/10 hover:border-[#39B54A]/40 hover:text-[#39B54A] transition-colors"
                      >
                        Full
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!cannotPay &&
              summary &&
              summary.booking.amountDue > 0 &&
              !summary.booking.partialPaymentAllowed && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm text-slate-700">
                Partial payment is disabled for this booking type. Only long-term care plans support installment payments.
              </div>
            )}

            {/* Pay button */}
            {(() => {
              const gw = GATEWAY_CONFIG.find((g) => g.id === selectedGateway)!;
              return (
                <button
                  onClick={handlePay}
                  disabled={isSubmitting || cannotPay || payAmount <= 0}
                  className={`w-full py-4 bg-linear-to-r ${gw.buttonGradient} text-white font-bold rounded-2xl transition-all shadow-lg ${gw.buttonShadow} ${gw.buttonHover} disabled:opacity-50 disabled:cursor-not-allowed text-base flex items-center justify-center gap-2`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processing&hellip;
                    </>
                  ) : cannotPay ? (
                    "Payment Unavailable"
                  ) : (
                    <>
                      Pay {formatNPR(payAmount)} via {gw.label}
                    </>
                  )}
                </button>
              );
            })()}

            <p className="text-center text-xs text-gray-400 flex items-center justify-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-[#39B54A]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              Payments are processed securely. CareConnect never stores your card details.
            </p>
          </div>

          {/* RIGHT: Booking summary */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg border border-[#39B54A]/15 sticky top-24 overflow-hidden">
              <div className="bg-linear-to-br from-[#39B54A] to-primary-600 px-5 py-4">
                <p className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-1">Booking Summary</p>
                <p className="text-white font-bold text-lg">#{booking?.bookingNumber}</p>
                {booking?.caregiverId && typeof booking.caregiverId === "object" && "fullName" in booking.caregiverId && (
                  <p className="text-white/80 text-sm mt-0.5">
                    Caregiver: {(booking.caregiverId as { fullName: string }).fullName}
                  </p>
                )}
              </div>

              <div className="p-5 space-y-4">
                {/* Service & dates */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Service</span>
                    <span className="font-semibold text-gray-800 text-right">
                      {SERVICE_LABELS[booking?.serviceType || ""] || booking?.serviceType}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Start</span>
                    <span className="font-medium text-gray-700">
                      {booking?.schedule?.startDate
                        ? new Date(booking.schedule.startDate).toLocaleDateString("en-NP", { day: "numeric", month: "short", year: "numeric" })
                        : "â€”"}
                    </span>
                  </div>
                  {booking?.schedule?.endDate && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">End</span>
                      <span className="font-medium text-gray-700">
                        {new Date(booking.schedule.endDate).toLocaleDateString("en-NP", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">Type</span>
                    <span className="font-medium text-gray-700 capitalize">{booking?.durationType}</span>
                  </div>
                </div>

                {/* Pricing breakdown */}
                {booking?.pricing && ((booking.pricing.rate ?? booking.pricing.baseRate ?? booking.caregiverCurrentRate) > 0 || (booking.pricing.subtotal ?? 0) > 0) && (
                  <div className="border-t border-slate-100 pt-3 space-y-2 text-sm">
                    {(booking.pricing.rate ?? booking.pricing.baseRate ?? booking.caregiverCurrentRate ?? 0) > 0 && (
                      <div className="flex justify-between text-gray-500">
                        <span>Rate ({booking.pricing.rateType === "hourly" ? "per hr" : booking.pricing.rateType === "daily" ? "per day" : booking.pricing.rateType === "weekly" ? "per week" : "per month"})</span>
                        <span>{formatNPR(booking.pricing.rate ?? booking.pricing.baseRate ?? booking.caregiverCurrentRate ?? 0)}</span>
                      </div>
                    )}
                    {(booking.pricing.totalHours ?? 0) > 0 && (
                      <div className="flex justify-between text-gray-500">
                        <span>Hours</span>
                        <span>{booking.pricing.totalHours} hrs</span>
                      </div>
                    )}
                    {(booking.pricing.totalDays ?? 0) > 0 && (
                      <div className="flex justify-between text-gray-500">
                        <span>Days</span>
                        <span>{booking.pricing.totalDays} days</span>
                      </div>
                    )}
                    {(booking.pricing.subtotal ?? 0) > 0 && (
                      <div className="flex justify-between text-gray-600">
                        <span>Subtotal</span>
                        <span>{formatNPR(booking.pricing.subtotal!)}</span>
                      </div>
                    )}
                    {(booking.pricing.platformFee ?? 0) > 0 && (
                      <div className="flex justify-between text-gray-400 text-xs">
                        <span>Platform fee</span>
                        <span>{formatNPR(booking.pricing.platformFee!)}</span>
                      </div>
                    )}
                  </div>
                )}

                {summary && (
                  <div className="border-t border-slate-100 pt-4 space-y-2 text-sm">
                    <div className="flex justify-between text-gray-500">
                      <span>Total Amount</span>
                      <span>{formatNPR(summary.booking.totalAmount)}</span>
                    </div>
                    {summary.booking.amountPaid > 0 && (
                      <div className="flex justify-between text-emerald-600">
                        <span>Paid</span>
                        <span>- {formatNPR(summary.booking.amountPaid)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-gray-900 border-t border-[#39B54A]/10 pt-2 text-base">
                      <span>Amount Due</span>
                      <span className="text-[#39B54A]">{formatNPR(summary.booking.amountDue)}</span>
                    </div>
                    {isPartial && payAmount < summary.booking.amountDue && (
                      <div className="flex justify-between text-gray-500 text-xs">
                        <span>Remaining after this payment</span>
                        <span>{formatNPR(summary.booking.amountDue - payAmount)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Payment status */}
                <div className={`flex items-center gap-2 p-2.5 rounded-lg text-xs font-semibold ${
                  ["payment_pending", "confirmed", "active", "in_progress"].includes(String(booking?.status))
                    ? "bg-[#39B54A]/10 text-[#39B54A]"
                    : "bg-amber-50 text-amber-700"
                }`}>
                  <span className={`w-2 h-2 rounded-full shrink-0 ${
                    ["payment_pending", "confirmed", "active", "in_progress"].includes(String(booking?.status))
                      ? "bg-[#39B54A]"
                      : "bg-amber-400"
                  }`} />
                  Booking status:{" "}
                  <span className="capitalize">{booking?.status?.replace(/_/g, " ")}</span>
                </div>

                {/* Payment deadline */}
                {displayPaymentDeadline && !isPaymentExpired && (
                  <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 text-xs text-orange-700">
                    <span className="font-semibold">Payment deadline:</span>{" "}
                    {displayPaymentDeadline.toLocaleDateString("en-NP", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </div>
                )}
                {isPaymentExpired && (
                  <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-xs text-red-700 font-semibold">
                    Warning: Payment deadline has passed.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
