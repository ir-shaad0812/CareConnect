// ============================================
// AVAILABILITY SERVICE
// Frontend API client for availability management
// ============================================

import { apiClient } from "./client";
import type { ApiResponse } from "@/types";

// ============================================
// TYPES
// ============================================

export interface WeeklySchedule {
  days: string[];
  hours: {
    start: string;
    end: string;
  };
  immediateAvailability?: boolean;
  availableFrom?: string;
}

export interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
  status?: "available" | "booked" | "reserved" | "blocked";
  bookingNumber?: string | null;
}

export interface BookingSlot {
  bookingNumber: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  status: string;
}

export interface DayAvailability {
  date: string;
  dayOfWeek: string;
  isWorkday: boolean;
  isBlocked: boolean;
  isAvailable: boolean;
  workingHours: { start: string; end: string } | null;
  bookings: {
    bookingNumber: string;
    startTime: string;
    endTime: string;
    status: string;
  }[];
  override?: {
    isAvailable: boolean;
    slots?: TimeSlot[];
  } | null;
}

export interface CaregiverAvailability {
  caregiverId: string;
  weeklySchedule: WeeklySchedule;
  blockedDates: string[];
  bookings: BookingSlot[];
  calendar: Record<string, DayAvailability>;
  lastUpdated: string;
}

export interface AvailabilityCheckResult {
  available: boolean;
  conflicts: {
    bookingNumber: string;
    status: string;
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
  }[];
  blockedDate: boolean;
  blockedDates?: string[];
  reason?: string;
}

// ============================================
// SERVICE CLASS
// ============================================

class AvailabilityService {
  /**
   * Get caregiver's availability for a date range (public)
   */
  async getCaregiverAvailability(
    caregiverId: string,
    startDate?: string,
    endDate?: string
  ): Promise<ApiResponse<{ availability: CaregiverAvailability }>> {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);

    const queryString = params.toString();
    const url = `/availability/caregivers/${caregiverId}${queryString ? `?${queryString}` : ""}`;

    return apiClient.get(url);
  }

  /**
   * Get available time slots for a specific date (public)
   */
  async getAvailableSlots(
    caregiverId: string,
    date: string,
    duration?: number
  ): Promise<ApiResponse<{ slots: TimeSlot[]; date: string }>> {
    const params = new URLSearchParams({ date });
    if (duration) params.append("duration", String(duration));

    return apiClient.get(
      `/availability/caregivers/${caregiverId}/slots?${params.toString()}`
    );
  }

  /**
   * Get own availability (caregiver only)
   */
  async getMyAvailability(): Promise<
    ApiResponse<{ availability: CaregiverAvailability }>
  > {
    return apiClient.get("/availability/me");
  }

  /**
   * Get own calendar for a month (caregiver only)
   */
  async getMyCalendar(
    year?: number,
    month?: number
  ): Promise<ApiResponse<{ calendar: CaregiverAvailability }>> {
    const params = new URLSearchParams();
    if (year) params.append("year", String(year));
    if (month) params.append("month", String(month));

    const queryString = params.toString();
    return apiClient.get(`/availability/me/calendar${queryString ? `?${queryString}` : ""}`);
  }

  /**
   * Update weekly schedule (caregiver only)
   */
  async updateWeeklySchedule(
    days: string[],
    hours: { start: string; end: string }
  ): Promise<ApiResponse<{ availability: WeeklySchedule }>> {
    return apiClient.put("/availability/me/weekly-schedule", { days, hours });
  }

  /**
   * Update all blocked dates (caregiver only)
   */
  async updateBlockedDates(
    blockedDates: string[]
  ): Promise<ApiResponse<{ blockedDates: string[] }>> {
    return apiClient.put("/availability/me/blocked-dates", { blockedDates });
  }

  /**
   * Add a single blocked date (caregiver only)
   */
  async addBlockedDate(
    date: string
  ): Promise<ApiResponse<{ blockedDates: string[] }>> {
    return apiClient.post("/availability/me/blocked-dates", { date });
  }

  /**
   * Remove a blocked date (caregiver only)
   */
  async removeBlockedDate(
    date: string
  ): Promise<ApiResponse<{ blockedDates: string[] }>> {
    return apiClient.delete(`/availability/me/blocked-dates/${date}`);
  }

  /**
   * Check availability for a time slot before booking
   */
  async checkAvailability(
    caregiverId: string,
    schedule: {
      startDate: string;
      endDate: string;
      startTime: string;
      endTime: string;
    }
  ): Promise<ApiResponse<AvailabilityCheckResult>> {
    return apiClient.post("/bookings/check-availability", {
      caregiverId,
      schedule,
    });
  }
}

// Export singleton instance
export const availabilityService = new AvailabilityService();
export default availabilityService;
