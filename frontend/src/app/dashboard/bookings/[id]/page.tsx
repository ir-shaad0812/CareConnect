"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Clock,
  ThumbsUp,
  FileText,
  CreditCard,
  CheckCircle,
  Zap,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Timer,
  MessageSquare,
  Star,
  HelpCircle,
  MapPin,
  User as UserIcon,
  Calendar,
  DollarSign,
  Shield,
  ChevronRight,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";

import { authService } from "@/modules/auth/services";
import { useAuthContext } from "@/context/AuthContext";
import {
  bookingService,
  type AgreementInfo,
  type Booking,
  type BookingTrackingLog,
} from "@/modules/booking/services";
import LocationMap from "@/modules/property/components/LocationMap";
import { PremiumPaymentGateway } from "@/components/features/payments/PremiumPaymentGateway";
import { paymentService } from "@/services/api/payment.service";
import {
  AgreementViewer,
  RefundPreviewModal,
  BookingStateMachine,
  TrackingLogForm,
  DisputeForm,
  type AgreementContent,
  type TrackingLogSubmitData,
  type DisputeSubmitData,
} from "@/components/booking";
import { useRealtimeBooking } from "@/hooks/useRealtimeBooking";
import type { User } from "@/types";

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const getUserProp = (
  value: string | User | undefined,
  prop: keyof User,
): string => {
  if (!value) return "N/A";
  if (typeof value === "string") return value;
  return String(value[prop] || "N/A");
};

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const fmtPrice = (amount: number) =>
  `Rs. ${new Intl.NumberFormat("en-NP", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;

const toTrackingFormStatus = (status?: string): "pending" | "submitted" | "flagged" => {
  const normalized = String(status ?? "pending").toLowerCase();
  if (normalized === "submitted") return "submitted";
  if (normalized === "flagged") return "flagged";
  if (normalized === "pending") return "pending";
  if (normalized === "submited") return "submitted";
  return "pending";
};

// â”€â”€â”€ Status Config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type StatusKey =
  | "pending"
  | "accepted"
  | "agreement_pending"
  | "payment_pending"
  | "confirmed"
  | "active"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "rejected"
  | "disputed"
  | "expired"
  | "reserved";

interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ElementType;
}

const STATUS_CONFIG: Record<StatusKey, StatusConfig> = {
  reserved: {
    label: "Reserved",
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    icon: Clock,
  },
  pending: {
    label: "Pending Review",
    color: "text-amber-700",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    icon: Clock,
  },
  accepted: {
    label: "Request Accepted (Agreement Required)",
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    icon: ThumbsUp,
  },
  agreement_pending: {
    label: "Agreement Required",
    color: "text-violet-700",
    bgColor: "bg-violet-50",
    borderColor: "border-violet-200",
    icon: FileText,
  },
  payment_pending: {
    label: "Payment Pending",
    color: "text-orange-700",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    icon: CheckCircle,
  },
  confirmed: {
    label: "Payment Completed",
    color: "text-emerald-700",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    icon: CreditCard,
  },
  active: {
    label: "Active",
    color: "text-green-700",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    icon: Zap,
  },
  in_progress: {
    label: "In Progress",
    color: "text-green-700",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    icon: Zap,
  },
  completed: {
    label: "Completed",
    color: "text-slate-700",
    bgColor: "bg-slate-50",
    borderColor: "border-slate-200",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Cancelled",
    color: "text-red-700",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    icon: XCircle,
  },
  rejected: {
    label: "Rejected",
    color: "text-red-700",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    icon: XCircle,
  },
  disputed: {
    label: "Disputed",
    color: "text-orange-700",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    icon: AlertTriangle,
  },
  expired: {
    label: "Expired",
    color: "text-gray-700",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
    icon: Timer,
  },
};

const SERVICE_TYPE_LABELS: Record<string, string> = {
  elderly_care: "Elderly Care",
  child_care: "Child Care",
  disability_care: "Disability Care",
  post_surgery: "Post-Surgery Care",
  post_surgery_care: "Post-Surgery Care",
  companionship: "Companionship",
  medical_care: "Medical Care",
  special_needs: "Special Needs",
  palliative_care: "Palliative Care",
  respite_care: "Respite Care",
  other: "Other",
};

// â”€â”€â”€ Feature Lock Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const ACTIVE_STATUSES = ["active", "in_progress"];
const PAYABLE_STATUSES = ["payment_pending", "confirmed", "active", "in_progress"];
const CHAT_STATUSES = [
  "confirmed",
  "active",
  "in_progress",
  "completed",
];
const DISPUTE_STATUSES = [
  "confirmed",
  "active",
  "in_progress",
  "completed",
  "disputed",
];
const CANCEL_STATUSES = [
  "pending",
  "accepted",
  "agreement_pending",
  "payment_pending",
  "confirmed",
];

const canChat = (status: string) => CHAT_STATUSES.includes(status);
const canViewMap = (status: string) => ACTIVE_STATUSES.includes(status);
const canTrack = (status: string) => ACTIVE_STATUSES.includes(status);
const canRaiseDispute = (status: string) => DISPUTE_STATUSES.includes(status);
const canCancel = (status: string) => CANCEL_STATUSES.includes(status);

// â”€â”€â”€ Skeleton â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function PageSkeleton() {
  return (
    <div className="min-h-screen bg-[#FAFBFC] animate-pulse">
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <div className="h-9 w-24 bg-gray-200 rounded-xl" />
          <div className="h-7 w-48 bg-gray-200 rounded-xl" />
          <div className="h-6 w-20 bg-gray-100 rounded-full" />
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-6 py-6 space-y-5">
        <div className="h-28 bg-white rounded-2xl border border-gray-100" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <div className="h-56 bg-white rounded-2xl border border-gray-100" />
            <div className="h-40 bg-white rounded-2xl border border-gray-100" />
          </div>
          <div className="space-y-5">
            <div className="h-48 bg-white rounded-2xl border border-gray-100" />
            <div className="h-36 bg-white rounded-2xl border border-gray-100" />
          </div>
        </div>
      </div>
    </div>
  );
}

// â”€â”€â”€ Section Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function SectionCard({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  children,
  className = "",
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`bg-white rounded-2xl border border-gray-100/80 shadow-sm ${className}`}
    >
      <div className="flex items-center gap-3 p-5 border-b border-gray-50">
        <div
          className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center`}
        >
          <Icon size={16} className={iconColor} />
        </div>
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </motion.div>
  );
}

// â”€â”€â”€ Info Row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">
        {label}
      </span>
      <span className="text-sm font-medium text-gray-800">{value}</span>
    </div>
  );
}

// â”€â”€â”€ Main Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function BookingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const bookingId = params.id as string;
  const action = searchParams.get("action");

  const { user: authUser } = useAuthContext();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Payment verification states
  const [khaltiVerifying, setKhaltiVerifying] = useState(false);
  const [esewaVerifying, setEsewaVerifying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);

  // Modal states
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // â”€â”€ Fetch booking â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const fetchBooking = useCallback(async () => {
    try {
      const res = await bookingService.getBookingById(bookingId);
      if (res.success && res.data?.booking) {
        let nextBooking = res.data.booking;

        const agreementRequiredStatuses = new Set([
          "accepted",
          "agreement_pending",
          "payment_pending",
          "confirmed",
          "active",
          "in_progress",
          "completed",
          "disputed",
        ]);

        const shouldHydrateAgreement =
          agreementRequiredStatuses.has(nextBooking.status) &&
          !nextBooking.agreement?.content;

        if (shouldHydrateAgreement) {
          try {
            const agreementRes = await bookingService.getAgreement(bookingId);
            if (agreementRes.success && agreementRes.data?.agreement) {
              nextBooking = {
                ...nextBooking,
                agreement: {
                  ...(nextBooking.agreement || {}),
                  ...agreementRes.data.agreement,
                },
              };
            }
          } catch {
            // Keep booking payload fallback; viewer will show pending state.
          }
        }

        setBooking(nextBooking);
        setError(null);
      } else {
        setError(res.message || "Failed to load booking.");
      }
    } catch {
      setError("Failed to load booking details.");
    } finally {
      setIsLoading(false);
    }
  }, [bookingId]);

  // â”€â”€ Real-time socket â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const { connected: realtimeConnected } = useRealtimeBooking(bookingId, {
    onStatusChange: () => {
      void fetchBooking();
    },
    onAgreementUpdate: () => void fetchBooking(),
    onPaymentComplete: () => {
      setPaymentSuccess("Payment received! Booking is now confirmed.");
      void fetchBooking();
    },
    onTrackingUpdate: () => void fetchBooking(),
    onDisputeUpdate: () => void fetchBooking(),
    onRefetch: () => void fetchBooking(),
  });

  // â”€â”€ Init â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  useEffect(() => {
    const storedUser = authService.getCurrentUser();
    if (!storedUser) {
      router.push("/login");
      return;
    }
    setUser(storedUser);
    void fetchBooking();

    if (action === "reject") setShowRejectModal(true);

    // Khalti verification
    const khaltiPayment = searchParams.get("payment");
    const khaltiPidx = searchParams.get("pidx");
    const khaltiTxnId = searchParams.get("txnId");
    if (khaltiPayment === "khalti_verify" && khaltiPidx && khaltiTxnId) {
      setKhaltiVerifying(true);
      paymentService
        .verifyKhaltiPayment(khaltiPidx, khaltiTxnId)
        .then((res) => {
          if (res.success) {
            setPaymentSuccess("Khalti payment verified successfully!");
            void fetchBooking();
          } else {
            setError(res.message || "Khalti verification failed.");
          }
        })
        .catch(() => setError("Khalti payment verification failed."))
        .finally(() => setKhaltiVerifying(false));
    }

    // eSewa verification
    const esewaData = searchParams.get("data");
    const esewaTxnId2 = searchParams.get("txnId");
    if (
      searchParams.get("payment") === "esewa_verify" &&
      esewaData &&
      esewaTxnId2
    ) {
      setEsewaVerifying(true);
      paymentService
        .verifyEsewaPayment(esewaData)
        .then((res) => {
          if (res.success) {
            setPaymentSuccess("eSewa payment verified successfully!");
            void fetchBooking();
          } else {
            setError(res.message || "eSewa verification failed.");
          }
        })
        .catch(() => setError("eSewa payment verification failed."))
        .finally(() => setEsewaVerifying(false));
    }

    // Stripe success
    if (searchParams.get("payment_success") === "true") {
      setPaymentSuccess("Payment completed successfully!");
      void fetchBooking();
    }
  }, [router, fetchBooking, action, searchParams]);

  // If agreement content is still missing, poll briefly so preview appears
  // within seconds even if a socket event was missed during reconnects.
  useEffect(() => {
    if (!booking) return;

    const needsAgreementHydration =
      ["accepted", "agreement_pending"].includes(booking.status) &&
      !booking.agreement?.content;

    if (!needsAgreementHydration) return;

    const intervalId = window.setInterval(() => {
      void fetchBooking();
    }, 2500);

    const timeoutId = window.setTimeout(() => {
      window.clearInterval(intervalId);
    }, 45000);

    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
    };
  }, [booking, fetchBooking]);

  // â”€â”€ Action Handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const withLoading = async (fn: () => Promise<void>) => {
    setActionLoading(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "An error occurred.";
      setError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptBooking = () =>
    withLoading(async () => {
      const res = await bookingService.confirmBooking(booking!._id);
      if (res.success) {
        setSuccessMsg("Request accepted! Agreement has been generated.");
        await fetchBooking();
      } else {
        throw new Error(res.message || "Failed to accept booking.");
      }
    });

  const handleRejectBooking = () =>
    withLoading(async () => {
      if (!rejectReason.trim()) throw new Error("Please provide a reason.");
      const res = await bookingService.rejectBooking(
        booking!._id,
        rejectReason,
      );
      if (res.success) {
        setShowRejectModal(false);
        setRejectReason("");
        await fetchBooking();
      } else {
        throw new Error(res.message || "Failed to reject booking.");
      }
    });

  const handleAcceptAgreement = async () => {
    await withLoading(async () => {
      const res = await bookingService.acceptAgreement(booking!._id);
      if (res.success) {
        setSuccessMsg("Agreement accepted!");
        await fetchBooking();
      } else {
        throw new Error(res.message || "Failed to accept agreement.");
      }
    });
  };

  const handleDownloadPDF = async () => {
    const url = `/api/bookings/${booking!._id}/agreement/pdf`;
    const a = document.createElement("a");
    a.href = url;
    a.download = `agreement-${booking!.bookingNumber || booking!._id}.pdf`;
    a.click();
  };

  const handleCheckIn = () =>
    withLoading(async () => {
      const res = await bookingService.checkIn(booking!._id);
      if (res.success) await fetchBooking();
      else throw new Error(res.message || "Failed to check in.");
    });

  const handleCheckOut = () =>
    withLoading(async () => {
      const res = await bookingService.checkOut(booking!._id);
      if (res.success) await fetchBooking();
      else throw new Error(res.message || "Failed to check out.");
    });

  const handleSubmitTrackingLog = async (data: TrackingLogSubmitData) => {
    await withLoading(async () => {
      const formData = new FormData();
      formData.append("date", data.date);
      formData.append("checkInTime", data.checkInTime);
      formData.append("checkOutTime", data.checkOutTime);
      formData.append("tasksCompleted", data.tasksCompleted);
      formData.append("notes", data.notes);
      formData.append("issues", data.issues);
      formData.append("issueFlag", String(data.issueFlag));
      data.images.forEach((img) => formData.append("images", img));
      const res = await bookingService.submitTrackingLog(
        booking!._id,
        formData,
      );
      if (res.success) {
        setSuccessMsg("Daily tracking log submitted successfully!");
        await fetchBooking();
      } else {
        throw new Error(res.message || "Failed to submit tracking log.");
      }
    });
  };

  const handleRaiseDispute = async (data: DisputeSubmitData) => {
    await withLoading(async () => {
      const res = await bookingService.raiseDispute(data.bookingId, {
        reason: data.subject,
        description: `[${data.category}] ${data.description}`,
      });
      if (res.success) {
        setShowDisputeModal(false);
        setSuccessMsg("Dispute submitted. Admin will review within 24-48h.");
        await fetchBooking();
      } else {
        throw new Error(res.message || "Failed to submit dispute.");
      }
    });
  };

  // â”€â”€ Derived values â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const isCaregiver = (user?.role ?? authUser?.role) === "caregiver";
  const status = (booking?.status ?? "pending") as StatusKey;
  const statusCfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const StatusIcon = statusCfg.icon;
  const bookingNumber = booking?.bookingNumber || booking?._id || "N/A";
  const bookingTotal = booking?.pricing?.total ?? booking?.pricing?.totalAmount ?? 0;
  const amountPaid = booking?.payment?.amountPaid ?? booking?.amountPaid ?? 0;
  const amountDue =
    booking?.payment?.amountDue ??
    booking?.amountDue ??
    Math.max(0, bookingTotal - amountPaid);
  const paymentStatusRaw = String(
    booking?.payment?.status ?? booking?.paymentStatus ?? "",
  ).toLowerCase();
  const paymentStatusLabel = String(
    booking?.payment?.status ??
      booking?.paymentStatus ??
      (amountDue <= 0 ? "fully_paid" : "payment_pending"),
  ).replace(/_/g, " ");

  const paymentDeadlineIso =
    booking?.payment?.paymentDeadline ?? booking?.paymentDeadline ?? null;
  const paymentDeadlineDate = paymentDeadlineIso
    ? new Date(paymentDeadlineIso)
    : null;
  const hasPaymentDeadline = Boolean(
    paymentDeadlineDate && !Number.isNaN(paymentDeadlineDate.getTime()),
  );
  const isPaymentSettled =
    amountDue <= 0 ||
    ["fully_paid", "completed", "paid", "refunded"].includes(paymentStatusRaw);
  const isPaymentOutstanding = !isPaymentSettled && amountDue > 0;
  const isPaymentDeadlinePassed = Boolean(
    hasPaymentDeadline &&
      paymentDeadlineDate &&
      paymentDeadlineDate.getTime() < Date.now() &&
      isPaymentOutstanding,
  );
  const canCancelBooking = canCancel(status) && !isPaymentSettled;
  const canCareSeekerPayNow =
    !isCaregiver && PAYABLE_STATUSES.includes(booking?.status ?? "pending") && isPaymentOutstanding;
  const canCareSeekerLeaveReview =
    !isCaregiver && ["completed"].includes(booking?.status ?? "");
  const careSeekerReviewHref = booking?._id
    ? `/dashboard/careseeker/reviews?bookingId=${encodeURIComponent(booking._id)}`
    : "/dashboard/careseeker/reviews";
  const agreementFlowActive = ["accepted", "agreement_pending"].includes(
    booking?.status ?? "",
  );

  useEffect(() => {
    if (action !== "cancel" || !booking) return;

    if (canCancelBooking) {
      setShowCancelModal(true);
      return;
    }

    setShowCancelModal(false);
  }, [action, booking, canCancelBooking]);

  const agreement = booking?.agreement as AgreementInfo | undefined;
  const agreementAccepted = Boolean(
    agreement?.accepted || agreement?.status === "accepted",
  );
  const seekerAccepted = agreementAccepted
    ? true
    : Boolean(booking?.agreement?.seekerAccepted);
  const caregiverAccepted = agreementAccepted
    ? true
    : Boolean(booking?.agreement?.caregiverAccepted);
  const hasCurrentUserAccepted = isCaregiver
    ? caregiverAccepted
    : seekerAccepted;

  const agreementStatusForViewer:
    | "generated"
    | "pending"
    | "accepted"
    | "partially_accepted" =
    agreementAccepted
      ? "accepted"
      : seekerAccepted || caregiverAccepted
        ? "partially_accepted"
        : agreement?.status === "generated"
          ? "generated"
          : "pending";

  const agreementContent =
    (agreement?.content as AgreementContent | undefined) ?? null;

  const getStatusTimestamp = (...targetStatuses: string[]) =>
    booking?.statusHistory?.find((entry) =>
      targetStatuses.includes(entry.status),
    )?.timestamp;

  const tsAccepted = getStatusTimestamp("accepted");
  const tsAgreementPending = getStatusTimestamp("agreement_pending");
  const tsPaymentPending = getStatusTimestamp("payment_pending");
  const tsConfirmed = getStatusTimestamp("confirmed");
  const tsActive = getStatusTimestamp("active", "in_progress");
  const tsCompleted = getStatusTimestamp("completed");
  const tsCancelled = getStatusTimestamp("cancelled");
  const tsDisputed = getStatusTimestamp("disputed");

  const stateMachineTimestamps = {
    pending:
      getStatusTimestamp("pending") ??
      booking?.createdAt ??
      new Date().toISOString(),
    ...(tsAccepted ? { accepted: tsAccepted } : {}),
    ...(tsAgreementPending ? { agreement_pending: tsAgreementPending } : {}),
    ...(tsPaymentPending ? { payment_pending: tsPaymentPending } : {}),
    ...(tsConfirmed ? { confirmed: tsConfirmed } : {}),
    ...(tsActive ? { active: tsActive } : {}),
    ...(tsCompleted ? { completed: tsCompleted } : {}),
    ...(tsCancelled ? { cancelled: tsCancelled } : {}),
    ...(tsDisputed ? { disputed: tsDisputed } : {}),
  };

  const careInstructionsText =
    typeof booking?.careInstructions === "string"
      ? booking.careInstructions
      : ((booking?.careInstructions as unknown as { general?: string })
          ?.general ?? "");

  const todayKey = new Date().toISOString().split("T")[0];
  const todayLog = booking?.trackingLogs?.find((l: BookingTrackingLog) =>
    String(l.date || "").startsWith(todayKey),
  );

  const trackingFormExistingLog = todayLog
    ? {
        checkInTime: todayLog.checkInTime ?? "",
        checkOutTime: todayLog.checkOutTime ?? "",
        tasksCompleted: todayLog.tasksCompleted ?? "",
        notes: todayLog.notes ?? "",
        issues: todayLog.issues ?? "",
        issueFlag: Boolean(todayLog.issueFlag),
        images: (todayLog.images ?? []).map((img) => ({
          imageUrl: img.imageUrl,
          timestamp: img.timestamp,
        })),
        status: toTrackingFormStatus(todayLog.status),
        submittedAt: todayLog.submittedAt ?? "",
      }
    : undefined;

  // â”€â”€ Render guards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  if (isLoading) return <PageSkeleton />;

  if (!booking && error) {
    return (
      <div className="min-h-screen bg-[#FAFBFC] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Link
            href="/dashboard/bookings"
            className="text-[#39B54A] hover:underline text-sm font-medium"
          >
            â† Back to Bookings
          </Link>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-[#FAFBFC] flex items-center justify-center">
        <p className="text-gray-500 text-sm">Booking not found.</p>
      </div>
    );
  }

  // â”€â”€ Full render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      {/* â”€â”€ HEADER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <Link
            href="/dashboard/bookings"
            className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={16} />
            Bookings
          </Link>
          <ChevronRight size={14} className="text-gray-300" />
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="text-sm font-semibold text-gray-900 truncate">
              #{bookingNumber}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusCfg.bgColor} ${statusCfg.color} ${statusCfg.borderColor}`}
            >
              <StatusIcon size={12} />
              {statusCfg.label}
            </span>
          </div>

          {/* Real-time indicator */}
          <div className="flex items-center gap-1.5 shrink-0">
            {realtimeConnected ? (
              <Wifi size={14} className="text-[#39B54A]" />
            ) : (
              <WifiOff size={14} className="text-gray-400" />
            )}
            <span
              className={`text-[10px] font-medium ${
                realtimeConnected ? "text-[#39B54A]" : "text-gray-400"
              }`}
            >
              {realtimeConnected ? "Live" : "Offline"}
            </span>
          </div>

          <button
            onClick={() => void fetchBooking()}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
            title="Refresh"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </header>

      {/* â”€â”€ BODY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Global alerts */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700"
            >
              <XCircle size={15} />
              {error}
            </motion.div>
          )}
          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700"
            >
              <CheckCircle size={15} />
              {successMsg}
            </motion.div>
          )}
          {paymentSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700"
            >
              <CheckCircle size={15} />
              {paymentSuccess}
            </motion.div>
          )}
        </AnimatePresence>

        {/* â”€â”€ STATE MACHINE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-gray-100/80 shadow-sm p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-[#39B54A]/10 flex items-center justify-center">
              <Shield size={16} className="text-[#39B54A]" />
            </div>
            <h2 className="text-sm font-semibold text-gray-900">
              Booking Progress
            </h2>
          </div>
          <BookingStateMachine
            currentStatus={booking.status}
            timestamps={stateMachineTimestamps}
          />
        </motion.div>

        {(agreementFlowActive || PAYABLE_STATUSES.includes(booking.status)) && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl border p-4 sm:p-5 ${
              agreementFlowActive
                ? "bg-violet-50 border-violet-200"
                : isPaymentSettled
                  ? "bg-emerald-50 border-emerald-200"
                  : "bg-amber-50 border-amber-200"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  agreementFlowActive
                    ? "bg-violet-100 text-violet-700"
                    : isPaymentSettled
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                }`}
              >
                {agreementFlowActive ? (
                  <FileText size={15} />
                ) : isPaymentSettled ? (
                  <CheckCircle size={15} />
                ) : (
                  <CreditCard size={15} />
                )}
              </div>

              <div className="flex-1 min-w-0">
                {agreementFlowActive ? (
                  <>
                    <p className="text-sm font-semibold text-violet-900">
                      Agreement Required
                    </p>
                    <p className="text-sm text-violet-800 mt-0.5">
                      Caregiver accepted the request. Both care seeker and caregiver must accept the agreement before payment can start.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span
                        className={`px-2 py-1 rounded-full border ${
                          seekerAccepted
                            ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                            : "bg-white text-violet-700 border-violet-200"
                        }`}
                      >
                        Care Seeker: {seekerAccepted ? "Accepted" : "Pending"}
                      </span>
                      <span
                        className={`px-2 py-1 rounded-full border ${
                          caregiverAccepted
                            ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                            : "bg-white text-violet-700 border-violet-200"
                        }`}
                      >
                        Caregiver: {caregiverAccepted ? "Accepted" : "Pending"}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          document
                            .getElementById("agreement-section")
                            ?.scrollIntoView({ behavior: "smooth" });
                        }}
                        className="px-3 py-2 text-xs font-semibold rounded-lg border border-violet-200 text-violet-700 bg-white hover:bg-violet-100 transition-colors"
                      >
                        Open Agreement
                      </button>
                      {agreementContent && (
                        <button
                          onClick={() => void handleDownloadPDF()}
                          className="px-3 py-2 text-xs font-semibold rounded-lg border border-violet-200 text-violet-700 bg-white hover:bg-violet-100 transition-colors"
                        >
                          Download Agreement PDF
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <p
                      className={`text-sm font-semibold ${
                        isPaymentSettled ? "text-emerald-900" : "text-amber-900"
                      }`}
                    >
                      {isPaymentSettled
                        ? "Payment Completed"
                        : "Payment Pending"}
                    </p>
                    <p
                      className={`text-sm mt-0.5 ${
                        isPaymentSettled ? "text-emerald-800" : "text-amber-800"
                      }`}
                    >
                      {isPaymentSettled
                        ? "Payment has been received. This booking is now paid."
                        : isCaregiver
                          ? "Waiting for the care seeker to complete payment."
                          : "Complete payment now to keep this booking confirmed."}
                    </p>
                    {isPaymentDeadlinePassed && (
                      <p className="mt-2 text-xs font-semibold text-red-700">
                        Payment deadline has passed.
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {canCareSeekerPayNow && (
                        <Link
                          href={`/booking/${booking._id}/payment`}
                          className="px-3 py-2 text-xs font-semibold text-white bg-[#39B54A] rounded-lg hover:bg-primary-600 transition-colors"
                        >
                          Pay Now
                        </Link>
                      )}
                      {isPaymentSettled && (
                        <span className="px-3 py-2 text-xs font-semibold rounded-lg border border-emerald-200 text-emerald-700 bg-white">
                          Paid
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* â”€â”€ MAIN GRID â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* LEFT COL: Main content */}
          <div className="lg:col-span-2 space-y-5">
            {/* AGREEMENT section (shown when accepted or later) */}
            {[
              "accepted",
              "agreement_pending",
              "payment_pending",
              "confirmed",
              "active",
              "in_progress",
              "completed",
              "disputed",
            ].includes(booking.status) && (
              <motion.div
                id="agreement-section"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
              >
                <AgreementViewer
                  bookingId={booking._id}
                  bookingNumber={bookingNumber}
                  agreementContent={agreementContent}
                  agreementStatus={agreementStatusForViewer}
                  userRole={(user?.role ?? "careseeker") as "caregiver" | "careseeker" | "admin"}
                  hasCurrentUserAccepted={hasCurrentUserAccepted}
                  seekerAccepted={seekerAccepted}
                  caregiverAccepted={caregiverAccepted}
                  onAccept={handleAcceptAgreement}
                  onDownloadPDF={handleDownloadPDF}
                />
              </motion.div>
            )}

            {/* TRACKING section (active/in_progress only) */}
            {canTrack(booking.status) && isCaregiver && (
              <SectionCard
                icon={CheckCircle}
                iconBg="bg-[#39B54A]/10"
                iconColor="text-[#39B54A]"
                title="Today's Tracking Log"
              >
                <TrackingLogForm
                  bookingId={booking._id}
                  bookingNumber={bookingNumber}
                  date={todayKey}
                  {...(trackingFormExistingLog
                    ? { existingLog: trackingFormExistingLog }
                    : {})}
                  onSubmit={handleSubmitTrackingLog}
                  onCheckIn={handleCheckIn}
                  onCheckOut={handleCheckOut}
                  disabled={actionLoading}
                />
              </SectionCard>
            )}

            {/* SERVICE DETAILS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <SectionCard
              icon={Calendar}
              iconBg="bg-blue-50"
              iconColor="text-blue-600"
              title="Service Details"
            >
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <InfoRow
                  label="Service Type"
                  value={
                    SERVICE_TYPE_LABELS[booking.serviceType] ||
                    booking.serviceType
                  }
                />
                <InfoRow
                  label="Duration Type"
                  value={
                    <span className="capitalize">{booking.durationType}</span>
                  }
                />
                <InfoRow
                  label="Start Date"
                  value={fmtDate(booking.schedule?.startDate)}
                />
                {booking.schedule?.endDate && (
                  <InfoRow
                    label="End Date"
                    value={fmtDate(booking.schedule.endDate)}
                  />
                )}
                {booking.schedule?.startTime && (
                  <InfoRow
                    label="Start Time"
                    value={booking.schedule.startTime}
                  />
                )}
                {booking.schedule?.endTime && (
                  <InfoRow label="End Time" value={booking.schedule.endTime} />
                )}
                <InfoRow
                  label="Created"
                  value={fmtDateTime(booking.createdAt)}
                />
                <InfoRow
                  label="Booking #"
                  value={
                    <span className="font-mono">{bookingNumber}</span>
                  }
                />
              </div>
              {careInstructionsText && (
                <div className="mt-4 pt-4 border-t border-gray-50">
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">
                    Care Instructions
                  </p>
                  <p className="text-sm text-gray-700">{careInstructionsText}</p>
                </div>
              )}
            </SectionCard>

            {/* CARE RECIPIENT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {booking.careRecipient && (
              <SectionCard
                icon={UserIcon}
                iconBg="bg-violet-50"
                iconColor="text-violet-600"
                title="Care Recipient"
              >
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <InfoRow label="Name" value={booking.careRecipient.name} />
                  {booking.careRecipient.age && (
                    <InfoRow
                      label="Age"
                      value={`${booking.careRecipient.age} years`}
                    />
                  )}
                  {booking.careRecipient.gender && (
                    <InfoRow
                      label="Gender"
                      value={
                        <span className="capitalize">
                          {booking.careRecipient.gender}
                        </span>
                      }
                    />
                  )}
                  <InfoRow
                    label="Relationship"
                    value={booking.careRecipient.relationship}
                  />
                </div>
                {booking.careRecipient.medicalConditions &&
                  booking.careRecipient.medicalConditions.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">
                        Medical Conditions
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {booking.careRecipient.medicalConditions.map(
                          (c: string, i: number) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded-full border border-blue-100"
                            >
                              {c}
                            </span>
                          ),
                        )}
                      </div>
                    </div>
                  )}
                {booking.careRecipient.notes && (
                  <div className="mt-4 pt-4 border-t border-gray-50">
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">
                      Notes
                    </p>
                    <p className="text-sm text-gray-700">
                      {booking.careRecipient.notes}
                    </p>
                  </div>
                )}
              </SectionCard>
            )}

            {/* LOCATION MAP (only when active) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {canViewMap(booking.status) && booking.location && (
              <SectionCard
                icon={MapPin}
                iconBg="bg-emerald-50"
                iconColor="text-emerald-600"
                title="Care Location"
              >
                <div className="mb-3">
                  <p className="text-sm text-gray-700">
                    {booking.location.address}
                    {booking.location.city ? `, ${booking.location.city}` : ""}
                    {booking.location.state
                      ? `, ${booking.location.state}`
                      : ""}
                  </p>
                </div>
                <LocationMap
                  address={booking.location.address}
                  city={booking.location.city}
                  state={booking.location.state}
                  zipCode={booking.location.zipCode}
                />
              </SectionCard>
            )}

            {/* PAST TRACKING LOGS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {booking.trackingLogs && booking.trackingLogs.length > 0 && (
              <SectionCard
                icon={CheckCircle2}
                iconBg="bg-teal-50"
                iconColor="text-teal-600"
                title={`Tracking History (${booking.trackingLogs.length} logs)`}
              >
                <div className="space-y-3">
                  {booking.trackingLogs
                    .slice()
                    .reverse()
                    .slice(0, 7)
                    .map((log, i) => {
                      const logStatus = String(log.status ?? "pending").toLowerCase();
                      const badgeClass =
                        logStatus === "submitted"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : logStatus === "flagged"
                            ? "bg-red-50 text-red-700 border-red-200"
                            : log.missed
                              ? "bg-gray-50 text-gray-500 border-gray-200"
                              : "bg-amber-50 text-amber-700 border-amber-200";
                      return (
                        <div
                          key={i}
                          className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-semibold text-gray-800">
                                {String(log.date ?? "").slice(0, 10)}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full border capitalize ${badgeClass}`}
                              >
                                {logStatus}
                              </span>
                            </div>
                            {log.tasksCompleted && (
                              <p className="text-xs text-gray-500 truncate">
                                {String(log.tasksCompleted)}
                              </p>
                            )}
                            {log.issueFlag && (
                              <p className="text-xs text-red-500 mt-0.5 flex items-center gap-1">
                                <AlertTriangle size={10} />
                                Issue flagged
                              </p>
                            )}
                          </div>
                          {log.images &&
                            Array.isArray(log.images) &&
                            log.images.length > 0 && (
                              <span className="text-[10px] text-gray-400 bg-gray-50 rounded px-1.5 py-0.5 shrink-0">
                                {log.images.length} POW
                              </span>
                            )}
                        </div>
                      );
                    })}
                </div>
                {booking.trackingLogs.length > 7 && (
                  <Link
                    href={`/dashboard/careseeker/tracking?bookingId=${booking._id}`}
                    className="mt-3 block text-center text-xs text-[#39B54A] font-medium hover:underline"
                  >
                    View all {booking.trackingLogs.length} logs â†’
                  </Link>
                )}
              </SectionCard>
            )}

            {/* CARE REPORTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {booking.careReports && booking.careReports.length > 0 && (
              <SectionCard
                icon={FileText}
                iconBg="bg-indigo-50"
                iconColor="text-indigo-600"
                title={`Care Reports (${booking.careReports.length})`}
              >
                <div className="space-y-3">
                  {booking.careReports.map((report, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-xl border border-gray-100"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-gray-800">
                          {fmtDate(report.date)}
                        </span>
                        {report.mood && (
                          <span className="px-2 py-0.5 text-[10px] bg-gray-50 text-gray-600 rounded-full border border-gray-200 capitalize">
                            Mood: {report.mood}
                          </span>
                        )}
                      </div>
                      {report.notes && (
                        <p className="text-sm text-gray-600">{report.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* DISPUTE INFO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {booking.dispute && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-orange-50 rounded-2xl border border-orange-200 p-5"
              >
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={16} className="text-orange-600" />
                  <h3 className="text-sm font-semibold text-orange-900">
                    Active Dispute
                  </h3>
                  <span
                    className={`ml-auto px-2 py-0.5 text-[10px] font-medium rounded-full border capitalize ${
                      booking.dispute.status === "resolved"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-orange-100 text-orange-700 border-orange-200"
                    }`}
                  >
                    {booking.dispute.status}
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="font-medium text-orange-900">Reason:</span>{" "}
                    <span className="text-orange-800">
                      {booking.dispute.reason}
                    </span>
                  </p>
                  {booking.dispute.description && (
                    <p>
                      <span className="font-medium text-orange-900">
                        Description:
                      </span>{" "}
                      <span className="text-orange-800">
                        {booking.dispute.description}
                      </span>
                    </p>
                  )}
                  {booking.dispute.resolution && (
                    <div className="mt-3 p-3 bg-white rounded-xl border border-orange-100">
                      <p className="font-medium text-gray-900 mb-1 text-xs">
                        Resolution
                      </p>
                      <p className="text-sm text-gray-700">
                        {booking.dispute.resolution}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* CANCELLATION INFO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {booking.cancellation && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-50 rounded-2xl border border-gray-200 p-5"
              >
                <div className="flex items-center gap-2 mb-3">
                  <XCircle size={16} className="text-gray-500" />
                  <h3 className="text-sm font-semibold text-gray-800">
                    Cancellation Details
                  </h3>
                </div>
                <div className="space-y-2 text-sm text-gray-700">
                  <p>
                    <span className="font-medium">Reason:</span>{" "}
                    {booking.cancellation.reason}
                  </p>
                  {booking.cancellation.cancelledAt && (
                    <p>
                      <span className="font-medium">Date:</span>{" "}
                      {fmtDateTime(booking.cancellation.cancelledAt)}
                    </p>
                  )}
                  {booking.cancellation.refundAmount !== undefined && (
                    <p>
                      <span className="font-medium">Refund Amount:</span>{" "}
                      {fmtPrice(booking.cancellation.refundAmount)}
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </div>

          {/* RIGHT COL: Sidebar */}
          <div className="space-y-5">
            {/* PAYMENT SUMMARY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <SectionCard
              icon={DollarSign}
              iconBg="bg-emerald-50"
              iconColor="text-emerald-600"
              title="Payment Summary"
            >
              <div className="space-y-3">
                {booking.pricing?.rate && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">
                      Rate (
                      {booking.pricing.rateType === "hourly"
                        ? "per hr"
                        : booking.pricing.rateType === "daily"
                          ? "per day"
                          : booking.pricing.rateType === "weekly"
                            ? "per week"
                            : "per month"}
                      )
                    </span>
                    <span className="font-medium text-gray-900">
                      {fmtPrice(booking.pricing.rate)}
                    </span>
                  </div>
                )}
                {booking.pricing?.subtotal !== undefined && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="font-medium text-gray-900">
                      {fmtPrice(booking.pricing.subtotal)}
                    </span>
                  </div>
                )}
                {booking.pricing?.platformFee !== undefined && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">
                      Platform Fee (
                      {booking.pricing.platformFeePercentage ?? 10}%)
                    </span>
                    <span className="text-gray-500">
                      {fmtPrice(booking.pricing.platformFee)}
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-gray-100 flex justify-between">
                  <span className="text-sm font-bold text-gray-900">Total</span>
                  <span className="text-sm font-bold text-[#39B54A]">
                    {fmtPrice(bookingTotal)}
                  </span>
                </div>
              </div>

              {/* Payment status */}
              <div className="mt-4 pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400 font-medium">
                    Payment Status
                  </span>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border capitalize ${
                      isPaymentSettled
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : paymentStatusRaw === "partially_paid"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-blue-50 text-blue-700 border-blue-200"
                    }`}
                  >
                    {paymentStatusLabel}
                  </span>
                </div>

                {bookingTotal > 0 && amountPaid >= 0 && (
                  <div>
                    <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                      <span>Paid: {fmtPrice(amountPaid)}</span>
                      <span>Due: {fmtPrice(amountDue)}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#39B54A] rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.min(100, bookingTotal > 0 ? (amountPaid / bookingTotal) * 100 : 0)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {hasPaymentDeadline && paymentDeadlineDate && isPaymentOutstanding && (
                  <div
                    className={`mt-3 px-3 py-2 rounded-xl border text-xs ${
                      isPaymentDeadlinePassed
                        ? "bg-red-50 border-red-200 text-red-700"
                        : "bg-amber-50 border-amber-200 text-amber-700"
                    }`}
                  >
                    {isPaymentDeadlinePassed
                      ? "Payment deadline has passed."
                      : `Payment deadline: ${paymentDeadlineDate.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}`}
                  </div>
                )}
              </div>

              {/* Payment verification loaders */}
              {khaltiVerifying && (
                <div className="mt-3 p-2.5 bg-purple-50 border border-purple-200 rounded-xl flex items-center gap-2 text-xs text-purple-700">
                  <div className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                  Verifying Khalti paymentâ€¦
                </div>
              )}
              {esewaVerifying && (
                <div className="mt-3 p-2.5 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2 text-xs text-green-700">
                  <div className="w-3 h-3 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                  Verifying eSewa paymentâ€¦
                </div>
              )}

              {/* Payment gateway (care seeker, payment_pending status) */}
              {!isCaregiver &&
                !["cancelled", "rejected", "expired"].includes(
                  booking.status,
                ) &&
                PAYABLE_STATUSES.includes(booking.status) &&
                isPaymentOutstanding && (
                  <div className="mt-4">
                    <PremiumPaymentGateway
                      bookingId={booking._id}
                      totalAmount={bookingTotal}
                      amountDue={amountDue}
                      amountPaid={amountPaid}
                      currency="NPR"
                      paymentDeadline={paymentDeadlineIso}
                      bookingNumber={bookingNumber}
                      serviceType={booking.serviceType}
                    />
                  </div>
                )}

              <div className="mt-3 pt-3 border-t border-gray-100">
                <Link
                  href="/dashboard/payments"
                  className="text-xs font-semibold text-[#39B54A] hover:underline flex items-center gap-1"
                >
                  View All Transactions
                  <ChevronRight size={12} />
                </Link>
              </div>
            </SectionCard>

            {/* CONTACT CARD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <SectionCard
              icon={UserIcon}
              iconBg="bg-blue-50"
              iconColor="text-blue-600"
              title={isCaregiver ? "Care Seeker" : "Caregiver"}
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-linear-to-br from-[#39B54A]/20 to-blue-100 flex items-center justify-center shrink-0">
                  <UserIcon size={20} className="text-gray-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {isCaregiver
                      ? getUserProp(booking.careSeekerId, "fullName")
                      : getUserProp(booking.caregiverId, "fullName")}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {isCaregiver
                      ? getUserProp(booking.careSeekerId, "email")
                      : getUserProp(booking.caregiverId, "email")}
                  </p>
                </div>
              </div>
            </SectionCard>

            {/* ACTION BUTTONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <SectionCard
              icon={Zap}
              iconBg="bg-amber-50"
              iconColor="text-amber-600"
              title="Actions"
            >
              <div className="space-y-2.5">
                {/* Message (chat unlocks after payment confirmation) */}
                {canChat(booking.status) && (
                  <Link
                    href={`/message/${
                      isCaregiver
                        ? ((typeof booking.careSeekerId === "object"
                            ? (booking.careSeekerId as { _id?: string })?._id
                            : booking.careSeekerId) ?? "")
                        : ((typeof booking.caregiverId === "object"
                            ? (booking.caregiverId as { _id?: string })?._id
                            : booking.caregiverId) ?? "")
                    }`}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#39B54A] text-white text-sm font-semibold rounded-xl hover:bg-primary-600 transition-colors"
                  >
                    <MessageSquare size={15} />
                    Send Message
                  </Link>
                )}

                {!isCaregiver && (
                  <Link
                    href="/dashboard/careseeker/support"
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-slate-700 text-sm font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
                  >
                    <HelpCircle size={15} />
                    Feedback
                  </Link>
                )}

                {canCareSeekerLeaveReview && (
                  <Link
                    href={careSeekerReviewHref}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-50 text-amber-700 text-sm font-semibold rounded-xl border border-amber-200 hover:bg-amber-100 transition-colors"
                  >
                    <Star size={15} />
                    Review
                  </Link>
                )}

                {/* Caregiver: Accept/Decline (pending) */}
                {isCaregiver && booking.status === "pending" && (
                  <>
                    <button
                      onClick={() => void handleAcceptBooking()}
                      disabled={actionLoading}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#39B54A] text-white text-sm font-semibold rounded-xl hover:bg-primary-600 disabled:opacity-50 transition-colors"
                    >
                      <ThumbsUp size={15} />
                      {actionLoading ? "Processingâ€¦" : "Accept Booking"}
                    </button>
                    <button
                      onClick={() => setShowRejectModal(true)}
                      disabled={actionLoading}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-700 text-sm font-semibold rounded-xl border border-red-200 hover:bg-red-100 disabled:opacity-50 transition-colors"
                    >
                      <XCircle size={15} />
                      Decline Booking
                    </button>
                  </>
                )}

                {/* Scroll to agreement */}
                {["accepted", "agreement_pending"].includes(booking.status) && (
                  <button
                    onClick={() => {
                      document
                        .getElementById("agreement-section")
                        ?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-50 text-violet-700 text-sm font-semibold rounded-xl border border-violet-200 hover:bg-violet-100 transition-colors"
                  >
                    <FileText size={15} />
                    {hasCurrentUserAccepted
                      ? "Waiting for other party"
                      : "View & Accept Agreement"}
                  </button>
                )}

                {/* Download agreement PDF */}
                {agreementContent &&
                  [
                    "accepted",
                    "agreement_pending",
                    "payment_pending",
                    "confirmed",
                    "active",
                    "in_progress",
                    "completed",
                    "disputed",
                  ].includes(booking.status) && (
                    <button
                      onClick={() => void handleDownloadPDF()}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-violet-700 text-sm font-semibold rounded-xl border border-violet-200 hover:bg-violet-50 transition-colors"
                    >
                      <FileText size={15} />
                      Download Agreement PDF
                    </button>
                  )}

                {/* Care seeker payment actions */}
                {canCareSeekerPayNow && (
                  <Link
                    href={`/booking/${booking._id}/payment`}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#39B54A] text-white text-sm font-semibold rounded-xl hover:bg-primary-600 transition-colors"
                  >
                    <CreditCard size={15} />
                    Pay Now
                  </Link>
                )}

                {!isCaregiver &&
                  PAYABLE_STATUSES.includes(booking.status) &&
                  isPaymentSettled && (
                    <div className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 text-sm font-semibold rounded-xl border border-emerald-200">
                      <CheckCircle size={15} />
                      Paid
                    </div>
                  )}

                {/* Check-in (active, caregiver, no check-in yet) */}
                {isCaregiver &&
                  ACTIVE_STATUSES.includes(booking.status) &&
                  !booking.checkIn && (
                    <button
                      onClick={() => void handleCheckIn()}
                      disabled={actionLoading}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#39B54A] text-white text-sm font-semibold rounded-xl hover:bg-primary-600 disabled:opacity-50 transition-colors"
                    >
                      <CheckCircle size={15} />
                      {actionLoading ? "Processingâ€¦" : "Check In"}
                    </button>
                  )}

                {/* Check-out (active, caregiver, checked in, no check-out) */}
                {isCaregiver &&
                  ACTIVE_STATUSES.includes(booking.status) &&
                  booking.checkIn &&
                  !booking.checkOut && (
                    <button
                      onClick={() => void handleCheckOut()}
                      disabled={actionLoading}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 text-white text-sm font-semibold rounded-xl hover:bg-orange-600 disabled:opacity-50 transition-colors"
                    >
                      <Timer size={15} />
                      {actionLoading ? "Processingâ€¦" : "Check Out"}
                    </button>
                  )}

                {/* Raise Dispute */}
                {canRaiseDispute(booking.status) && !booking.dispute && (
                  <button
                    onClick={() => setShowDisputeModal(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-50 text-orange-700 text-sm font-semibold rounded-xl border border-orange-200 hover:bg-orange-100 transition-colors"
                  >
                    <AlertTriangle size={15} />
                    Raise Dispute
                  </button>
                )}

                {/* Cancel */}
                {canCancelBooking && (
                  <button
                    onClick={() => setShowCancelModal(true)}
                    disabled={actionLoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-200 disabled:opacity-50 transition-colors"
                  >
                    <XCircle size={15} />
                    Cancel Booking
                  </button>
                )}
              </div>
            </SectionCard>

            {/* CHECK-IN/OUT TIMELINE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {(booking.checkIn || booking.checkOut) && (
              <SectionCard
                icon={Clock}
                iconBg="bg-teal-50"
                iconColor="text-teal-600"
                title="Session Timeline"
              >
                <div className="space-y-3">
                  {booking.checkIn && (
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                        <CheckCircle size={14} className="text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Checked In
                        </p>
                        <p className="text-xs text-gray-400">
                          {fmtDateTime(booking.checkIn.time)}
                        </p>
                      </div>
                    </div>
                  )}
                  {booking.checkOut && (
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                        <CheckCircle2 size={14} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Checked Out
                        </p>
                        <p className="text-xs text-gray-400">
                          {fmtDateTime(booking.checkOut.time)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </SectionCard>
            )}
          </div>
        </div>
      </main>

      {/* â”€â”€ MODALS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}

      {/* Reject Modal */}
      <AnimatePresence>
        {showRejectModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowRejectModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl"
            >
              <h3 className="text-base font-semibold text-gray-900 mb-2">
                Decline Booking
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Provide a reason for declining. The care seeker will be
                notified.
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter reasonâ€¦"
                rows={3}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-200 focus:border-red-400 resize-none outline-none"
              />
              <div className="flex gap-2.5 mt-4">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectReason("");
                  }}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void handleRejectBooking()}
                  disabled={!rejectReason.trim() || actionLoading}
                  className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {actionLoading ? "Processingâ€¦" : "Decline"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cancel Modal */}
      {booking && (
        <RefundPreviewModal
          bookingId={booking._id}
          open={showCancelModal && canCancelBooking}
          onClose={() => setShowCancelModal(false)}
          onConfirm={async (reason) => {
            if (!canCancelBooking) {
              throw new Error(
                "Cancellation is not allowed after payment is completed.",
              );
            }
            const finalReason = reason?.trim() || "Cancelled by user";
            const res = await bookingService.cancelBooking(
              booking._id,
              finalReason,
            );
            if (res.success) {
              await fetchBooking();
            } else {
              throw new Error(res.message || "Failed to cancel booking");
            }
          }}
        />
      )}

      {/* Dispute Form Modal */}
      <DisputeForm
        bookingId={booking._id}
        bookingNumber={bookingNumber}
        isOpen={showDisputeModal}
        onClose={() => setShowDisputeModal(false)}
        onSubmit={handleRaiseDispute}
      />
    </div>
  );
}
