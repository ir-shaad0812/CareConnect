"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  CalendarDays,
  RefreshCw,
  CheckCircle2,
  XCircle,
  MapPin,
  User,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Eye,
  Check,
  X,
  Loader2,
  Inbox,
} from "lucide-react";
import { useAuthContext } from "@/context/AuthContext";
import {
  bookingService,
  Booking,
  BookingStatus,
  BookingFilters,
} from "@/modules/booking/services";
import type { User as UserType } from "@/types";
import { CaregiverLayout } from "../components";

// Helper function to get user property from string | User
const getUserProp = (value: string | UserType | undefined, prop: keyof UserType): string => {
  if (!value) return "N/A";
  if (typeof value === "string") return value;
  return String(value[prop] || "N/A");
};

// Status configuration with Lucide icons
const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string; borderColor: string; icon: React.ElementType }
> = {
  pending: {
    label: "Pending",
    color: "text-amber-700",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    icon: Clock,
  },
  confirmed: {
    label: "Confirmed",
    color: "text-[#39B54A]",
    bgColor: "bg-[#39B54A]/10",
    borderColor: "border-[#39B54A]/20",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Rejected",
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    icon: XCircle,
  },
  in_progress: {
    label: "In Progress",
    color: "text-violet-700",
    bgColor: "bg-violet-50",
    borderColor: "border-violet-200",
    icon: RefreshCw,
  },
  completed: {
    label: "Completed",
    color: "text-[#39B54A]",
    bgColor: "bg-[#39B54A]/10",
    borderColor: "border-[#39B54A]/20",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Cancelled",
    color: "text-gray-600",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
    icon: XCircle,
  },
  disputed: {
    label: "Disputed",
    color: "text-orange-700",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    icon: AlertTriangle,
  },
};

const SERVICE_TYPE_LABELS: Record<string, string> = {
  elderly_care: "Elderly Care",
  child_care: "Child Care",
  special_needs: "Special Needs Care",
  disability_care: "Disability Care",
  post_surgery: "Post-Surgery Care",
  companionship: "Companionship",
  respite_care: "Respite Care",
  palliative_care: "Palliative Care",
};

type TabType = "pending" | "upcoming" | "in_progress" | "completed" | "all";

export default function CaregiverBookingsPage() {
  const router = useRouter();
  const { user: authUser, isLoading: isAuthLoading } = useAuthContext();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("pending");
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    pages: 0,
  });
  const [filters, setFilters] = useState<BookingFilters>({
    status: "pending",
    page: 1,
    limit: 10,
  });

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const [stats, setStats] = useState({
    pending: 0,
    upcoming: 0,
    inProgress: 0,
    completed: 0,
    total: 0,
  });

  const fetchBookings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await bookingService.getMyBookings(filters);
      if (response.success && response.data) {
        setBookings(response.data.bookings);
        setPagination(response.data.pagination);
      }
    } catch (err) {
      console.error("Failed to fetch bookings:", err);
      setError("Failed to load bookings. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  const fetchStats = useCallback(async () => {
    try {
      const statuses = ["pending", "confirmed", "in_progress", "completed"] as const;
      const results = await Promise.all(
        statuses.map((status) =>
          bookingService.getMyBookings({ status: status as BookingStatus, limit: 1 })
        )
      );
      setStats({
        pending: results[0]?.data?.pagination?.total || 0,
        upcoming: results[1]?.data?.pagination?.total || 0,
        inProgress: results[2]?.data?.pagination?.total || 0,
        completed: results[3]?.data?.pagination?.total || 0,
        total:
          (results[0]?.data?.pagination?.total || 0) +
          (results[1]?.data?.pagination?.total || 0) +
          (results[2]?.data?.pagination?.total || 0) +
          (results[3]?.data?.pagination?.total || 0),
      });
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  }, []);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!authUser) {
      setIsLoading(false);
      return;
    }

    if (authUser.role && authUser.role !== "caregiver") {
      setIsLoading(false);
      return;
    }

    void fetchBookings();
    void fetchStats();
  }, [
    isAuthLoading,
    authUser?._id,
    authUser?.role,
    router,
    fetchBookings,
    fetchStats,
  ]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    const statusMap: Record<TabType, BookingStatus | undefined> = {
      pending: "pending",
      upcoming: "confirmed",
      in_progress: "in_progress",
      completed: "completed",
      all: undefined,
    };
    setFilters({
      page: 1,
      limit: 10,
      ...(statusMap[tab] !== undefined ? { status: statusMap[tab] } : {}),
    });
  };

  const handleConfirm = async (bookingId: string) => {
    try {
      setActionLoading(bookingId);
      await bookingService.confirmBooking(bookingId);
      fetchBookings();
      fetchStats();
    } catch (err) {
      console.error("Failed to confirm booking:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!selectedBooking || !rejectReason.trim()) return;
    try {
      setActionLoading(selectedBooking._id);
      await bookingService.rejectBooking(selectedBooking._id, rejectReason);
      setShowRejectModal(false);
      setSelectedBooking(null);
      setRejectReason("");
      fetchBookings();
      fetchStats();
    } catch (err) {
      console.error("Failed to reject booking:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const openRejectModal = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowRejectModal(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatPrice = (amount: number) => {
    return `Rs. ${new Intl.NumberFormat("en-NP", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)}`;
  };

  const statsCards = [
    {
      label: "Pending",
      value: stats.pending,
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50",
      ring: "ring-amber-500/20",
    },
    {
      label: "Upcoming",
      value: stats.upcoming,
      icon: CalendarDays,
      color: "text-blue-600",
      bg: "bg-blue-50",
      ring: "ring-blue-500/20",
    },
    {
      label: "In Progress",
      value: stats.inProgress,
      icon: RefreshCw,
      color: "text-violet-600",
      bg: "bg-violet-50",
      ring: "ring-violet-500/20",
    },
    {
      label: "Completed",
      value: stats.completed,
      icon: CheckCircle2,
      color: "text-[#39B54A]",
      bg: "bg-[#39B54A]/10",
      ring: "ring-[#39B54A]/20",
    },
  ];

  const tabs = [
    { id: "pending" as TabType, label: "Pending Requests", count: stats.pending },
    { id: "upcoming" as TabType, label: "Upcoming", count: stats.upcoming },
    { id: "in_progress" as TabType, label: "In Progress", count: stats.inProgress },
    { id: "completed" as TabType, label: "Completed", count: stats.completed },
    { id: "all" as TabType, label: "All Bookings", count: stats.total },
  ];

  return (
    <CaregiverLayout pageTitle="Bookings">
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">My Bookings</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your booking requests and appointments
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statsCards.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-xl p-4 border border-gray-100/80 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center ring-1 ${stat.ring}`}
                  >
                    <Icon size={18} className={stat.color} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-xs text-gray-500">{stat.label}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Tabs & Content Card */}
        <div className="bg-white rounded-xl border border-gray-100/80 overflow-hidden">
          {/* Tab Bar */}
          <div className="flex overflow-x-auto border-b border-gray-100 scrollbar-thin">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`shrink-0 px-5 py-3.5 text-sm font-medium transition-colors relative ${
                  activeTab === tab.id
                    ? "text-[#39B54A]"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50/50"
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span
                    className={`ml-2 px-2 py-0.5 text-xs rounded-full font-medium ${
                      activeTab === tab.id
                        ? "bg-[#39B54A] text-white"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
                {activeTab === tab.id && (
                  <motion.span
                    layoutId="bookingTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#39B54A]"
                  />
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-5">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="relative w-12 h-12 mb-4">
                  <div className="absolute inset-0 rounded-full border-[3px] border-gray-200" />
                  <div className="absolute inset-0 rounded-full border-[3px] border-[#39B54A] border-t-transparent animate-spin" />
                </div>
                <p className="text-sm text-gray-500">Loading bookings...</p>
              </div>
            ) : error ? (
              <div className="text-center py-16">
                <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 ring-1 ring-red-100">
                  <AlertTriangle size={24} className="text-red-500" />
                </div>
                <p className="text-red-600 text-sm mb-3">{error}</p>
                <button
                  onClick={fetchBookings}
                  className="px-4 py-2 bg-[#39B54A] text-white rounded-xl text-sm font-medium hover:bg-primary-600 transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 ring-1 ring-gray-100">
                  <Inbox size={28} className="text-gray-400" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">No bookings found</h3>
                <p className="text-sm text-gray-500">
                  {activeTab === "pending"
                    ? "You don't have any pending booking requests."
                    : `You don't have any ${activeTab.replace("_", " ")} bookings.`}
                </p>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3"
                >
                  {bookings.map((booking, i) => {
                    const statusCfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
                    const StatusIcon = statusCfg.icon;

                    return (
                      <motion.div
                        key={booking._id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="border border-gray-100/80 rounded-xl p-5 hover:shadow-md hover:border-gray-200/80 transition-all group"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          {/* Booking Info */}
                          <div className="flex-1">
                            <div className="flex items-start gap-4">
                              {/* Care Seeker Avatar */}
                              <div className="w-11 h-11 bg-[#39B54A]/10 rounded-full flex items-center justify-center shrink-0 ring-1 ring-[#39B54A]/20">
                                {typeof booking.careSeekerId === "object" &&
                                booking.careSeekerId.avatar ? (
                                  <Image
                                    src={booking.careSeekerId.avatar}
                                    alt="Care Seeker"
                                    width={44}
                                    height={44}
                                    className="rounded-full object-cover"
                                  />
                                ) : (
                                  <User size={18} className="text-[#39B54A]" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="font-semibold text-gray-900 text-sm">
                                    {getUserProp(booking.careSeekerId, "fullName")}
                                  </h3>
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${statusCfg.bgColor} ${statusCfg.color}`}
                                  >
                                    <StatusIcon size={12} />
                                    {statusCfg.label}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-500 mt-0.5">
                                  {SERVICE_TYPE_LABELS[booking.serviceType] || booking.serviceType}
                                </p>
                                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-400">
                                  <span className="inline-flex items-center gap-1">
                                    <CalendarDays size={13} />
                                    {formatDate(booking.schedule.startDate)}
                                  </span>
                                  {booking.schedule.startTime && (
                                    <span className="inline-flex items-center gap-1">
                                      <Clock size={13} />
                                      {booking.schedule.startTime}
                                    </span>
                                  )}
                                  <span className="inline-flex items-center gap-1">
                                    <MapPin size={13} />
                                    {booking.location?.city || "N/A"}
                                  </span>
                                </div>
                                {booking.bookingNumber && (
                                  <p className="text-[11px] text-gray-300 mt-2 font-mono">
                                    #{booking.bookingNumber}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Pricing & Actions */}
                          <div className="flex flex-col items-end gap-3">
                            <div className="text-right">
                              <p className="text-xl font-bold text-gray-900">
                                {formatPrice(booking.pricing?.totalAmount ?? 0)}
                              </p>
                              <p className="text-[11px] text-gray-400">
                                {booking.pricing?.rateType || "hourly"} rate
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              {booking.status === "pending" && (
                                <>
                                  <button
                                    onClick={() => handleConfirm(booking._id)}
                                    disabled={actionLoading === booking._id}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#39B54A] text-white text-sm font-medium rounded-xl hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {actionLoading === booking._id ? (
                                      <Loader2 size={15} className="animate-spin" />
                                    ) : (
                                      <>
                                        <Check size={15} />
                                        Accept
                                      </>
                                    )}
                                  </button>
                                  <button
                                    onClick={() => openRejectModal(booking)}
                                    disabled={actionLoading === booking._id}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 text-sm font-medium rounded-xl hover:bg-red-100 transition-colors disabled:opacity-50"
                                  >
                                    <X size={15} />
                                    Decline
                                  </button>
                                </>
                              )}
                              <Link
                                href={`/dashboard/bookings/${booking._id}`}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-50 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-100 transition-colors"
                              >
                                <Eye size={15} />
                                View
                              </Link>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            )}

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex justify-center items-center gap-3 mt-6 pt-5 border-t border-gray-100">
                <button
                  onClick={() => setFilters((prev) => ({ ...prev, page: prev.page! - 1 }))}
                  disabled={pagination.page === 1}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition-colors"
                >
                  <ChevronLeft size={14} />
                  Previous
                </button>
                <span className="text-sm text-gray-500">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  onClick={() => setFilters((prev) => ({ ...prev, page: prev.page! + 1 }))}
                  disabled={pagination.page === pagination.pages}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition-colors"
                >
                  Next
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      <AnimatePresence>
        {showRejectModal && selectedBooking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowRejectModal(false);
              setSelectedBooking(null);
              setRejectReason("");
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center ring-1 ring-red-100">
                  <XCircle size={20} className="text-red-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Decline Booking</h3>
                  <p className="text-xs text-gray-500">
                    From {getUserProp(selectedBooking.careSeekerId, "fullName")}
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Please provide a reason for declining this booking request.
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter your reason..."
                className="w-full p-3 border border-gray-200 rounded-xl resize-none h-32 text-sm focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A] outline-none placeholder:text-gray-400"
              />
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setSelectedBooking(null);
                    setRejectReason("");
                  }}
                  className="px-4 py-2.5 text-sm text-gray-600 hover:text-gray-800 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={!rejectReason.trim() || actionLoading === selectedBooking._id}
                  className="px-5 py-2.5 bg-red-500 text-white text-sm rounded-xl hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                >
                  {actionLoading === selectedBooking._id ? "Declining..." : "Decline Booking"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </CaregiverLayout>
  );
}


