"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authService } from "@/modules/auth/services";
import { 
  bookingService, 
  Booking, 
  BookingStatus, 
  BookingFilters,
  CalendarEventData 
} from "@/modules/booking/services";
import { useRealtimeDashboard } from "@/hooks/useRealtimeBooking";
import { Calendar, CalendarEvent } from "@/components/ui/Calendar";
import type { User } from "@/types";

// Helper function to get user property from string | User
const getUserProp = (value: string | User | undefined, prop: keyof User): string => {
  if (!value) return "N/A";
  if (typeof value === "string") return value;
  return String(value[prop] || "N/A");
};

// Status configuration for display
const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: string }> = {
  reserved: { label: "Reserved", color: "text-blue-700", bgColor: "bg-blue-100", icon: "🕒" },
  pending: { label: "Pending", color: "text-amber-700", bgColor: "bg-amber-100", icon: "⏳" },
  accepted: { label: "Request Accepted (Agreement Required)", color: "text-blue-700", bgColor: "bg-blue-100", icon: "👍" },
  agreement_pending: { label: "Agreement Required", color: "text-violet-700", bgColor: "bg-violet-100", icon: "📝" },
  payment_pending: { label: "Payment Pending", color: "text-orange-700", bgColor: "bg-orange-100", icon: "🔒" },
  confirmed: { label: "Payment Completed", color: "text-primary-500", bgColor: "bg-primary-50", icon: "💳" },
  active: { label: "Active", color: "text-secondary-500", bgColor: "bg-secondary-50", icon: "▶" },
  rejected: { label: "Rejected", color: "text-red-700", bgColor: "bg-red-100", icon: "✗" },
  in_progress: { label: "In Progress", color: "text-secondary-500", bgColor: "bg-secondary-50", icon: "▶" },
  completed: { label: "Completed", color: "text-emerald-700", bgColor: "bg-emerald-100", icon: "✓" },
  cancelled: { label: "Cancelled", color: "text-gray-700", bgColor: "bg-gray-200", icon: "⊘" },
  disputed: { label: "Disputed", color: "text-orange-700", bgColor: "bg-orange-100", icon: "⚠" },
  expired: { label: "Expired", color: "text-gray-700", bgColor: "bg-gray-200", icon: "⌛" },
};

const SERVICE_TYPE_LABELS: Record<string, string> = {
  elderly_care: "Elderly Care",
  child_care: "Child Care",
  disability_care: "Disability Care",
  post_surgery_care: "Post-Surgery Care",
  special_needs: "Special Needs",
  companionship: "Companionship",
  medical_care: "Medical Care",
  respite_care: "Respite Care",
  palliative_care: "Palliative Care",
  other: "Other",
};

interface BookingStats {
  total: number;
  pending: number;
  confirmed: number;
  in_progress: number;
  completed: number;
  cancelled: number;
}

const PAYABLE_BOOKING_STATUSES: BookingStatus[] = [
  "payment_pending",
  "confirmed",
  "active",
  "in_progress",
];

const CANCELABLE_BOOKING_STATUSES: BookingStatus[] = [
  "pending",
  "accepted",
  "agreement_pending",
  "payment_pending",
  "confirmed",
];

const PAID_PAYMENT_STATUSES = new Set([
  "fully_paid",
  "completed",
  "paid",
  "refunded",
]);

function getBookingPaymentTotals(booking: Booking) {
  const total =
    booking.pricing?.total ??
    booking.pricing?.totalAmount ??
    booking.totalAmount ??
    0;
  const paid = booking.payment?.amountPaid ?? booking.amountPaid ?? 0;
  const dueFromApi = booking.payment?.amountDue ?? booking.amountDue;
  const due =
    typeof dueFromApi === "number"
      ? Math.max(0, dueFromApi)
      : Math.max(0, total - paid);

  return { total, paid, due };
}

function isBookingPaymentSettled(booking: Booking): boolean {
  const paymentStatus = String(
    booking.payment?.status ?? booking.paymentStatus ?? "",
  ).toLowerCase();
  const { due } = getBookingPaymentTotals(booking);
  return due <= 0 || PAID_PAYMENT_STATUSES.has(paymentStatus);
}

function canCancelBooking(booking: Booking): boolean {
  return (
    CANCELABLE_BOOKING_STATUSES.includes(booking.status) &&
    !isBookingPaymentSettled(booking)
  );
}

export default function BookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<BookingStats | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    pages: 0,
  });
  const [filters, setFilters] = useState<BookingFilters>({
    page: 1,
    limit: 10,
  });
  const [activeTab, setActiveTab] = useState<"all" | "upcoming" | "past">("all");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [newBookingId, setNewBookingId] = useState<string | null>(null);
  const searchParams = useSearchParams();

  // Fetch bookings
  const fetchBookings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await bookingService.getMyBookings(filters);
      if (response.success && response.data) {
        setBookings(response.data.bookings);
        setPagination(response.data.pagination);
        
        // Calculate stats from bookings
        const bookingsList = response.data.bookings;
        const calculatedStats: BookingStats = {
          total: response.data.pagination.total,
          pending: bookingsList.filter((b: Booking) => b.status === "pending").length,
          confirmed: bookingsList.filter((b: Booking) => b.status === "confirmed").length,
          in_progress: bookingsList.filter((b: Booking) => b.status === "in_progress").length,
          completed: bookingsList.filter((b: Booking) => b.status === "completed").length,
          cancelled: bookingsList.filter((b: Booking) => b.status === "cancelled").length,
        };
        setStats(calculatedStats);
      }

      // Fetch calendar events
      try {
        const calendarResponse = await bookingService.getCalendarEvents();
        if (calendarResponse.success && calendarResponse.data) {
          const events: CalendarEvent[] = calendarResponse.data.events.map((event: CalendarEventData) => ({
            id: event.id,
            title: event.title,
            start: event.start,
            ...(event.end !== undefined ? { end: event.end } : {}),
            ...(event.startTime !== undefined ? { startTime: event.startTime } : {}),
            ...(event.endTime !== undefined ? { endTime: event.endTime } : {}),
            status: event.status,
            type: "session" as const,
            data: event,
          }));
          setCalendarEvents(events);
        }
      } catch {
        // Calendar endpoint may not exist yet
        setCalendarEvents([]);
      }
    } catch (err) {
      console.error("Failed to fetch bookings:", err);
      setError("Failed to load bookings. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  const refreshFromRealtime = useCallback(
    (message?: string) => {
      if (message) {
        setActionSuccess(message);
        window.setTimeout(() => setActionSuccess(null), 3000);
      }
      void fetchBookings();
    },
    [fetchBookings],
  );

  const { connected: realtimeConnected } = useRealtimeDashboard({
    onBookingCreated: () => refreshFromRealtime(),
    onBookingAccepted: () => refreshFromRealtime(),
    onBookingConfirmed: () => refreshFromRealtime(),
    onPaymentCompleted: () =>
      refreshFromRealtime("Payment received. Booking status updated."),
    onDisputeCreated: () => refreshFromRealtime(),
  });

  useEffect(() => {
    const storedUser = authService.getCurrentUser();
    if (!storedUser) {
      router.push("/login");
      return;
    }
    setUser(storedUser);
    fetchBookings();
    // Show new booking banner if redirected from booking form
    const bookedId = searchParams.get("booked");
    if (bookedId) setNewBookingId(bookedId);
  }, [router, fetchBookings, searchParams]);

  // Handle status filter change
  const handleStatusFilter = (status: BookingStatus | undefined) => {
    setFilters((prev) => {
      const nextFilters: BookingFilters = { ...prev, page: 1 };
      if (status !== undefined) {
        nextFilters.status = status;
      } else {
        delete nextFilters.status;
      }
      return nextFilters;
    });
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Format price
  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("en-NP", {
      style: "currency",
      currency: "NPR",
    }).format(amount);
  };

  // Handle caregiver accept booking
  const handleAcceptBooking = async (bookingId: string) => {
    setIsActionLoading(true);
    try {
      const response = await bookingService.confirmBooking(bookingId);
      if (response.success) {
        setActionSuccess("Request accepted. Agreement is now required.");
        await fetchBookings();
        setTimeout(() => setActionSuccess(null), 3000);
      }
    } catch (err) {
      console.error("Failed to accept booking:", err);
      setError("Failed to accept booking. Please try again.");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle caregiver reject booking
  const handleRejectBooking = async (bookingId: string, reason: string) => {
    setIsActionLoading(true);
    try {
      const response = await bookingService.rejectBooking(bookingId, reason);
      if (response.success) {
        setActionSuccess("Booking declined.");
        await fetchBookings();
        setTimeout(() => setActionSuccess(null), 3000);
      }
    } catch (err) {
      console.error("Failed to reject booking:", err);
      setError("Failed to reject booking. Please try again.");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle cancel booking
  const handleCancelBooking = async (bookingId: string, reason: string) => {
    const bookingToCancel = bookings.find((item) => item._id === bookingId);
    if (bookingToCancel && !canCancelBooking(bookingToCancel)) {
      setError("Cancellation is not allowed after payment is completed.");
      return;
    }

    setIsActionLoading(true);
    try {
      const response = await bookingService.cancelBooking(bookingId, reason);
      if (response.success) {
        setActionSuccess("Booking cancelled.");
        await fetchBookings();
        setTimeout(() => setActionSuccess(null), 3000);
      }
    } catch (err) {
      console.error("Failed to cancel booking:", err);
      setError("Failed to cancel booking. Please try again.");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle calendar event click
  const handleEventClick = (event: CalendarEvent) => {
    const bookingData = bookings.find(b => b._id === event.id);
    if (bookingData) {
      setSelectedBooking(bookingData);
      setShowDetailModal(true);
    }
  };

  // Handle date select on calendar
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  // Get filtered bookings based on active tab
  const getFilteredBookings = () => {
    const now = new Date();
    switch (activeTab) {
      case "upcoming":
        return bookings.filter(
          (b) =>
            new Date(b.schedule.startDate) >= now &&
            [
              "pending",
              "accepted",
              "agreement_pending",
              "payment_pending",
              "confirmed",
              "active",
              "in_progress",
            ].includes(b.status)
        );
      case "past":
        return bookings.filter(
          (b) =>
            (b.schedule.endDate && new Date(b.schedule.endDate) < now) ||
            ["completed", "cancelled", "rejected"].includes(b.status)
        );
      default:
        return bookings;
    }
  };

  const filteredBookings = getFilteredBookings();

  // Render stats cards
  const renderStatsCards = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-gray-500 text-sm">📊</span>
          <span className="text-xs text-gray-500 uppercase">Total</span>
        </div>
        <p className="text-2xl font-bold text-gray-900">{stats?.total || 0}</p>
      </div>
      
      <div className="bg-amber-50 rounded-xl p-4 shadow-sm border border-amber-200">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-amber-500 text-sm">⏳</span>
          <span className="text-xs text-amber-600 uppercase">Pending</span>
        </div>
        <p className="text-2xl font-bold text-amber-700">{stats?.pending || 0}</p>
      </div>

      <div className="bg-primary-50 rounded-xl p-4 shadow-sm border border-primary-500/20">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-primary-500 text-sm">✓✓</span>
          <span className="text-xs text-primary-500 uppercase">Confirmed</span>
        </div>
        <p className="text-2xl font-bold text-primary-500">{stats?.confirmed || 0}</p>
      </div>
      
      <div className="bg-secondary-50 rounded-xl p-4 shadow-sm border border-secondary-500/20">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-secondary-500 text-sm">▶</span>
          <span className="text-xs text-secondary-500 uppercase">In Progress</span>
        </div>
        <p className="text-2xl font-bold text-secondary-500">{stats?.in_progress || 0}</p>
      </div>
      
      <div className="bg-emerald-50 rounded-xl p-4 shadow-sm border border-emerald-200">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-emerald-500 text-sm">✓</span>
          <span className="text-xs text-emerald-600 uppercase">Completed</span>
        </div>
        <p className="text-2xl font-bold text-emerald-700">{stats?.completed || 0}</p>
      </div>
      
      <div className="bg-gray-100 rounded-xl p-4 shadow-sm border border-gray-200">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-gray-500 text-sm">⊘</span>
          <span className="text-xs text-gray-600 uppercase">Cancelled</span>
        </div>
        <p className="text-2xl font-bold text-gray-700">{stats?.cancelled || 0}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-linear-to-br from-primary-50 to-secondary-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
              <p className="mt-0.5 text-sm text-gray-500">
                {user?.role === "careseeker" 
                  ? "Manage your care requests and appointments" 
                  : "View and manage booking requests from care seekers"}
              </p>
            </div>
            <div className="flex gap-3">
              <div
                className={`hidden md:flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium ${
                  realtimeConnected
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                    : "bg-gray-50 border-gray-200 text-gray-500"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    realtimeConnected ? "bg-emerald-500" : "bg-gray-400"
                  }`}
                />
                {realtimeConnected ? "Live updates on" : "Live updates off"}
              </div>
              <Link
                href="/dashboard"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-slate-200 rounded-lg hover:bg-primary-50 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Dashboard
              </Link>
              {user?.role === "careseeker" && (
                <Link
                  href="/search"
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Find Caregiver
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* New booking success banner */}
        {newBookingId && (
          <div className="bg-linear-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-emerald-800">Booking request sent!</p>
              <p className="text-sm text-emerald-700 mt-0.5">Your request is <strong>pending</strong> — the caregiver will respond shortly. After both parties accept the agreement, a <strong>Pay Now</strong> option will appear.</p>
            </div>
            <button onClick={() => setNewBookingId(null)} className="text-emerald-500 hover:text-emerald-700 shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}

        {/* Success message */}
        {actionSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl mb-6 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {actionSuccess}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
            <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Stats Cards */}
        {stats && renderStatsCards()}

        {/* Tabs, Filters and View Toggle */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border border-slate-200">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Tab buttons */}
            <div className="flex gap-1 p-1 bg-primary-50 rounded-lg">
              {(["all", "upcoming", "past"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === tab
                      ? "bg-white text-primary-500 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* View toggle */}
              <div className="flex gap-1 p-1 bg-primary-50 rounded-lg">
                <button
                  onClick={() => setViewMode("list")}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                    viewMode === "list"
                      ? "bg-white text-primary-500 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  List
                </button>
                <button
                  onClick={() => setViewMode("calendar")}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                    viewMode === "calendar"
                      ? "bg-white text-primary-500 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Calendar
                </button>
              </div>

              {/* Status filter */}
              <select
                value={filters.status || ""}
                onChange={(e) =>
                  handleStatusFilter(
                    (e.target.value as BookingStatus) || undefined
                  )
                }
                className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="accepted">Request Accepted (Agreement Required)</option>
                <option value="agreement_pending">Agreement Required</option>
                <option value="payment_pending">Payment Pending</option>
                <option value="confirmed">Payment Completed</option>
                <option value="active">Active</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="disputed">Disputed</option>
                <option value="cancelled">Cancelled</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {/* Loading state */}
        {isLoading ? (
          <div className="bg-white rounded-xl shadow-sm p-8 border border-slate-200">
            <div className="flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-primary-500"></div>
              <p className="mt-4 text-gray-500">Loading bookings...</p>
            </div>
          </div>
        ) : viewMode === "calendar" ? (
          /* Calendar View */
          <Calendar
            events={calendarEvents}
            onEventClick={handleEventClick}
            onDateSelect={handleDateSelect}
            {...(selectedDate !== undefined ? { selectedDate } : {})}
            className="border border-slate-200"
          />
        ) : filteredBookings.length === 0 ? (
          /* Empty state */
          <div className="bg-white rounded-xl shadow-sm p-12 border border-slate-200">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-linear-to-br from-primary-50 to-secondary-50 rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-10 h-10 text-primary-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No bookings found
              </h3>
              <p className="text-gray-500 mb-6 max-w-sm">
                {user?.role === "careseeker"
                  ? "Start by searching for a caregiver and booking their services for quality care."
                  : "You don't have any booking requests yet. Keep your profile updated to attract more clients!"}
              </p>
              {user?.role === "careseeker" && (
                <Link
                  href="/search"
                  className="px-6 py-3 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Find a Caregiver
                </Link>
              )}
            </div>
          </div>
        ) : (
          /* Bookings list */
          <div className="space-y-4">
            {filteredBookings.map((booking) => {
              const statusConfig = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
              const { total: bookingTotal, due: bookingAmountDue } =
                getBookingPaymentTotals(booking);
              const paymentSettled = isBookingPaymentSettled(booking);
              const showPayNow =
                user?.role === "careseeker" &&
                PAYABLE_BOOKING_STATUSES.includes(booking.status) &&
                !paymentSettled;
              const showPaidBadge =
                user?.role === "careseeker" &&
                PAYABLE_BOOKING_STATUSES.includes(booking.status) &&
                paymentSettled;
              return (
              <div
                key={booking._id}
                className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-all border border-slate-200 group"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Left section - Booking info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-sm font-semibold text-primary-500">
                        #{booking.bookingNumber}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${statusConfig.bgColor} ${statusConfig.color}`}
                      >
                        <span>{statusConfig.icon}</span>
                        {statusConfig.label}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      {SERVICE_TYPE_LABELS[booking.serviceType] || booking.serviceType}
                    </h3>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-600">
                      {/* Other party info */}
                      <span className="flex items-center gap-1.5">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold ${
                          user?.role === "careseeker" ? "bg-blue-500" : "bg-orange-500"
                        }`}>
                          {user?.role === "careseeker"
                            ? getUserProp(booking.caregiverId, "fullName").charAt(0)
                            : getUserProp(booking.careSeekerId, "fullName").charAt(0)}
                        </div>
                        <span className="font-medium">
                          {user?.role === "careseeker"
                            ? getUserProp(booking.caregiverId, "fullName")
                            : getUserProp(booking.careSeekerId, "fullName")}
                        </span>
                      </span>
                      
                      {/* Schedule */}
                      <span className="flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {formatDate(booking.schedule.startDate)}{booking.schedule.endDate ? ` - ${formatDate(booking.schedule.endDate)}` : ""}
                      </span>
                      
                      {/* Location */}
                      {booking.location && (
                        <span className="flex items-center gap-1.5">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {booking.location?.city}, {booking.location?.state}
                        </span>
                      )}
                    </div>

                    {/* Care recipient info */}
                    {booking.careRecipient && (
                      <div className="mt-3 flex items-center gap-2 text-sm">
                        <span className="text-gray-500">Care for:</span>
                        <span className="font-medium text-gray-700">
                          {booking.careRecipient.name}
                          {booking.careRecipient.age && ` (${booking.careRecipient.age} yrs)`}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Right section - Price and actions */}
                  <div className="flex flex-col items-end gap-3">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">
                        {formatPrice(bookingTotal)}
                      </p>
                      <p className="text-sm text-gray-500 capitalize">
                        {booking.durationType} rate
                      </p>
                      {user?.role === "careseeker" &&
                        PAYABLE_BOOKING_STATUSES.includes(booking.status) && (
                          <p
                            className={`text-xs mt-1 font-medium ${
                              paymentSettled
                                ? "text-emerald-600"
                                : "text-amber-600"
                            }`}
                          >
                            {paymentSettled
                              ? "Paid"
                              : `Due: ${formatPrice(bookingAmountDue)}`}
                          </p>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-2 justify-end">
                      <button
                        onClick={() => {
                          setSelectedBooking(booking);
                          setShowDetailModal(true);
                        }}
                        className="px-4 py-2 text-sm font-medium text-primary-500 bg-primary-50 rounded-lg hover:bg-primary-500/20 transition-colors"
                      >
                        View Details
                      </button>

                      {/* Caregiver actions for pending bookings */}
                      {user?.role === "caregiver" && booking.status === "pending" && (
                        <>
                          <button
                            onClick={() => handleAcceptBooking(booking._id)}
                            disabled={isActionLoading}
                            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                          >
                            {isActionLoading ? "..." : "Accept"}
                          </button>
                          <button
                            onClick={() => {
                              const reason = prompt("Please provide a reason for declining:");
                              if (reason) handleRejectBooking(booking._id, reason);
                            }}
                            disabled={isActionLoading}
                            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                          >
                            Decline
                          </button>
                        </>
                      )}

                      {/* Cancel button for pre-service stages */}
                      {canCancelBooking(booking) && (
                        <button
                          onClick={() => {
                            const reason = prompt("Please provide a reason for cancellation:");
                            if (reason) handleCancelBooking(booking._id, reason);
                          }}
                          disabled={isActionLoading}
                          className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      )}

                      {/* Pay Now button for unpaid lifecycle stages (careseeker only) */}
                      {showPayNow && (
                        <Link
                          href={`/booking/${booking._id}/payment`}
                          className="px-4 py-2 text-sm font-semibold text-white bg-linear-to-r from-primary-500 to-[#5B73F0] rounded-lg hover:from-primary-600 hover:to-primary-500 transition-all shadow-sm"
                        >
                          Pay Now
                        </Link>
                      )}

                      {/* Paid indicator after successful payment */}
                      {showPaidBadge && (
                        <span className="px-4 py-2 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg">
                          Paid
                        </span>
                      )}

                      {/* Invoice download for completed bookings */}
                      {booking.status === "completed" && (
                        <a
                          href={`/api/payments/bookings/${booking._id}/final-invoice/pdf`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors flex items-center gap-1.5"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                          Invoice PDF
                        </a>
                      )}

                      {/* Check-in button for confirmed bookings (caregiver only) */}
                      {user?.role === "caregiver" && booking.status === "confirmed" && !booking.checkIn && (
                        <button
                          onClick={() => router.push(`/dashboard/bookings/${booking._id}?action=checkin`)}
                          className="px-4 py-2 text-sm font-medium text-white bg-secondary-500 rounded-lg hover:bg-secondary-600 transition-colors"
                        >
                          Check In
                        </button>
                      )}

                      {/* Check-out button for in-progress bookings (caregiver only) */}
                      {user?.role === "caregiver" && booking.status === "in_progress" && !booking.checkOut && (
                        <button
                          onClick={() => router.push(`/dashboard/bookings/${booking._id}?action=checkout`)}
                          className="px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors"
                        >
                          Check Out
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              );
            })}

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-slate-200 rounded-lg hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  ← Previous
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: pagination.pages }, (_, i) => i + 1)
                    .slice(Math.max(0, pagination.page - 3), Math.min(pagination.pages, pagination.page + 2))
                    .map((page) => (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`w-9 h-9 text-sm font-medium rounded-lg transition-colors ${
                          page === pagination.page
                            ? "bg-primary-500 text-white"
                            : "text-gray-600 bg-white border border-slate-200 hover:bg-primary-50"
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                </div>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.pages}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-slate-200 rounded-lg hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Booking Detail Modal */}
        {showDetailModal && selectedBooking && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-200 sticky top-0 bg-white rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Booking Details</h2>
                    <p className="text-sm text-primary-500 font-semibold">#{selectedBooking.bookingNumber}</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      setSelectedBooking(null);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Status Badge */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Status</span>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${STATUS_CONFIG[selectedBooking.status]?.bgColor || "bg-gray-100"} ${STATUS_CONFIG[selectedBooking.status]?.color || "text-gray-700"}`}>
                    <span>{STATUS_CONFIG[selectedBooking.status]?.icon || "?"}</span>
                    {STATUS_CONFIG[selectedBooking.status]?.label || selectedBooking.status}
                  </span>
                </div>

                {/* Timeline */}
                <div className="bg-[#F8FAFC] rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Booking Workflow</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        selectedBooking.createdAt ? "bg-emerald-100" : "bg-gray-100"
                      }`}>
                        <svg className={`w-4 h-4 ${selectedBooking.createdAt ? "text-emerald-600" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Request Created</p>
                        <p className="text-xs text-gray-500">{formatDate(selectedBooking.createdAt || new Date().toISOString())}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        [
                          "accepted",
                          "agreement_pending",
                          "payment_pending",
                          "confirmed",
                          "active",
                          "in_progress",
                          "completed",
                        ].includes(selectedBooking.status)
                          ? "bg-emerald-100" 
                          : selectedBooking.status === "rejected" 
                            ? "bg-red-100"
                            : "bg-gray-100"
                      }`}>
                        <svg className={`w-4 h-4 ${
                          [
                            "accepted",
                            "agreement_pending",
                            "payment_pending",
                            "confirmed",
                            "active",
                            "in_progress",
                            "completed",
                          ].includes(selectedBooking.status)
                            ? "text-emerald-600" 
                            : selectedBooking.status === "rejected"
                              ? "text-red-600"
                              : "text-gray-400"
                        }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {selectedBooking.status === "rejected" ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          )}
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Caregiver Response</p>
                        <p className="text-xs text-gray-500">
                          {selectedBooking.status === "pending" 
                            ? "Waiting for caregiver to respond" 
                            : selectedBooking.status === "rejected"
                              ? "Booking declined by caregiver"
                              : ["accepted", "agreement_pending"].includes(selectedBooking.status)
                                ? "Caregiver accepted. Agreement signatures pending"
                                : selectedBooking.status === "payment_pending"
                                  ? "Agreement accepted. Booking locked and awaiting payment"
                                  : "Agreement accepted and payment completed"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        ["active", "in_progress", "completed"].includes(selectedBooking.status)
                          ? "bg-emerald-100" 
                          : "bg-gray-100"
                      }`}>
                        <svg className={`w-4 h-4 ${
                          ["active", "in_progress", "completed"].includes(selectedBooking.status) ? "text-emerald-600" : "text-gray-400"
                        }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Service Started</p>
                        <p className="text-xs text-gray-500">
                          {["active", "in_progress", "completed"].includes(selectedBooking.status)
                            ? "Care session started"
                            : "Pending previous steps"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Parties */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-orange-50 rounded-xl p-4">
                    <p className="text-xs text-orange-600 font-semibold mb-2 uppercase">Care Seeker</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-semibold">
                        {getUserProp(selectedBooking.careSeekerId, "fullName").charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{getUserProp(selectedBooking.careSeekerId, "fullName")}</p>
                        <p className="text-xs text-gray-500">{getUserProp(selectedBooking.careSeekerId, "email")}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 rounded-xl p-4">
                    <p className="text-xs text-blue-600 font-semibold mb-2 uppercase">Caregiver</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                        {getUserProp(selectedBooking.caregiverId, "fullName").charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{getUserProp(selectedBooking.caregiverId, "fullName")}</p>
                        <p className="text-xs text-gray-500">{getUserProp(selectedBooking.caregiverId, "email")}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 mb-1">Service Type</p>
                    <p className="font-medium text-gray-900">{SERVICE_TYPE_LABELS[selectedBooking.serviceType] || selectedBooking.serviceType}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">Booking Type</p>
                    <p className="font-medium text-gray-900 capitalize">{selectedBooking.bookingType?.replace("_", " ") || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">Start Date</p>
                    <p className="font-medium text-gray-900">{formatDate(selectedBooking.schedule?.startDate || "")}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">End Date</p>
                    <p className="font-medium text-gray-900">{selectedBooking.schedule?.endDate ? formatDate(selectedBooking.schedule.endDate) : "N/A"}</p>
                  </div>
                  {selectedBooking.location && (
                    <>
                      <div className="col-span-2">
                        <p className="text-gray-500 mb-1">Location</p>
                        <p className="font-medium text-gray-900">
                          {selectedBooking.location.address && `${selectedBooking.location.address}, `}
                          {selectedBooking.location.city}, {selectedBooking.location.state}
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {/* Care Recipient */}
                {selectedBooking.careRecipient && (
                  <div className="bg-[#F8FAFC] rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Care Recipient</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-gray-500">Name</p>
                        <p className="font-medium text-gray-900">{selectedBooking.careRecipient.name}</p>
                      </div>
                      {selectedBooking.careRecipient.age && (
                        <div>
                          <p className="text-gray-500">Age</p>
                          <p className="font-medium text-gray-900">{selectedBooking.careRecipient.age} years</p>
                        </div>
                      )}
                      {selectedBooking.careRecipient.relationship && (
                        <div>
                          <p className="text-gray-500">Relationship</p>
                          <p className="font-medium text-gray-900">{selectedBooking.careRecipient.relationship}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Pricing */}
                <div className="bg-linear-to-br from-primary-50 to-secondary-50 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Pricing Details</h3>
                  <div className="space-y-2">
                    {selectedBooking.pricing?.subtotal && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal</span>
                        <span className="font-medium">{formatPrice(selectedBooking.pricing.subtotal)}</span>
                      </div>
                    )}
                    {selectedBooking.pricing?.platformFee && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Platform Fee</span>
                        <span className="font-medium">{formatPrice(selectedBooking.pricing.platformFee)}</span>
                      </div>
                    )}
                    <div className="border-t border-gray-200 pt-2 flex justify-between">
                      <span className="font-semibold text-gray-900">Total</span>
                      <span className="font-bold text-primary-500 text-lg">{formatPrice(selectedBooking.pricing?.totalAmount ?? 0)}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-6 border-t border-slate-200 flex justify-between gap-3 sticky bottom-0 bg-white rounded-b-2xl">
                <div>
                  {canCancelBooking(selectedBooking) && (
                    <button
                      onClick={() => {
                        const reason = prompt("Please provide a reason for cancellation:");
                        if (reason) {
                          handleCancelBooking(selectedBooking._id, reason);
                          setShowDetailModal(false);
                          setSelectedBooking(null);
                        }
                      }}
                      disabled={isActionLoading}
                      className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      Cancel Booking
                    </button>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      setSelectedBooking(null);
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-slate-200 rounded-lg hover:bg-primary-50 transition-colors"
                  >
                    Close
                  </button>
                  <Link
                    href={`/dashboard/bookings/${selectedBooking._id}`}
                    className="px-6 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-[#3854DB] transition-colors"
                  >
                    Full Details
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}


