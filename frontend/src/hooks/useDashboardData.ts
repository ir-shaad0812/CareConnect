import { useQuery } from "@tanstack/react-query";
import dashboardService from "@/services/api/dashboard.service";
import {
  bookingService,
  type Booking,
  type BookingTrackingResponse,
} from "@/modules/booking/services";
import { userService } from "@/modules/user/services";
import noticeService from "@/services/api/notice.service";
import noteService from "@/services/api/note.service";

const toDateOnly = (value: string | Date): Date => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const isDateWithinSchedule = (date: Date, startDate: string, endDate?: string): boolean => {
  const check = toDateOnly(date);
  const start = toDateOnly(startDate);
  const end = toDateOnly(endDate ?? startDate);
  return check >= start && check <= end;
};

const toDateKey = (value: Date): string => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export interface CaregiverActionItem {
  id: string;
  bookingId: string;
  bookingNumber?: string;
  title: string;
  subtitle: string;
  type:
    | "pending_approval"
    | "checkin"
    | "checkout"
    | "submit_log"
    | "dispute"
    | "agreement"
    | "late_log";
  severity: "normal" | "warning" | "critical";
}

export interface CaregiverActionCenterData {
  metrics: {
    activeBookings: number;
    pendingApprovals: number;
    todaySchedule: number;
    alerts: number;
  };
  todayTasks: CaregiverActionItem[];
  pendingActions: CaregiverActionItem[];
  bookings: Booking[];
}

// ─── Caregiver Dashboard Hooks ──────────────────────────────────────────────

export function useCaregiverProfile() {
  return useQuery({
    queryKey: ["caregiver", "profile"],
    queryFn: async () => {
      const res = await userService.getProfile();
      if (!res.success || !res.data) throw new Error("Failed to fetch profile");
      return res.data.user;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCaregiverDashboardStats() {
  return useQuery({
    queryKey: ["caregiver", "dashboardStats"],
    queryFn: async () => {
      const res = await userService.getCaregiverDashboard();
      if (!res.success || !res.data) throw new Error("Failed to fetch stats");
      const payload = res.data as {
        stats?: Record<string, unknown>;
      };
      return payload.stats ?? res.data;
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useCaregiverEarnings() {
  return useQuery({
    queryKey: ["caregiver", "earnings"],
    queryFn: async () => {
      const res = await dashboardService.getCaregiverEarnings();
      return res.success && Array.isArray(res.data?.earnings)
        ? res.data.earnings
        : [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCaregiverBookingsByType() {
  return useQuery({
    queryKey: ["caregiver", "bookingsByType"],
    queryFn: async () => {
      const res = await dashboardService.getCaregiverBookingsByType();
      return res.success && Array.isArray(res.data?.distribution)
        ? res.data.distribution
        : [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCaregiverWeeklyActivity() {
  return useQuery({
    queryKey: ["caregiver", "weeklyActivity"],
    queryFn: async () => {
      const res = await dashboardService.getCaregiverWeeklyActivity();
      return res.success && Array.isArray(res.data?.activity)
        ? res.data.activity
        : [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCaregiverRecentActivity(limit = 8) {
  return useQuery({
    queryKey: ["caregiver", "recentActivity", limit],
    queryFn: async () => {
      const res = await dashboardService.getCaregiverRecentActivity(limit);
      return res.success && Array.isArray(res.data?.activities)
        ? res.data.activities
        : [];
    },
    staleTime: 60 * 1000,
  });
}

export function useCaregiverConversations(limit = 6) {
  return useQuery({
    queryKey: ["caregiver", "conversations", limit],
    queryFn: async () => {
      const res = await dashboardService.getCaregiverConversations(limit);
      return res.success && Array.isArray(res.data?.conversations)
        ? res.data.conversations
        : [];
    },
    staleTime: 30 * 1000,
  });
}

export function useCaregiverAvailableJobs(limit = 4) {
  return useQuery({
    queryKey: ["caregiver", "availableJobs", limit],
    queryFn: async () => {
      const res = await dashboardService.getCaregiverAvailableJobs(limit);
      return res.success && Array.isArray(res.data?.jobs) ? res.data.jobs : [];
    },
    staleTime: 60 * 1000,
  });
}

export function useCaregiverTracking(bookingId: string | null, enabled = true) {
  return useQuery({
    queryKey: ["caregiver", "tracking", bookingId],
    queryFn: async () => {
      if (!bookingId) throw new Error("Booking ID is required");
      const response = await bookingService.getTrackingLogs(bookingId);
      if (!response.success || !response.data) {
        throw new Error("Failed to load tracking logs");
      }
      return response.data;
    },
    enabled: enabled && Boolean(bookingId),
    staleTime: 30 * 1000,
  });
}

export function useCaregiverActionCenter(enabled = true) {
  return useQuery({
    queryKey: ["caregiver", "actionCenter"],
    queryFn: async (): Promise<CaregiverActionCenterData> => {
      const bookingsResponse = await bookingService.getMyBookings({ limit: 120 });
      const bookings = bookingsResponse.success && Array.isArray(bookingsResponse.data?.bookings)
        ? bookingsResponse.data.bookings
        : [];

      const today = new Date();
      const todayKey = toDateKey(toDateOnly(today));

      const activeBookings = bookings.filter((booking) => booking.status === "in_progress");
      const pendingApprovals = bookings.filter((booking) => booking.status === "pending");
      const todaySchedule = bookings.filter((booking) =>
        ["confirmed", "in_progress"].includes(booking.status) &&
        Boolean(booking.schedule?.startDate) &&
        isDateWithinSchedule(
          today,
          booking.schedule.startDate,
          booking.schedule.endDate
        )
      );

      const trackingCandidates = bookings
        .filter((booking) => ["confirmed", "in_progress", "completed", "disputed"].includes(booking.status))
        .slice(0, 20);

      const trackingSnapshots = await Promise.all(
        trackingCandidates.map(async (booking) => {
          try {
            const trackingResponse = await bookingService.getTrackingLogs(booking._id);
            if (trackingResponse.success && trackingResponse.data) {
              return {
                bookingId: booking._id,
                data: trackingResponse.data as BookingTrackingResponse,
              };
            }
          } catch {
            // Ignore per-booking tracking errors and continue with other cards.
          }
          return null;
        })
      );

      const trackingByBooking = new Map<string, BookingTrackingResponse>();
      for (const snapshot of trackingSnapshots) {
        if (snapshot) {
          trackingByBooking.set(snapshot.bookingId, snapshot.data);
        }
      }

      const todayTasks: CaregiverActionItem[] = [];
      const pendingActions: CaregiverActionItem[] = [];

      for (const booking of bookings) {
        const tracking = trackingByBooking.get(booking._id);
        const todaysLog = tracking?.trackingLogs.find((log) => log.dateKey === todayKey);

        if (booking.status === "pending") {
          pendingActions.push({
            id: `${booking._id}-pending-approval`,
            bookingId: booking._id,
            ...(booking.bookingNumber
              ? { bookingNumber: booking.bookingNumber }
              : {}),
            title: "Respond to booking request",
            subtitle: `Booking ${booking.bookingNumber || booking._id}`,
            type: "pending_approval",
            severity: "warning",
          });
        }

        if (booking.status === "confirmed" && tracking?.agreement.accepted === false) {
          pendingActions.push({
            id: `${booking._id}-agreement`,
            bookingId: booking._id,
            ...(booking.bookingNumber
              ? { bookingNumber: booking.bookingNumber }
              : {}),
            title: "Agreement pending acceptance",
            subtitle: "Tracking stays locked until agreement is accepted",
            type: "agreement",
            severity: "critical",
          });
        }

        if (booking.status === "in_progress") {
          if (!todaysLog?.checkInTime) {
            todayTasks.push({
              id: `${booking._id}-checkin`,
              bookingId: booking._id,
              ...(booking.bookingNumber
                ? { bookingNumber: booking.bookingNumber }
                : {}),
              title: "Check in now",
              subtitle: "Daily attendance is required",
              type: "checkin",
              severity: "warning",
            });
          }

          if (todaysLog?.checkInTime && !todaysLog.submittedAt) {
            todayTasks.push({
              id: `${booking._id}-submit`,
              bookingId: booking._id,
              ...(booking.bookingNumber
                ? { bookingNumber: booking.bookingNumber }
                : {}),
              title: "Submit today report",
              subtitle: "Add tasks and proof of work",
              type: "submit_log",
              severity: "normal",
            });
          }
        }

        if (tracking?.summary.missed && tracking.summary.missed > 0) {
          pendingActions.push({
            id: `${booking._id}-late`,
            bookingId: booking._id,
            ...(booking.bookingNumber
              ? { bookingNumber: booking.bookingNumber }
              : {}),
            title: "Missed tracking days",
            subtitle: `${tracking.summary.missed} day(s) auto-flagged`,
            type: "late_log",
            severity: "critical",
          });
        }

        if (booking.status === "disputed") {
          pendingActions.push({
            id: `${booking._id}-dispute`,
            bookingId: booking._id,
            ...(booking.bookingNumber
              ? { bookingNumber: booking.bookingNumber }
              : {}),
            title: "Dispute in progress",
            subtitle: "Respond with supporting details",
            type: "dispute",
            severity: "critical",
          });
        }
      }

      return {
        metrics: {
          activeBookings: activeBookings.length,
          pendingApprovals: pendingApprovals.length,
          todaySchedule: todaySchedule.length,
          alerts: pendingActions.filter((item) => item.severity !== "normal").length,
        },
        todayTasks,
        pendingActions,
        bookings,
      };
    },
    enabled,
    staleTime: 30 * 1000,
  });
}

// ─── Careseeker Dashboard Hooks ─────────────────────────────────────────────

export function useCareseekerBookings(limit = 20, enabled = true) {
  return useQuery({
    queryKey: ["careseeker", "bookings", limit],
    queryFn: async () => {
      const res = await bookingService.getMyBookings({ limit });
      return res.success && res.data?.bookings ? res.data.bookings : [];
    },
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCareseekerStats(enabled = true) {
  return useQuery({
    queryKey: ["careseeker", "bookingStats"],
    queryFn: async () => {
      const res = await bookingService.getMyStats();
      if (!res.success || !res.data) throw new Error("Failed to fetch stats");
      return res.data;
    },
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCareseekerSpending(enabled = true, timeRange?: string) {
  return useQuery({
    queryKey: ["careseeker", "spending", timeRange],
    queryFn: async () => {
      const res = await dashboardService.getCareseekerSpending(timeRange);
      return res.success && Array.isArray(res.data?.spending)
        ? res.data.spending
        : [];
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCareseekerServiceDistribution(enabled = true) {
  return useQuery({
    queryKey: ["careseeker", "serviceDistribution"],
    queryFn: async () => {
      const res = await dashboardService.getCareseekerServiceDistribution();
      return res.success && Array.isArray(res.data?.distribution)
        ? res.data.distribution
        : [];
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCareseekerRecentActivity(limit = 8, enabled = true) {
  return useQuery({
    queryKey: ["careseeker", "recentActivity", limit],
    queryFn: async () => {
      const res = await dashboardService.getCareseekerRecentActivity(limit);
      return res.success && Array.isArray(res.data?.activities)
        ? res.data.activities
        : [];
    },
    enabled,
    staleTime: 60 * 1000,
  });
}

// ─── Shared Hooks ───────────────────────────────────────────────────────────

export function useRecentNotices(limit = 3, enabled = true) {
  return useQuery({
    queryKey: ["notices", "recent", limit],
    queryFn: async () => {
      const res = await noticeService.getNotices({ page: 1, limit });
      return res.success && Array.isArray(res.data?.notices)
        ? res.data.notices
        : [];
    },
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}

export function useRecentNotes(
  limit = 3,
  visibility = "private",
  enabled = true,
) {
  return useQuery({
    queryKey: ["notes", "recent", limit, visibility],
    queryFn: async () => {
      const res = await noteService.getNotes({ page: 1, limit, visibility });
      return res.success && Array.isArray(res.data?.notes) ? res.data.notes : [];
    },
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}
