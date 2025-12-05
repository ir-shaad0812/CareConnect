// ============================================
// SLOT API SERVICE — Sprint C & E
// ============================================

import { apiClient } from "./client";
import type { ApiResponse } from "@/types";
import type { BookingSlot } from "./booking.service";

class SlotService {
  async respondAvailability(
    slotId: string,
    answer: "yes" | "no",
    reason?: string
  ): Promise<ApiResponse<{ slot: BookingSlot; refund?: unknown }>> {
    return apiClient.post(`/slots/${slotId}/confirm`, { answer, reason });
  }

  async issueCheckInOtp(
    slotId: string
  ): Promise<ApiResponse<{ otp: string; expiresAt: string }>> {
    return apiClient.post(`/slots/${slotId}/issue-otp`);
  }

  async checkIn(
    slotId: string,
    otp: string,
    gps?: { lat: number; lng: number }
  ): Promise<ApiResponse<{ slot: BookingSlot }>> {
    return apiClient.post(`/slots/${slotId}/check-in`, { otp, gps });
  }

  async checkOut(
    slotId: string,
    gps?: { lat: number; lng: number }
  ): Promise<ApiResponse<{ slot: BookingSlot }>> {
    return apiClient.post(`/slots/${slotId}/check-out`, { gps });
  }
}

export const slotService = new SlotService();
