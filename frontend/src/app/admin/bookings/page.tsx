"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AdminLayout } from "@/components";
import { Calendar, CalendarEvent } from "@/components/ui/Calendar";
import { adminService, AdminBooking } from "@/services/api/admin.service";
import { bookingService, CalendarEventData } from "@/services/api/booking.service";

// ============================================
// TYPES & CONFIGS
// ============================================

interface BookingStats {
  total: number;
  pending: number;
  confirmed: number;
  in_progress: number;
  completed: number;
  cancelled: number;
  disputed: number;
  thisMonth?: number;
  thisWeek?: number;
  revenue?: {
    total: number;
    platformFees: number;
  };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: string }> = {
  pending: { label: "Pending", color: "text-amber-700", bgColor: "bg-amber-100", icon: "⏳" },
  confirmed: { label: "Confirmed", color: "text-primary-500", bgColor: "bg-[#F0F5FF]", icon: "✓✓" },
  rejected: { label: "Rejected", color: "text-red-700", bgColor: "bg-red-100", icon: "✗" },
  in_progress: { label: "In Progress", color: "text-secondary-500", bgColor: "bg-[#F8F5FF]", icon: "▶" },
  completed: { label: "Completed", color: "text-emerald-700", bgColor: "bg-emerald-100", icon: "✓" },
  cancelled: { label: "Cancelled", color: "text-gray-700", bgColor: "bg-gray-200", icon: "⊘" },
  disputed: { label: "Disputed", color: "text-orange-700", bgColor: "bg-orange-100", icon: "⚠" },
};

const SERVICE_TYPE_LABELS: Record<string, string> = {
  elderly_care: "Elderly Care",
  child_care: "Child Care",
  special_needs: "Special Needs",
  disability_care: "Disability Care",
  post_surgery: "Post-Surgery",
  companionship: "Companionship",
  respite_care: "Respite Care",
  palliative_care: "Palliative Care",
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function AdminBookingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"list" | "calendar">("list");
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<BookingStats | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    pages: 0,
  });
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<AdminBooking | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  // Fetch all data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [bookingsResponse, statsResponse] = await Promise.all([
        adminService.getBookings({
          page: pagination.page,
          limit: pagination.limit,
          ...(statusFilter ? { status: statusFilter } : {}),
          ...(searchQuery ? { search: searchQuery } : {}),
        }),
        adminService.getBookingStats(),
      ]);
      
      if (bookingsResponse.success && bookingsResponse.data) {
        setBookings(bookingsResponse.data.bookings || []);
        if (bookingsResponse.data.pagination) {
          setPagination(bookingsResponse.data.pagination);
        }
      }
      
      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data as BookingStats);
      }

      // Fetch calendar events
      try {
        const calendarResponse = await bookingService.getAdminCalendarEvents();
        if (calendarResponse.success && calendarResponse.data) {
          const events: CalendarEvent[] = calendarResponse.data.events
            .map((event: CalendarEventData) => ({
              id: event.id,
              title: event.title,
              start: event.start,
              ...(event.end ? { end: event.end } : {}),
              ...(event.startTime ? { startTime: event.startTime } : {}),
              ...(event.endTime ? { endTime: event.endTime } : {}),
              ...(event.status ? { status: event.status } : {}),
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
      console.error("Failed to fetch data:", err);
      setError("Failed to load bookings data");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, pagination.page, pagination.limit, searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle cancel booking
  const handleCancelBooking = async (bookingId: string, reason: string) => {
    try {
      await bookingService.adminCancelBooking(bookingId, reason);
      await fetchData();
    } catch (err) {
      console.error("Failed to cancel booking:", err);
      setError("Failed to cancel booking");
    }
  };

  // Format helpers
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("en-NP", {
      style: "currency",
      currency: "NPR",
    }).format(amount);
  };

  // Handle calendar event click
  const handleEventClick = (event: CalendarEvent) => {
    const bookingData = event.data as CalendarEventData;
    router.push(`/admin/bookings/${bookingData.id}`);
  };

  // Handle date select on calendar
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  // Render stats cards
  const renderStatsCards = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-8 gap-4">
      <div className="bg-white rounded-xl p-4 shadow-sm border border-[#E1E6EF] hover:shadow-md transition-shadow">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-linear-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <span className="text-gray-600 text-sm">📊</span>
          </div>
        </div>
        <p className="text-2xl font-bold text-gray-900">{stats?.total || 0}</p>
        <p className="text-xs text-gray-500">Total</p>
      </div>
      
      <div className="bg-amber-50 rounded-xl p-4 shadow-sm border border-amber-200 hover:shadow-md transition-shadow">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
            <span className="text-amber-600 text-sm">⏳</span>
          </div>
        </div>
        <p className="text-2xl font-bold text-amber-700">{stats?.pending || 0}</p>
        <p className="text-xs text-amber-600">Pending</p>
      </div>

      <div className="bg-[#F0F5FF] rounded-xl p-4 shadow-sm border border-primary-500/20 hover:shadow-md transition-shadow">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center">
            <span className="text-primary-500 text-sm">✓✓</span>
          </div>
        </div>
        <p className="text-2xl font-bold text-primary-500">{stats?.confirmed || 0}</p>
        <p className="text-xs text-primary-500">Confirmed</p>
      </div>
      
      <div className="bg-[#F8F5FF] rounded-xl p-4 shadow-sm border border-secondary-500/20 hover:shadow-md transition-shadow">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-secondary-500/10 flex items-center justify-center">
            <span className="text-secondary-500 text-sm">▶</span>
          </div>
        </div>
        <p className="text-2xl font-bold text-secondary-500">{stats?.in_progress || 0}</p>
        <p className="text-xs text-secondary-500">In Progress</p>
      </div>
      
      <div className="bg-emerald-50 rounded-xl p-4 shadow-sm border border-emerald-200 hover:shadow-md transition-shadow">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
            <span className="text-emerald-600 text-sm">✓</span>
          </div>
        </div>
        <p className="text-2xl font-bold text-emerald-700">{stats?.completed || 0}</p>
        <p className="text-xs text-emerald-600">Completed</p>
      </div>
      
      <div className="bg-gray-100 rounded-xl p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center">
            <span className="text-gray-600 text-sm">⊘</span>
          </div>
        </div>
        <p className="text-2xl font-bold text-gray-700">{stats?.cancelled || 0}</p>
        <p className="text-xs text-gray-600">Cancelled</p>
      </div>
      
      <div className="bg-orange-50 rounded-xl p-4 shadow-sm border border-orange-200 hover:shadow-md transition-shadow">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
            <span className="text-orange-600 text-sm">⚠</span>
          </div>
        </div>
        <p className="text-2xl font-bold text-orange-700">{stats?.disputed || 0}</p>
        <p className="text-xs text-orange-600">Disputed</p>
      </div>
    </div>
  );

  // Render booking list
  const renderBookingList = (bookingsList: AdminBooking[]) => (
    <div className="bg-white rounded-xl shadow-sm border border-[#E1E6EF] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-[#F8FAFC] border-b border-[#E1E6EF]">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Booking</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Care Seeker</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Caregiver</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Service</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Schedule</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Amount</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E1E6EF]">
            {bookingsList.map((booking) => {
              const statusConfig = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
              return (
                <tr key={booking._id} className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="px-4 py-4">
                    <div>
                      <p className="text-sm font-semibold text-primary-500">#{booking.bookingNumber}</p>
                      <p className="text-xs text-gray-500">{formatDate(booking.createdAt)}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-linear-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xs font-semibold">
                        {booking.careSeekerId?.fullName?.charAt(0) || "C"}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{booking.careSeekerId?.fullName || "N/A"}</p>
                        <p className="text-xs text-gray-500">{booking.careSeekerId?.email || ""}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-linear-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-semibold">
                        {booking.caregiverId?.fullName?.charAt(0) || "G"}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{booking.caregiverId?.fullName || "N/A"}</p>
                        <p className="text-xs text-gray-500">{booking.caregiverId?.email || ""}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm text-gray-700">
                      {SERVICE_TYPE_LABELS[booking.serviceType || ""] || booking.serviceType || "N/A"}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div>
                      <p className="text-sm text-gray-900">{formatDate(booking.schedule?.startDate)}</p>
                      {booking.schedule?.endDate && (
                        <p className="text-xs text-gray-500">to {formatDate(booking.schedule.endDate)}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                      <span>{statusConfig.icon}</span>
                      {statusConfig.label}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm font-semibold text-gray-900">
                      {formatPrice(booking.pricing?.totalAmount ?? 0)}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedBooking(booking);
                          setShowDetailModal(true);
                        }}
                        className="p-2 rounded-lg hover:bg-[#F0F5FF] text-primary-500 transition-colors"
                        title="View Details"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      
                      {["pending", "confirmed", "in_progress"].includes(booking.status) && (
                        <button
                          onClick={() => {
                            const reason = prompt("Enter cancellation reason:");
                            if (reason) handleCancelBooking(booking._id, reason);
                          }}
                          className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                          title="Cancel Booking"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#E1E6EF] bg-[#F8FAFC]">
          <p className="text-sm text-gray-600">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} bookings
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-[#E1E6EF] rounded-lg hover:bg-[#F0F5FF] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            {Array.from({ length: pagination.pages }, (_, i) => i + 1)
              .slice(Math.max(0, pagination.page - 3), Math.min(pagination.pages, pagination.page + 2))
              .map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`w-9 h-9 text-sm font-medium rounded-lg transition-colors ${
                    page === pagination.page
                      ? "bg-primary-500 text-white"
                      : "text-gray-600 bg-white border border-[#E1E6EF] hover:bg-[#F0F5FF]"
                  }`}
                >
                  {page}
                </button>
              ))}
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.pages}
              className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-[#E1E6EF] rounded-lg hover:bg-[#F0F5FF] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {bookingsList.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-[#F0F5FF] rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No bookings found</h3>
          <p className="text-gray-500">There are no bookings matching your filters.</p>
        </div>
      )}
    </div>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bookings Management</h1>
            <p className="mt-1 text-sm text-gray-500">
              Monitor all platform bookings and track activities
            </p>
          </div>
          <button
            onClick={fetchData}
            className="px-4 py-2 text-sm font-medium text-primary-500 bg-[#F0F5FF] rounded-lg hover:bg-primary-500/20 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <svg className="w-5 h-5 text-red-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-red-800">{error}</p>
              <button onClick={fetchData} className="text-sm text-red-600 underline mt-1">Try again</button>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        {stats && renderStatsCards()}

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-[#E1E6EF] p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Tab buttons */}
            <div className="flex gap-1 p-1 bg-[#F0F5FF] rounded-lg">
              <button
                onClick={() => setActiveTab("list")}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                  activeTab === "list"
                    ? "bg-white text-primary-500 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                All Bookings
              </button>
              <button
                onClick={() => setActiveTab("calendar")}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                  activeTab === "calendar"
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

            {/* Filters - only show for list view */}
            {activeTab === "list" && (
              <div className="flex items-center gap-3">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search bookings..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 text-sm border border-[#E1E6EF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4461F2]/20 focus:border-primary-500 w-48"
                  />
                </div>
                
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 text-sm border border-[#E1E6EF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4461F2]/20 focus:border-primary-500 bg-white"
                >
                  <option value="">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="disputed">Disputed</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Content based on active tab */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#E1E6EF] border-t-[#4461F2]"></div>
          </div>
        ) : (
          <>
            {activeTab === "list" && renderBookingList(bookings)}
            {activeTab === "calendar" && (
              <Calendar
                events={calendarEvents}
                onEventClick={handleEventClick}
                onDateSelect={handleDateSelect}
                {...(selectedDate ? { selectedDate } : {})}
                className="border border-[#E1E6EF]"
              />
            )}
          </>
        )}

        {/* Detail Modal */}
        {showDetailModal && selectedBooking && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-[#E1E6EF]">
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
                {/* Status */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Status</span>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${STATUS_CONFIG[selectedBooking.status]?.bgColor} ${STATUS_CONFIG[selectedBooking.status]?.color}`}>
                    <span>{STATUS_CONFIG[selectedBooking.status]?.icon}</span>
                    {STATUS_CONFIG[selectedBooking.status]?.label}
                  </span>
                </div>

                {/* Timeline */}
                <div className="bg-[#F8FAFC] rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Booking Timeline</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                        <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Booking Created</p>
                        <p className="text-xs text-gray-500">{formatDateTime(selectedBooking.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Parties */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-orange-50 rounded-xl p-4">
                    <p className="text-xs text-orange-600 font-semibold mb-2">CARE SEEKER</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-semibold">
                        {selectedBooking.careSeekerId?.fullName?.charAt(0) || "C"}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{selectedBooking.careSeekerId?.fullName}</p>
                        <p className="text-xs text-gray-500">{selectedBooking.careSeekerId?.email}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 rounded-xl p-4">
                    <p className="text-xs text-blue-600 font-semibold mb-2">CAREGIVER</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                        {selectedBooking.caregiverId?.fullName?.charAt(0) || "G"}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{selectedBooking.caregiverId?.fullName}</p>
                        <p className="text-xs text-gray-500">{selectedBooking.caregiverId?.email}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Service Type</p>
                    <p className="text-sm font-medium text-gray-900">{SERVICE_TYPE_LABELS[selectedBooking.serviceType || ""] || selectedBooking.serviceType}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Booking Type</p>
                    <p className="text-sm font-medium text-gray-900 capitalize">{selectedBooking.bookingType?.replace("_", " ")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Start Date</p>
                    <p className="text-sm font-medium text-gray-900">{formatDate(selectedBooking.schedule?.startDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">End Date</p>
                    <p className="text-sm font-medium text-gray-900">{selectedBooking.schedule?.endDate ? formatDate(selectedBooking.schedule.endDate) : "N/A"}</p>
                  </div>
                </div>

                {/* Pricing */}
                <div className="bg-linear-to-br from-[#F0F5FF] to-[#F8F5FF] rounded-xl p-4">
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
                      <span className="font-bold text-primary-500 text-lg">{formatPrice(selectedBooking.pricing?.totalAmount ?? selectedBooking.pricing?.total ?? 0)}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-6 border-t border-[#E1E6EF] flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedBooking(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-[#E1E6EF] rounded-lg hover:bg-[#F0F5FF] transition-colors"
                >
                  Close
                </button>
                {selectedBooking.status === "disputed" && (                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      // Navigate to dispute resolution
                    }}
                    className="px-6 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    Resolve Dispute
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}