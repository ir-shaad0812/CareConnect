// ============================================
// FEEDBACK API SERVICE
// Platform-level feedback and admin lifecycle APIs
// ============================================

import { apiClient } from "./client";
import { API_CONFIG, AUTH_CONFIG } from "@/lib/constants";
import type { ApiResponse, ApiError, User } from "@/types";

export type FeedbackType =
  | "bug_report"
  | "feature_request"
  | "complaint"
  | "general";

export type FeedbackStatus =
  | "submitted"
  | "pending"
  | "in_progress"
  | "resolved";

export interface FeedbackAuditEntry {
  action: "submitted" | "status_updated";
  actorId: string | User;
  actorRole: string;
  note?: string;
  createdAt: string;
}

export interface FeedbackRecord {
  _id: string;
  feedbackId: string;
  userId: string | User;
  type: FeedbackType;
  title: string;
  description: string;
  screenshot?: {
    url?: string | null;
    publicId?: string | null;
  };
  status: FeedbackStatus;
  adminReview?: {
    updatedBy?: string | User | null;
    updatedAt?: string | null;
    note?: string;
  };
  auditLog: FeedbackAuditEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateFeedbackData {
  type: FeedbackType;
  title: string;
  description: string;
  screenshot?: File | string;
}

export interface FeedbackFilters {
  page?: number;
  limit?: number;
  type?: FeedbackType;
  status?: FeedbackStatus;
  search?: string;
}

export interface FeedbackListResponse {
  feedback: FeedbackRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface AdminFeedbackListResponse extends FeedbackListResponse {
  stats: {
    total: number;
    byStatus: Record<string, number>;
  };
}

const buildFeedbackQuery = (filters: FeedbackFilters = {}) => {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      params.append(key, String(value));
    }
  });

  const query = params.toString();
  return query ? `?${query}` : "";
};

const getBearerToken = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_CONFIG.TOKEN_KEY);
};

class FeedbackService {
  async createFeedback(
    data: CreateFeedbackData,
  ): Promise<ApiResponse<{ feedback: FeedbackRecord }>> {
    if (data.screenshot instanceof File) {
      const formData = new FormData();
      formData.append("type", data.type);
      formData.append("title", data.title);
      formData.append("description", data.description);
      formData.append("screenshot", data.screenshot);

      const token = getBearerToken();
      const headers: Record<string, string> = {
        "Accept-Language":
          typeof window !== "undefined"
            ? localStorage.getItem("careconnect_language") || "en"
            : "en",
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${API_CONFIG.BASE_URL}/feedback`, {
        method: "POST",
        credentials: "include",
        headers,
        body: formData,
      });

      let payload: Record<string, unknown> = {};
      try {
        payload = (await response.json()) as Record<string, unknown>;
      } catch {
        payload = {};
      }

      if (!response.ok) {
        const normalizedErrors: NonNullable<ApiError["errors"]> = Array.isArray(payload.errors)
          ? (payload.errors as NonNullable<ApiError["errors"]>)
          : [];

        const error: ApiError = {
          message:
            String(payload.message || "Failed to submit feedback") ||
            "Failed to submit feedback",
          statusCode: response.status,
          errors: normalizedErrors,
        };
        throw error;
      }

      return {
        success: true,
        data: (payload.data || payload) as { feedback: FeedbackRecord },
        message: String(payload.message || "Feedback submitted successfully"),
      };
    }

    const payload = {
      type: data.type,
      title: data.title,
      description: data.description,
      ...(typeof data.screenshot === "string" && data.screenshot.trim()
        ? { screenshotUrl: data.screenshot.trim() }
        : {}),
    };

    return apiClient.post<{ feedback: FeedbackRecord }>("/feedback", payload);
  }

  async getMyFeedback(
    filters: FeedbackFilters = {},
  ): Promise<ApiResponse<FeedbackListResponse>> {
    return apiClient.get<FeedbackListResponse>(
      `/feedback/my${buildFeedbackQuery(filters)}`,
    );
  }

  async getFeedbackById(
    feedbackId: string,
  ): Promise<ApiResponse<{ feedback: FeedbackRecord }>> {
    return apiClient.get<{ feedback: FeedbackRecord }>(`/feedback/${feedbackId}`);
  }

  async getAdminFeedback(
    filters: FeedbackFilters = {},
  ): Promise<ApiResponse<AdminFeedbackListResponse>> {
    return apiClient.get<AdminFeedbackListResponse>(
      `/feedback/admin${buildFeedbackQuery(filters)}`,
    );
  }

  async updateFeedbackStatus(
    feedbackId: string,
    status: FeedbackStatus,
    note?: string,
  ): Promise<ApiResponse<{ feedback: FeedbackRecord }>> {
    return apiClient.patch<{ feedback: FeedbackRecord }>(
      `/feedback/admin/${feedbackId}/status`,
      {
        status,
        ...(note && note.trim() ? { note: note.trim() } : {}),
      },
    );
  }
}

export const feedbackService = new FeedbackService();
export default feedbackService;
