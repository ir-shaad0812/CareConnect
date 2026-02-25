// ============================================
// USE SLOTS — CareConnect
// Fetch caregiver availability and booked slots
// via React Query with smart caching + enabled guards.
//
// Two hooks are exported:
//   • useCaregiverSlots  – available days for a caregiver in a given month
//   • useBookedSlots     – time slots already taken for a specific date
// ============================================

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/api/client";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

/** A single day the caregiver has marked as available (ISO YYYY-MM-DD) */
export interface CaregiverAvailabilityDay {
  date: string;
  slotsCount?: number;
}

/** Shape returned by GET /slots/caregiver/:id?month=YYYY-MM */
export interface CaregiverSlotsResponse {
  caregiverId: string;
  month: string;
  availableDays: string[]; // ISO YYYY-MM-DD strings
  availability?: CaregiverAvailabilityDay[];
}

/** A single booked time slot */
export interface BookedSlot {
  date: string; // YYYY-MM-DD
  time: string; // e.g. "10:00 AM"
  bookingId?: string;
}

/** Shape returned by GET /bookings/slots/taken */
export interface BookedSlotsResponse {
  caregiverId: string;
  date: string;
  bookedSlots: BookedSlot[];
}

// ─────────────────────────────────────────────
// QUERY KEYS
// Factory pattern keeps keys consistent and
// easy to invalidate from anywhere in the app.
// ─────────────────────────────────────────────

export const slotKeys = {
  all: ["slots"] as const,
  caregiver: (caregiverId: string, month: string) =>
    ["slots", "caregiver", caregiverId, month] as const,
  booked: (caregiverId: string, date: string) =>
    ["booked-slots", caregiverId, date] as const,
} as const;

// ─────────────────────────────────────────────
// HOOK: useCaregiverSlots
// Fetches the days a caregiver is available in a
// given calendar month.
//
// @param caregiverId  – caregiver's user ID
// @param month        – "YYYY-MM" (e.g. "2025-07")
// ─────────────────────────────────────────────

export function useCaregiverSlots(
  caregiverId: string | undefined,
  month: string,
) {
  return useQuery<CaregiverSlotsResponse, Error>({
    queryKey: slotKeys.caregiver(caregiverId ?? "", month),

    queryFn: async () => {
      const res = await apiClient.get<CaregiverSlotsResponse>(
        `/slots/caregiver/${caregiverId}`,
        { params: { month } },
      );

      // apiClient wraps the response in { success, data, message }
      // — unwrap the inner data payload.
      const payload =
        (res as unknown as { data?: CaregiverSlotsResponse }).data ??
        (res as unknown as CaregiverSlotsResponse);

      return payload;
    },

    // Only run when we have a caregiverId and a valid month string
    enabled: Boolean(caregiverId) && /^\d{4}-\d{2}$/.test(month),

    // Available days are unlikely to change mid-session — 5 min cache
    staleTime: 5 * 60 * 1000,

    // Keep previous month's data visible while fetching next month
    placeholderData: (previousData) => previousData,
  });
}

// ─────────────────────────────────────────────
// HOOK: useBookedSlots
// Fetches the time slots already taken for a
// specific caregiver on a specific date.
//
// @param caregiverId  – caregiver's user ID
// @param date         – ISO date string "YYYY-MM-DD"
// ─────────────────────────────────────────────

export function useBookedSlots(
  caregiverId: string | undefined,
  date: string | undefined,
) {
  return useQuery<BookedSlotsResponse, Error>({
    queryKey: slotKeys.booked(caregiverId ?? "", date ?? ""),

    queryFn: async () => {
      const res = await apiClient.get<BookedSlotsResponse>(
        `/bookings/slots/taken`,
        { params: { caregiverId, date } },
      );

      const payload =
        (res as unknown as { data?: BookedSlotsResponse }).data ??
        (res as unknown as BookedSlotsResponse);

      return payload;
    },

    // Only run when both caregiverId and date are present
    enabled: Boolean(caregiverId) && Boolean(date),

    // Booked slots can change more frequently — 2 min cache
    staleTime: 2 * 60 * 1000,

    // Keep showing previous date's data while fetching the new date
    placeholderData: (previousData) => previousData,
  });
}
