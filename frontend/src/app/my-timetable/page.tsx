"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  Calendar, 
  Clock, 
  Info, 
  ArrowRight, 
  Heart,
  CalendarDays
} from "lucide-react";
import { Navbar, Footer } from "@/components";
import {
  bookingService,
  notificationService,
  type Booking,
  type Notification,
  type BookingStatus,
} from "@/services";
import { useAuthContext } from "@/context/AuthContext";
import {
  CareCalendar,
  type CareEvent,
  ActivityTimeline,
  type Activity as TimelineActivity,
  type ActivityType as TimelineActivityType,
} from "@/components/ui";

type TimetableRole = "careseeker" | "caregiver";

const PENDING_BOOKING_STATUSES = new Set<BookingStatus>([
  "reserved",
  "pending",
  "accepted",
  "agreement_pending",
  "payment_pending",
]);

const CANCELLED_BOOKING_STATUSES = new Set<BookingStatus>([
  "cancelled",
  "rejected",
  "expired",
]);

const ACTIVE_BOOKING_STATUSES = new Set<BookingStatus>(["active", "in_progress"]);

type CalendarEventStatus = NonNullable<CareEvent["status"]>;

function formatLabel(value: string | undefined): string {
  if (!value) return "Unknown";
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function parseDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeTime(value: string | undefined): string | undefined {
  if (!value) return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  if (/\b(am|pm)\b/i.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return trimmed;

  let hours = Number(match[1]);
  const minutes = match[2];
  if (Number.isNaN(hours)) return trimmed;

  const suffix = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${suffix}`;
}

function getUserIdFromRelation(value: Booking["caregiverId"] | Booking["careSeekerId"]): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  return value._id || value.id;
}

function getUserNameFromRelation(value: Booking["caregiverId"] | Booking["careSeekerId"]): string | undefined {
  if (!value || typeof value === "string") return undefined;
  return value.fullName;
}

function mapBookingToCalendarStatus(status: BookingStatus): CalendarEventStatus {
  if (status === "completed") return "completed";
  if (PENDING_BOOKING_STATUSES.has(status)) return "pending";
  if (CANCELLED_BOOKING_STATUSES.has(status) || status === "disputed") return "cancelled";
  return "confirmed";
}

function mapBookingToCalendarType(status: BookingStatus): CareEvent["type"] {
  if (ACTIVE_BOOKING_STATUSES.has(status) || status === "completed") {
    return "session";
  }

  if (CANCELLED_BOOKING_STATUSES.has(status) || status === "disputed") {
    return "appointment";
  }

  return "booking";
}

function mapBookingToTimelineStatusType(status: BookingStatus): TimelineActivityType {
  if (status === "completed") return "booking_completed";
  if (ACTIVE_BOOKING_STATUSES.has(status)) return "booking_started";
  if (status === "cancelled" || status === "rejected" || status === "expired") {
    return "booking_cancelled";
  }
  if (status === "disputed") return "notification";
  if (status === "confirmed") return "booking_confirmed";
  if (status === "payment_pending") return "payment_sent";
  return "booking_created";
}

function mapNotificationToTimelineType(type: Notification["type"]): TimelineActivityType | null {
  if (type.startsWith("booking") || type === "check_in" || type === "check_out") {
    return null;
  }

  if (type.includes("message")) return "message_received";
  if (type.includes("review")) return "review_received";
  if (type.includes("payment")) return "payment_received";
  if (type.includes("document")) return "document_verified";
  if (type.includes("profile") || type.startsWith("account_")) return "profile_updated";
  return "system";
}

function toDateTimeString(date: Date): string {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function mapBookingToCareEvent(booking: Booking, role: TimetableRole): CareEvent | null {
  const date = parseDate(booking.schedule?.startDate);
  if (!date) return null;

  const startTime = normalizeTime(booking.schedule?.startTime);
  const endTime = normalizeTime(booking.schedule?.endTime);

  const counterpartName =
    role === "caregiver"
      ? getUserNameFromRelation(booking.careSeekerId)
      : getUserNameFromRelation(booking.caregiverId);

  const counterpartId =
    role === "caregiver"
      ? getUserIdFromRelation(booking.careSeekerId)
      : getUserIdFromRelation(booking.caregiverId);

  const location = [
    booking.location?.address,
    booking.location?.city,
    booking.location?.state,
  ]
    .filter(Boolean)
    .join(", ");

  return {
    id: booking._id,
    title: `${formatLabel(booking.serviceType)} (${formatLabel(booking.status)})`,
    description:
      booking.notes ||
      booking.careInstructions ||
      booking.careRecipient?.notes ||
      `Booking ${booking.bookingNumber || booking._id}`,
    date,
    ...(startTime ? { startTime } : {}),
    ...(endTime ? { endTime } : {}),
    type: mapBookingToCalendarType(booking.status),
    status: mapBookingToCalendarStatus(booking.status),
    ...(counterpartName ? { caregiverName: counterpartName } : {}),
    ...(counterpartId ? { caregiverId: counterpartId } : {}),
    serviceType: formatLabel(booking.serviceType),
    ...(location ? { location } : {}),
  };
}

function mapBookingToTimelineActivities(
  booking: Booking,
  role: TimetableRole,
): TimelineActivity[] {
  const serviceLabel = formatLabel(booking.serviceType);
  const bookingLabel = booking.bookingNumber ? `#${booking.bookingNumber}` : booking._id;
  const counterpartName =
    role === "caregiver"
      ? getUserNameFromRelation(booking.careSeekerId)
      : getUserNameFromRelation(booking.caregiverId);

  const amount = Number(
    booking.payment?.amountPaid ?? booking.amountPaid ?? booking.pricing?.total ?? booking.totalAmount ?? 0,
  );

  const createdAt = parseDate(booking.createdAt);
  const updatedAt = parseDate(booking.updatedAt);
  const statusDate =
    parseDate(booking.cancellation?.cancelledAt) ||
    parseDate((booking as Booking & { completedAt?: string }).completedAt) ||
    parseDate((booking as Booking & { startedAt?: string }).startedAt) ||
    parseDate((booking as Booking & { confirmedAt?: string }).confirmedAt) ||
    updatedAt;

  const baseMetadata = {
    bookingId: booking._id,
    serviceType: serviceLabel,
    ...(counterpartName ? { caregiverName: counterpartName } : {}),
  };

  const activities: TimelineActivity[] = [];

  if (createdAt) {
    activities.push({
      id: `${booking._id}-created`,
      type: "booking_created",
      title: "Booking Created",
      description: `${serviceLabel} booking ${bookingLabel} was created on ${toDateTimeString(createdAt)}.`,
      timestamp: createdAt,
      metadata: baseMetadata,
      isRead: true,
    });
  }

  const statusType = mapBookingToTimelineStatusType(booking.status);
  if (statusDate && (!createdAt || statusDate.getTime() !== createdAt.getTime())) {
    activities.push({
      id: `${booking._id}-status-${booking.status}`,
      type: statusType,
      title: `Booking ${formatLabel(booking.status)}`,
      description: `${serviceLabel} booking ${bookingLabel} is currently ${formatLabel(booking.status)}.`,
      timestamp: statusDate,
      metadata: baseMetadata,
      isRead: true,
    });
  }

  const paymentDate =
    parseDate(booking.payment?.paidAt) ||
    parseDate((booking as Booking & { lastPaymentDate?: string }).lastPaymentDate);

  if (amount > 0 && paymentDate) {
    activities.push({
      id: `${booking._id}-payment`,
      type: role === "caregiver" ? "payment_received" : "payment_sent",
      title: role === "caregiver" ? "Payment Received" : "Payment Sent",
      description: `Payment activity recorded for ${serviceLabel} booking ${bookingLabel}.`,
      timestamp: paymentDate,
      metadata: {
        ...baseMetadata,
        amount,
      },
      isRead: true,
    });
  }

  return activities;
}

function mapNotificationToTimelineActivity(
  notification: Notification,
): TimelineActivity | null {
  const timestamp = parseDate(notification.createdAt);
  const type = mapNotificationToTimelineType(notification.type);

  if (!timestamp || !type) return null;

  return {
    id: `notification-${notification._id}`,
    type,
    title: notification.title,
    description: notification.message,
    timestamp,
    isRead: Boolean(notification.isRead || notification.read),
  };
}

// ============================================
// INFO TOOLTIP COMPONENT
// ============================================

function BookingInfoTooltip() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-linear-to-r from-blue-50 to-indigo-50 rounded-2xl p-5 border border-blue-100"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
          <Info className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h4 className="font-semibold text-gray-900 text-lg mb-2">How Care Scheduling Works</h4>
          <p className="text-sm text-gray-600 leading-relaxed">
            View and manage all your care-related events in one place. Click on any date to see details 
            or add new bookings. Sessions are confirmed only after caregiver and admin approval. 
            You&apos;ll receive notifications for any updates to your schedule.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// TRUST SIGNALS COMPONENT
// ============================================

function TimetableTrustSignals() {
  const signals = [
    {
      icon: "🛡️",
      title: "Verified Caregivers",
      description: "All caregivers are background-checked and verified",
    },
    {
      icon: "📱",
      title: "Real-time Updates",
      description: "Get instant notifications for schedule changes",
    },
    {
      icon: "💳",
      title: "Secure Payments",
      description: "Safe and encrypted payment processing",
    },
    {
      icon: "⭐",
      title: "Quality Assured",
      description: "Rated and reviewed by real families",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {signals.map((signal, index) => (
        <motion.div
          key={signal.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="bg-white rounded-xl p-4 border border-gray-100 hover:shadow-md transition-shadow"
        >
          <div className="text-2xl mb-2">{signal.icon}</div>
          <h4 className="font-semibold text-gray-900 text-sm mb-1">{signal.title}</h4>
          <p className="text-xs text-gray-500">{signal.description}</p>
        </motion.div>
      ))}
    </div>
  );
}

// ============================================
// QUICK STATS COMPONENT
// ============================================

function QuickStats({ events }: { events: CareEvent[] }) {
  const today = new Date();
  const thisMonth = events.filter(e => e.date.getMonth() === today.getMonth());
  const confirmed = events.filter(e => e.status === "confirmed");
  const pending = events.filter(e => e.status === "pending");
  const upcoming = events.filter(e => e.date >= today);

  const stats = [
    { label: "This Month", value: thisMonth.length, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Confirmed", value: confirmed.length, color: "text-green-600", bg: "bg-green-50" },
    { label: "Pending", value: pending.length, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Upcoming", value: upcoming.length, color: "text-purple-600", bg: "bg-purple-50" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <motion.div
          key={stat.label}
          whileHover={{ scale: 1.02 }}
          className={`${stat.bg} rounded-xl p-4 border border-gray-100`}
        >
          <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
          <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
        </motion.div>
      ))}
    </div>
  );
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export default function MyTimetablePage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuthContext();
  const [events, setEvents] = useState<CareEvent[]>([]);
  const [activities, setActivities] = useState<TimelineActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"calendar" | "activity">("calendar");

  const fetchAllBookings = useCallback(async (): Promise<Booking[]> => {
    const collected: Booking[] = [];
    let page = 1;
    let pages = 1;

    while (page <= pages && page <= 10) {
      const response = await bookingService.getMyBookings({
        page,
        limit: 50,
        sortBy: "updatedAt",
        sortOrder: "desc",
      });

      if (!response.success || !response.data) {
        break;
      }

      collected.push(...response.data.bookings);
      pages = response.data.pagination.pages || 1;
      page += 1;
    }

    const deduped = new Map<string, Booking>();
    for (const booking of collected) {
      deduped.set(booking._id, booking);
    }

    return Array.from(deduped.values());
  }, []);

  const loadTimetableData = useCallback(
    async (role: TimetableRole) => {
      setIsLoading(true);
      setError(null);

      try {
        const [bookings, notificationsResponse] = await Promise.all([
          fetchAllBookings(),
          notificationService.getNotifications({ page: 1, limit: 100 }),
        ]);

        const mappedEvents = bookings
          .map((booking) => mapBookingToCareEvent(booking, role))
          .filter((event): event is CareEvent => Boolean(event))
          .sort((a, b) => b.date.getTime() - a.date.getTime());

        const bookingActivities = bookings.flatMap((booking) =>
          mapBookingToTimelineActivities(booking, role),
        );

        const notificationActivities =
          notificationsResponse.success && notificationsResponse.data
            ? notificationsResponse.data.notifications
                .map((notification) =>
                  mapNotificationToTimelineActivity(notification),
                )
                .filter((activity): activity is TimelineActivity => Boolean(activity))
            : [];

        const mergedActivities = [...bookingActivities, ...notificationActivities].sort(
          (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
        );

        setEvents(mappedEvents);
        setActivities(mergedActivities);
      } catch (fetchError) {
        console.error("Failed to load timetable data:", fetchError);
        setEvents([]);
        setActivities([]);
        setError("Failed to load your timetable. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [fetchAllBookings],
  );

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!user) {
      router.replace("/login?redirect=/my-timetable");
      return;
    }

    if (user.role === "admin") {
      router.replace("/admin");
      return;
    }

    const role: TimetableRole = user.role === "caregiver" ? "caregiver" : "careseeker";
    void loadTimetableData(role);
  }, [isAuthLoading, loadTimetableData, router, user]);

  const handleRetry = useCallback(() => {
    if (!user || user.role === "admin") {
      return;
    }

    const role: TimetableRole = user.role === "caregiver" ? "caregiver" : "careseeker";
    void loadTimetableData(role);
  }, [loadTimetableData, user]);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-gray-50 to-white">
      {/* Navbar */}
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary-500/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
          <motion.div
            className="text-center max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Badge */}
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500/10 text-primary-500 rounded-full text-sm font-medium mb-6"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <CalendarDays className="w-4 h-4" />
              <span>Care Management</span>
            </motion.div>

            {/* Title */}
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
              My{" "}
              <span className="bg-linear-to-r from-primary-500 to-secondary-500 bg-clip-text text-transparent">
                Care Schedule
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl text-gray-600 mb-8">
              Manage your care appointments, sessions, and bookings all in one place.
              Stay organized and never miss an important event.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {/* Quick Stats */}
          {!isLoading && (
            <motion.div variants={itemVariants}>
              <QuickStats events={events} />
            </motion.div>
          )}

          {/* Tab Navigation */}
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setActiveTab("calendar")}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  activeTab === "calendar"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Calendar className="w-4 h-4" />
                Calendar View
              </button>
              <button
                onClick={() => setActiveTab("activity")}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  activeTab === "activity"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Clock className="w-4 h-4" />
                Activity Timeline
              </button>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              <span>All times shown in your local timezone</span>
            </div>
          </motion.div>

          {/* Loading State */}
          {isLoading ? (
            <motion.div
              variants={itemVariants}
              className="bg-white rounded-2xl shadow-lg p-12 text-center"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-500/10 mb-4">
                <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="text-gray-600">Loading your schedule...</p>
            </motion.div>
          ) : (
            <>
              {error && (
                <motion.div
                  variants={itemVariants}
                  className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <span>{error}</span>
                  <button
                    onClick={handleRetry}
                    className="px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-sm font-medium transition-colors"
                  >
                    Retry
                  </button>
                </motion.div>
              )}

              {/* Calendar or Activity View */}
              <motion.div variants={itemVariants}>
                {activeTab === "calendar" ? (
                  <CareCalendar
                    events={events}
                    onEventClick={(event) => {
                      router.push(`/dashboard/bookings/${event.id}`);
                    }}
                    onDateClick={(date) => {
                      console.log("Date clicked:", date);
                    }}
                    onAddEvent={() =>
                      router.push(
                        user?.role === "caregiver"
                          ? "/dashboard/caregiver/availability"
                          : "/caregivers",
                      )
                    }
                  />
                ) : (
                  <ActivityTimeline
                    activities={activities}
                    title="Care Activity History"
                    subtitle="Track all your care-related activities"
                    showFilters={true}
                    showDateFilters={true}
                    showSearch={true}
                  />
                )}
              </motion.div>

              {/* Info & Trust Signals */}
              <motion.div variants={itemVariants} className="space-y-6">
                <BookingInfoTooltip />
                <TimetableTrustSignals />
              </motion.div>

              {/* Quick Actions CTA */}
              <motion.div
                variants={itemVariants}
                className="bg-linear-to-r from-primary-500 to-secondary-500 rounded-2xl p-8 text-white"
              >
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                      <Heart className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-1">Need to schedule care?</h3>
                      <p className="text-white/80">
                        Browse our verified caregivers and book a session that fits your schedule.
                      </p>
                    </div>
                  </div>
                  <motion.button
                    onClick={() => router.push("/caregivers")}
                    className="px-6 py-3 bg-white text-primary-500 font-semibold rounded-xl inline-flex items-center gap-2 hover:bg-white/90 transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Browse Caregivers
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                </div>
              </motion.div>
            </>
          )}
        </motion.div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
