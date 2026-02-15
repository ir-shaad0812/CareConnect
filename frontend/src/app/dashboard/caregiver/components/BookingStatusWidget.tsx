"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { Zap, Calendar, ChevronRight, Clock } from "lucide-react";

const STATUS_STEPS: Record<string, number> = {
  pending: 1, accepted: 2, agreement_pending: 3, payment_pending: 4,
  confirmed: 5, active: 6, in_progress: 6, completed: 7,
};

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-amber-50 text-amber-700 border-amber-200" },
  accepted: { label: "Accepted", className: "bg-blue-50 text-blue-700 border-blue-200" },
  agreement_pending: { label: "Agreement", className: "bg-violet-50 text-violet-700 border-violet-200" },
  payment_pending: { label: "Payment Due", className: "bg-orange-50 text-orange-700 border-orange-200" },
  confirmed: { label: "Confirmed", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  active: { label: "Active", className: "bg-green-50 text-green-700 border-green-200" },
  in_progress: { label: "Active", className: "bg-green-50 text-green-700 border-green-200" },
  completed: { label: "Completed", className: "bg-slate-50 text-slate-700 border-slate-200" },
  cancelled: { label: "Cancelled", className: "bg-red-50 text-red-700 border-red-200" },
  rejected: { label: "Rejected", className: "bg-red-50 text-red-700 border-red-200" },
  disputed: { label: "Disputed", className: "bg-orange-50 text-orange-700 border-orange-200" },
};

const SERVICE_LABELS: Record<string, string> = {
  elderly_care: "Elderly Care", child_care: "Child Care",
  disability_care: "Disability Care", post_surgery: "Post-Surgery",
  companionship: "Companionship", special_needs: "Special Needs",
  palliative_care: "Palliative Care", respite_care: "Respite Care",
};

interface BookingItem {
  _id: string;
  bookingNumber?: string;
  status: string;
  schedule?: { startDate?: string; endDate?: string };
  serviceType?: string;
  careSeekerId?: { fullName?: string; _id?: string } | string;
  pricing?: { total?: number; totalAmount?: number; currency?: string };
}

interface BookingStatusWidgetProps {
  bookings?: BookingItem[];
  isLoading?: boolean;
}

function SkeletonRow() {
  return (
    <div className="p-3 rounded-xl border border-gray-100 animate-pulse">
      <div className="flex items-center justify-between mb-2">
        <div className="h-3.5 bg-gray-200 rounded w-24" />
        <div className="h-5 bg-gray-100 rounded-full w-16" />
      </div>
      <div className="h-3 bg-gray-100 rounded w-32 mb-1" />
      <div className="h-3 bg-gray-100 rounded w-20" />
    </div>
  );
}

export default function BookingStatusWidget({ bookings = [], isLoading = false }: BookingStatusWidgetProps) {
  const active = bookings.filter(b => !["completed", "cancelled", "rejected", "expired"].includes(b.status)).slice(0, 5);
  const recent = active.length === 0 ? bookings.filter(b => b.status === "completed").slice(0, 3) : [];
  const items = [...active, ...recent];

  const getName = (val: BookingItem["careSeekerId"]): string => {
    if (!val) return "Care Seeker";
    if (typeof val === "string") return "Care Seeker";
    return val.fullName || "Care Seeker";
  };

  const fmtDate = (d?: string) =>
    d
      ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : "TBD";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="bg-white rounded-2xl border border-gray-100/80 p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#39B54A]/10 flex items-center justify-center">
            <Zap size={16} className="text-[#39B54A]" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900">Booking Status</h3>
        </div>
        <Link href="/dashboard/caregiver/bookings" className="text-xs text-[#39B54A] font-medium hover:underline">
          View all
        </Link>
      </div>

      <div className="space-y-2.5">
        {isLoading ? (
          [1, 2, 3].map(i => <SkeletonRow key={i} />)
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center mb-2">
              <Calendar size={18} className="text-gray-300" />
            </div>
            <p className="text-sm text-gray-400">No active bookings</p>
            <Link href="/dashboard/caregiver/jobs" className="mt-2 text-xs text-[#39B54A] font-medium hover:underline">
              Find jobs →
            </Link>
          </div>
        ) : (
          items.map((booking, i) => {
            const badge = STATUS_BADGE[booking.status] || STATUS_BADGE.pending;
            const step = STATUS_STEPS[booking.status] || 1;
            const isActive = ["active", "in_progress"].includes(booking.status);
            const displayBookingNumber = booking.bookingNumber || booking._id.slice(-8).toUpperCase();
            const serviceLabel =
              booking.serviceType && SERVICE_LABELS[booking.serviceType]
                ? SERVICE_LABELS[booking.serviceType]
                : booking.serviceType || "Care Service";
            return (
              <motion.div
                key={booking._id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  href={`/dashboard/bookings/${booking._id}`}
                  className="group flex items-start gap-3 p-3 rounded-xl border border-gray-100 hover:border-[#39B54A]/30 hover:bg-green-50/30 transition-all duration-200"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-gray-900 truncate">
                        #{displayBookingNumber}
                      </span>
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${badge.className} ${isActive ? "animate-pulse" : ""}`}>
                        {badge.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {getName(booking.careSeekerId)} · {serviceLabel}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      {/* Mini step progress */}
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 7 }).map((_, idx) => (
                          <div
                            key={idx}
                            className={`h-1 rounded-full transition-all ${
                              idx < step
                                ? "w-2 bg-[#39B54A]"
                                : "w-1.5 bg-gray-200"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] text-gray-400">{step}/7</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <Clock size={10} className="text-gray-300" />
                      <span className="text-[10px] text-gray-400">
                        {fmtDate(booking.schedule?.startDate)}
                        {booking.schedule?.endDate ? ` – ${fmtDate(booking.schedule.endDate)}` : ""}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-gray-300 group-hover:text-[#39B54A] mt-1 shrink-0 transition-colors" />
                </Link>
              </motion.div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}
