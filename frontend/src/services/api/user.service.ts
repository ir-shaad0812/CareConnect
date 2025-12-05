// ============================================
// USER API SERVICE
// User profile and account management API calls
// ============================================

import { apiClient } from "./client";
import { API_CONFIG, AUTH_CONFIG } from "@/lib/constants";
import type { ApiResponse, User } from "@/types";
import type { ProfileUpdateData } from "@/modules/user/types";

export type CompleteProfileData = ProfileUpdateData;

export interface AvailabilityData {
  days?: string[];
  hours?: {
    start?: string;
    end?: string;
  };
}

export interface RatesData {
  hourlyRate?: number;
  dailyRate?: number;
  weeklyRate?: number;
  monthlyRate?: number;
}

async function fetchWithAuth(path: string, init: RequestInit) {
  const accessToken =
    typeof window !== "undefined"
      ? localStorage.getItem(AUTH_CONFIG.TOKEN_KEY)
      : null;

  const headers = new Headers(init.headers ?? undefined);

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  return fetch(`${API_CONFIG.BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
}

async function parseJsonResponse(response: Response): Promise<Record<string, unknown>> {
  try {
    const text = await response.text();
    return text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function getNetworkErrorMessage(): string {
  return "Unable to connect to the server. Please verify the backend service is running and try again.";
}

export const userService = {
  getProfile(): Promise<ApiResponse<{ user: User }>> {
    return apiClient.get<{ user: User }>("/users/profile");
  },

  updateProfile(data: ProfileUpdateData): Promise<ApiResponse<{ user: User }>> {
    return apiClient.patch<{ user: User }>("/users/profile", data);
  },

  completeProfile(data: CompleteProfileData): Promise<ApiResponse<{ user: User }>> {
    return apiClient.post<{ user: User }>("/users/complete-profile", data);
  },

  deleteAccount(): Promise<ApiResponse<{ message: string }>> {
    return apiClient.delete<{ message: string }>("/users/account");
  },

  updateAvailability(availability: AvailabilityData): Promise<ApiResponse<{ user: User }>> {
    return apiClient.put<{ user: User }>("/users/caregiver/availability", availability);
  },

  updateRates(rates: RatesData): Promise<ApiResponse<{ user: User }>> {
    return apiClient.put<{ user: User }>("/users/caregiver/rates", rates);
  },

  getCaregiverDashboard(): Promise<
    ApiResponse<{
      stats: {
        profileViews: number;
        rating: number;
        totalReviews: number;
        completionPercentage: number;
        earnings: {
          total: number;
          pending: number;
          withdrawn: number;
        };
        ratingBreakdown: {
          punctuality: number;
          professionalism: number;
          communication: number;
          qualityOfCare: number;
          valueForMoney: number;
        };
        featured: boolean;
        backgroundCheck: {
          status: string;
        };
      };
    }>
  > {
    return apiClient.get("/users/caregiver/dashboard");
  },

  async uploadAvatar(file: File): Promise<ApiResponse<{ avatarUrl: string }>> {
    const formData = new FormData();
    formData.append("avatar", file);

    let response: Response;
    try {
      response = await fetchWithAuth("/users/avatar", {
        method: "POST",
        body: formData,
      });
    } catch {
      throw { message: getNetworkErrorMessage(), statusCode: 0 };
    }

    const result = await parseJsonResponse(response);
    if (!response.ok) {
      const message =
        typeof result.message === "string" && result.message.trim().length > 0
          ? result.message
          : "Upload failed";
      throw { message, statusCode: response.status };
    }

    return {
      success: true,
      data: result.data as { avatarUrl: string },
    };
  },

  async removeAvatar(): Promise<ApiResponse<{ user: User }>> {
    let response: Response;
    try {
      response = await fetchWithAuth("/users/avatar", { method: "DELETE" });
    } catch {
      throw { message: getNetworkErrorMessage(), statusCode: 0 };
    }

    const result = await parseJsonResponse(response);
    if (!response.ok) {
      const message =
        typeof result.message === "string" && result.message.trim().length > 0
          ? result.message
          : "Remove failed";
      throw { message, statusCode: response.status };
    }

    return {
      success: true,
      data: result.data as { user: User },
    };
  },
} as const;

export default userService;
