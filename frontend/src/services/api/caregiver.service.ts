// ============================================
// CAREGIVER API SERVICE
// Caregiver profile and search API calls
// ============================================

import { apiClient } from "./client";
import type { ApiResponse, User } from "@/types";

// Re-export constants
export const SERVICE_TYPES = {
  ELDERLY_CARE: "elderly_care",
  CHILD_CARE: "child_care",
  SPECIAL_NEEDS: "special_needs",
  DISABILITY_CARE: "disability_care",
  POST_SURGERY: "post_surgery",
  COMPANIONSHIP: "companionship",
  RESPITE_CARE: "respite_care",
  PALLIATIVE_CARE: "palliative_care",
} as const;

export const WORK_PREFERENCES = {
  LIVE_IN: "live_in",
  LIVE_OUT: "live_out",
  PART_TIME: "part_time",
  FULL_TIME: "full_time",
  OVERNIGHT: "overnight",
  WEEKENDS: "weekends",
  HOLIDAYS: "holidays",
} as const;

export const BACKGROUND_CHECK_STATUSES = {
  NOT_STARTED: "not_started",
  IN_PROGRESS: "in_progress",
  PASSED: "passed",
  FAILED: "failed",
  EXPIRED: "expired",
} as const;

// Certification type for caregivers
export interface CaregiverCertification {
  name: string;
  issuer?: string;
  issueDate?: string;
  expiryDate?: string;
  documentUrl?: string;
  verified?: boolean;
}

export interface Caregiver extends Omit<User, 'certifications'> {
  experience?: number;
  hourlyRate?: number;
  dailyRate?: number;
  weeklyRate?: number;
  monthlyRate?: number;
  skills?: string[];
  certifications?: CaregiverCertification[];
  serviceTypes?: string[];
  workPreferences?: string[];
  backgroundCheckStatus?: string;
  backgroundCheckDate?: string;
  isFeatured?: boolean;
  rating?: number;
  totalReviews?: number;
  profileViews?: number;
}

export interface CaregiversResponse {
  caregivers: Caregiver[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface CaregiverFilters {
  page?: number;
  limit?: number;
  serviceType?: string;
  location?: string;
  minRate?: number;
  maxRate?: number;
  experience?: number;
  rating?: number;
  availability?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface CaregiverStats {
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  averageRating: number;
  totalEarnings: number;
  profileViews: number;
}

export interface CaregiverMarketLocationItem {
  city: string;
  state?: string;
  country?: string;
  count: number;
  avgLow: number;
  avgHigh: number;
  median: number;
}

export interface CaregiverMarketCategoryItem {
  key: string;
  category: string;
  count: number;
  avgLow: number;
  avgHigh: number;
  median: number;
}

export interface CaregiverMarketContext {
  location: string;
  avgLow: number;
  avgHigh: number;
  median: number;
  trend: "up" | "down" | "stable";
  trendPercent: number;
  sampleSize: number;
  totalRegisteredUsers: number;
  totalRegisteredCaregivers: number;
  lastUpdated: string;
  breakdown: CaregiverMarketCategoryItem[];
  locationBreakdown: CaregiverMarketLocationItem[];
}

export interface AdminCaregiverFilters extends CaregiverFilters {
  status?: string;
  backgroundCheck?: string;
  featured?: boolean;
}

export interface BackgroundCheckUpdate {
  status: string;
  verificationDate?: string;
  notes?: string;
}

export interface ProfileUpdateData {
  bio?: string;
  experience?: number;
  hourlyRate?: number;
  dailyRate?: number;
  weeklyRate?: number;
  monthlyRate?: number;
  skills?: string[];
  serviceTypes?: string[];
  workPreferences?: string[];
  languages?: string[];
  availability?: {
    days?: string[];
    hours?: {
      start?: string;
      end?: string;
    };
  };
}

class CaregiverService {
  /**
   * Get public list of caregivers (for search)
   */
  async getCaregivers(filters: CaregiverFilters = {}): Promise<ApiResponse<CaregiversResponse>> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== "") {
        params.append(key, String(value));
      }
    });

    const queryString = params.toString();
    const endpoint = `/users/caregivers${queryString ? `?${queryString}` : ""}`;
    
    return apiClient.get<CaregiversResponse>(endpoint);
  }

  /**
   * Get single caregiver profile (public)
   */
  async getCaregiverProfile(caregiverId: string): Promise<ApiResponse<{ caregiver: Caregiver }>> {
    return apiClient.get<{ caregiver: Caregiver }>(`/users/caregivers/${caregiverId}`);
  }

  /**
   * Get caregiver dashboard data (for logged-in caregivers)
   */
  async getDashboard(): Promise<ApiResponse<CaregiverStats>> {
    return apiClient.get<CaregiverStats>("/users/caregiver/dashboard");
  }

  /**
   * Update availability
   */
  async updateAvailability(availability: ProfileUpdateData["availability"]): Promise<ApiResponse<{ user: User }>> {
    return apiClient.put<{ user: User }>("/users/caregiver/availability", { availability });
  }

  /**
   * Update rates
   */
  async updateRates(rates: Pick<ProfileUpdateData, "hourlyRate" | "dailyRate" | "weeklyRate" | "monthlyRate">): Promise<ApiResponse<{ user: User }>> {
    return apiClient.put<{ user: User }>("/users/caregiver/rates", rates);
  }

  /**
   * Get featured caregivers
   */
  async getFeaturedCaregivers(limit = 6): Promise<ApiResponse<{ caregivers: Caregiver[] }>> {
    return apiClient.get<{ caregivers: Caregiver[] }>(`/users/caregivers?featured=true&limit=${limit}`);
  }

  /**
   * Get caregiver market context for discovery pages.
   */
  async getMarketContext(params: {
    location?: string;
    categories?: string[];
    topLocations?: number;
    topCategories?: number;
  } = {}): Promise<ApiResponse<{ marketContext: CaregiverMarketContext }>> {
    const query = new URLSearchParams();
    if (params.location) query.set("location", params.location);
    if (params.categories && params.categories.length > 0) {
      query.set("categories", params.categories.join(","));
    }
    if (typeof params.topLocations === "number") {
      query.set("topLocations", String(params.topLocations));
    }
    if (typeof params.topCategories === "number") {
      query.set("topCategories", String(params.topCategories));
    }

    const qs = query.toString();
    return apiClient.get<{ marketContext: CaregiverMarketContext }>(
      `/users/caregivers/market-context${qs ? `?${qs}` : ""}`,
    );
  }

  // ============================================
  // ADMIN METHODS
  // ============================================

  /**
   * Get all caregivers (Admin)
   */
  async getCaregiversAdmin(filters: AdminCaregiverFilters = {}): Promise<ApiResponse<CaregiversResponse>> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== "") {
        params.append(key, String(value));
      }
    });

    const queryString = params.toString();
    return apiClient.get<CaregiversResponse>(`/admin/caregivers${queryString ? `?${queryString}` : ""}`);
  }

  /**
   * Update caregiver background check (Admin)
   */
  async updateBackgroundCheck(
    caregiverId: string, 
    data: BackgroundCheckUpdate
  ): Promise<ApiResponse<{ user: User }>> {
    return apiClient.patch<{ user: User }>(`/admin/caregivers/${caregiverId}/background-check`, data);
  }

  /**
   * Toggle featured status (Admin)
   */
  async toggleFeatured(caregiverId: string): Promise<ApiResponse<{ user: User }>> {
    return apiClient.patch<{ user: User }>(`/admin/caregivers/${caregiverId}/featured`);
  }

  async toggleRecommended(userId: string): Promise<ApiResponse<{ isRecommended: boolean }>> {
    return apiClient.patch<{ isRecommended: boolean }>(`/admin/caregivers/${userId}/recommend`);
  }

  /**
   * Verify caregiver profile (Admin)
   */
  async verifyProfile(caregiverId: string): Promise<ApiResponse<{ user: User }>> {
    return apiClient.patch<{ user: User }>(`/admin/caregivers/${caregiverId}/verify`);
  }

  /**
   * Permanently delete caregiver account and related records (Admin)
   */
  async deleteCaregiver(caregiverId: string): Promise<ApiResponse<null>> {
    return apiClient.delete<null>(`/admin/users/${caregiverId}`);
  }
}

export const caregiverService = new CaregiverService();
export default caregiverService;
