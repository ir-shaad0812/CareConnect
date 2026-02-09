"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, RotateCcw, ChevronDown, Calendar, ListIcon, LayoutList } from "lucide-react";
import { ACTIVITY_CONTENT_OPTIONS } from "@/lib/constants";
import { bookingService, notificationService, type Booking as ApiBooking, type Notification as ApiNotification } from "@/services";

// ============================================
// TYPES
// ============================================

type ActivityType = "booking" | "session" | "payment" | "review" | "document" | "system";
type ViewMode = "simplified" | "detailed";

interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  description?: string;
  status: string;
  date: Date;
  time?: string;
  caregiverName?: string;
  amount?: string;
  metadata?: Record<string, string>;
}

// ============================================
// CONFIGURATION
// ============================================

const TYPE_BADGE: Record<ActivityType, { bg: string; text: string; label: string }> = {
  booking: { bg: "bg-indigo-100", text: "text-indigo-700", label: "Booking" },
  session: { bg: "bg-emerald-100", text: "text-emerald-700", label: "Session" },
  payment: { bg: "bg-amber-100", text: "text-amber-700", label: "Payment" },
  review: { bg: "bg-purple-100", text: "text-purple-700", label: "Review" },
  document: { bg: "bg-cyan-100", text: "text-cyan-700", label: "Document" },
  system: { bg: "bg-gray-100", text: "text-gray-600", label: "System" },
};

// ACTIVITY_CONTENT_OPTIONS imported from @/lib/constants

// ============================================
// DATE HELPERS
// ============================================

const formatGroupDate = (date: Date): string => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = today.getTime() - dateDay.getTime();
  const daysDiff = Math.round(diff / (1000 * 60 * 60 * 24));

  if (daysDiff === 0) return "Today";
  if (daysDiff === 1) return "Yesterday";
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

// ============================================
// FALLBACK SAMPLE DATA (used when API is unavailable)
// ============================================

function generateSampleActivities(): Activity[] {
  const now = new Date();
  const activities: Activity[] = [];

  // Today
  activities.push(
    {
      id: "a1",
      type: "booking",
      title: "Booking Confirmed",
      description: "Child care booking with Michael Chen confirmed for this weekend.",
      status: "Confirmed",
      date: now,
      time: "10:32 AM",
      caregiverName: "Michael Chen",
    },
    {
      id: "a2",
      type: "payment",
      title: "Payment Processed",
      description: "Payment of $120 for elderly care session completed successfully.",
      status: "Completed",
      date: now,
      time: "09:15 AM",
      amount: "$120.00",
    }
  );

  // Yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  activities.push(
    {
      id: "a3",
      type: "session",
      title: "Session Completed",
      description: "Elderly care session with Sarah Johnson has been completed.",
      status: "Completed",
      date: yesterday,
      time: "05:00 PM",
      caregiverName: "Sarah Johnson",
    },
    {
      id: "a4",
      type: "review",
      title: "Review Submitted",
      description: "You left a 5-star review for Sarah Johnson's care session.",
      status: "Submitted",
      date: yesterday,
      time: "05:30 PM",
      caregiverName: "Sarah Johnson",
    }
  );

  // 3 days ago
  const threeDays = new Date(now);
  threeDays.setDate(threeDays.getDate() - 3);
  activities.push(
    {
      id: "a5",
      type: "booking",
      title: "Booking Requested",
      description: "Special needs care booking request sent to Emily Davis.",
      status: "Pending",
      date: threeDays,
      time: "02:45 PM",
      caregiverName: "Emily Davis",
    },
    {
      id: "a6",
      type: "document",
      title: "Document Uploaded",
      description: "Medical report uploaded for care plan review.",
      status: "Uploaded",
      date: threeDays,
      time: "11:00 AM",
    }
  );

  // 5 days ago
  const fiveDays = new Date(now);
  fiveDays.setDate(fiveDays.getDate() - 5);
  activities.push(
    {
      id: "a7",
      type: "payment",
      title: "Payment Received",
      description: "Refund of $45 processed for cancelled booking.",
      status: "Refunded",
      date: fiveDays,
      time: "03:20 PM",
      amount: "$45.00",
    },
    {
      id: "a8",
      type: "session",
      title: "Session Rescheduled",
      description: "Weekly check-in with Emily Davis moved to Thursday.",
      status: "Rescheduled",
      date: fiveDays,
      time: "09:00 AM",
      caregiverName: "Emily Davis",
    }
  );

  // 1 week ago
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  activities.push(
    {
      id: "a9",
      type: "booking",
      title: "Booking Cancelled",
      description: "Weekend care booking with James Wilson was cancelled.",
      status: "Cancelled",
      date: weekAgo,
      time: "04:10 PM",
      caregiverName: "James Wilson",
    },
    {
      id: "a10",
      type: "system",
      title: "Profile Updated",
      description: "Your care preferences and emergency contacts were updated.",
      status: "Updated",
      date: weekAgo,
      time: "10:00 AM",
    }
  );

  return activities;
}

// ============================================
// STATUS PILLS
// ============================================

const statusColor = (status: string): string => {
  const lower = status.toLowerCase();
  if (["confirmed", "completed", "uploaded", "updated", "submitted"].includes(lower))
    return "text-green-600";
  if (["pending", "rescheduled"].includes(lower)) return "text-amber-600";
  if (["cancelled", "refunded"].includes(lower)) return "text-red-500";
  return "text-gray-600";
};

// ============================================
// ACTIVITY PAGE
// ============================================

export default function ActivityPage() {
  const [allActivities, setAllActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [contentFilter, setContentFilter] = useState("all");
  const [viewMode, setViewMode] = useState<ViewMode>("simplified");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    let isActive = true;

    const bookingStatusToType = (status: string): ActivityType => {
      if (["completed", "in_progress"].includes(status)) return "session";
      if (["cancelled", "rejected", "confirmed", "pending", "reserved"].includes(status)) return "booking";
      return "system";
    };

    const mapBookings = (bookings: ApiBooking[]): Activity[] => {
      return bookings.map((booking) => {
        const careGiver = typeof booking.caregiverId === "string" ? null : booking.caregiverId;
        const created = new Date(booking.updatedAt || booking.createdAt);
        return {
          id: `booking-${booking._id}`,
          type: bookingStatusToType(booking.status),
          title: `Booking ${booking.status.replace(/_/g, " ")}`,
          description: `${String(booking.serviceType).replace(/_/g, " ")} booking update`,
          status: booking.status.replace(/_/g, " "),
          date: created,
          time: created.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          ...(careGiver?.fullName !== undefined ? { caregiverName: careGiver.fullName } : {}),
        };
      });
    };

    const notificationToType = (type: string): ActivityType => {
      if (type.startsWith("booking") || type === "check_in" || type === "check_out") return "booking";
      if (type.startsWith("payment")) return "payment";
      if (type.startsWith("review")) return "review";
      if (type.startsWith("document")) return "document";
      return "system";
    };

    const mapNotifications = (notifications: ApiNotification[]): Activity[] => {
      return notifications.map((notification) => {
        const created = new Date(notification.createdAt);
        return {
          id: `notification-${notification._id}`,
          type: notificationToType(notification.type),
          title: notification.title,
          description: notification.message,
          status: notification.isRead || notification.read ? "Read" : "New",
          date: created,
          time: created.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
      });
    };

    const loadActivities = async () => {
      try {
        const [bookingsRes, notificationsRes] = await Promise.all([
          bookingService.getMyBookings({ page: 1, limit: 30, sortBy: "updatedAt", sortOrder: "desc" }),
          notificationService.getNotifications({ page: 1, limit: 30 }),
        ]);

        const bookingActivities = mapBookings(bookingsRes.data?.bookings || []);
        const notificationActivities = mapNotifications(notificationsRes.data?.notifications || []);
        const combined = [...bookingActivities, ...notificationActivities].sort((a, b) => b.date.getTime() - a.date.getTime());

        if (isActive) {
          setAllActivities(combined.length > 0 ? combined : generateSampleActivities());
        }
      } catch {
        if (isActive) {
          setAllActivities(generateSampleActivities());
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    loadActivities();

    return () => {
      isActive = false;
    };
  }, []);

  // Filter
  const filteredActivities = useMemo(() => {
    let items = [...allActivities];
    if (startDate) {
      const s = new Date(startDate);
      items = items.filter((a) => a.date >= s);
    }
    if (endDate) {
      const e = new Date(endDate);
      e.setHours(23, 59, 59);
      items = items.filter((a) => a.date <= e);
    }
    if (contentFilter !== "all") {
      items = items.filter((a) => a.type === contentFilter);
    }
    return items;
  }, [allActivities, startDate, endDate, contentFilter]);

  // Group by date
  const grouped = useMemo(() => {
    const map = new Map<string, Activity[]>();
    filteredActivities.forEach((a) => {
      const key = new Date(a.date.getFullYear(), a.date.getMonth(), a.date.getDate()).toISOString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    });
    // Sort groups desc
    return Array.from(map.entries())
      .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
      .map(([dateKey, items]) => ({
        date: new Date(dateKey),
        label: formatGroupDate(new Date(dateKey)),
        items: items.sort((a, b) => b.date.getTime() - a.date.getTime()),
      }));
  }, [filteredActivities]);

  const resetFilters = () => {
    setStartDate("");
    setEndDate("");
    setContentFilter("all");
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">All Activity</h1>
        <p className="text-sm text-gray-500 mt-1">
          View and filter your care activities, bookings, and transactions.
        </p>
      </div>

      {/* ──── Filter Bar ──── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
        <div className="flex flex-wrap items-end gap-4">
          {/* Start Date */}
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Start Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
              />
            </div>
          </div>

          {/* End Date */}
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              End Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
              />
            </div>
          </div>

          {/* Content Dropdown */}
          <div className="flex-1 min-w-[160px] relative">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Content
            </label>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 text-left flex items-center justify-between focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
            >
              <span>
                {ACTIVITY_CONTENT_OPTIONS.find((o) => o.value === contentFilter)?.label}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
            {dropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1">
                {ACTIVITY_CONTENT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setContentFilter(opt.value);
                      setDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                      contentFilter === opt.value
                        ? "text-indigo-600 font-medium bg-indigo-50/50"
                        : "text-gray-700"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {}}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <Search className="w-4 h-4" />
              Search
            </button>
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* ──── View Toggle + Summary ──── */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          Showing <span className="font-semibold text-gray-700">{filteredActivities.length}</span>{" "}
          activit{filteredActivities.length !== 1 ? "ies" : "y"}
        </p>
        {isLoading && <p className="text-xs text-gray-400">Loading activity...</p>}

        <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setViewMode("simplified")}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${
              viewMode === "simplified"
                ? "bg-indigo-500 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            <ListIcon className="w-3.5 h-3.5" />
            Simplified
          </button>
          <button
            onClick={() => setViewMode("detailed")}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${
              viewMode === "detailed"
                ? "bg-indigo-500 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            <LayoutList className="w-3.5 h-3.5" />
            Detailed
          </button>
        </div>
      </div>

      {/* ──── Activities Grouped by Date ──── */}
      <div className="space-y-6">
        <AnimatePresence mode="wait">
          {grouped.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white rounded-2xl border border-gray-100 p-12 text-center"
            >
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-700">No Activities Found</h3>
              <p className="text-sm text-gray-400 mt-1">
                Try adjusting your filters to see more results.
              </p>
            </motion.div>
          ) : (
            grouped.map((group) => (
              <motion.div
                key={group.date.toISOString()}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2"
              >
                {/* Date Header */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="inline-flex items-center px-3.5 py-1.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-full">
                    {group.label}
                  </span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>

                {/* Activity Cards */}
                <div className="space-y-2">
                  {group.items.map((activity) => {
                    const badge = TYPE_BADGE[activity.type];
                    return (
                      <div
                        key={activity.id}
                        className="bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm p-4 transition-all"
                      >
                        <div className="flex items-start gap-3">
                          {/* Type badge */}
                          <span
                            className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-lg shrink-0 ${badge.bg} ${badge.text}`}
                          >
                            {badge.label}
                          </span>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h4 className="text-sm font-semibold text-gray-800">
                                  {activity.title}
                                </h4>
                                {viewMode === "detailed" && activity.description && (
                                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                    {activity.description}
                                  </p>
                                )}
                              </div>

                              <span
                                className={`text-xs font-medium shrink-0 ${statusColor(
                                  activity.status
                                )}`}
                              >
                                {activity.status}
                              </span>
                            </div>

                            {/* Footer info */}
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                              {activity.time && <span>{activity.time}</span>}
                              {activity.caregiverName && (
                                <span className="flex items-center gap-1">
                                  <span className="w-4 h-4 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-[9px] font-bold">
                                    {activity.caregiverName.charAt(0)}
                                  </span>
                                  {activity.caregiverName}
                                </span>
                              )}
                              {activity.amount && (
                                <span className="font-medium text-gray-600">
                                  {activity.amount}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
