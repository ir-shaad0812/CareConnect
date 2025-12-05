// ============================================
// REVIEW API SERVICE
// Verified booking-linked review system
// ============================================

import { apiClient } from "./client";
import type { ApiResponse, User } from "@/types";

// ---- Enums / Constants ----

export type ReviewType = "verified";
export type ReviewStatus = "published" | "hidden" | "removed" | "pending_review";
export type ReportReason =
  | "spam"
  | "inappropriate"
  | "fake"
  | "harassment"
  | "other";
export type ModerationAction = "approved" | "hidden" | "removed";

// ---- Interfaces ----

export interface ReviewRatings {
  punctuality?: number;
  professionalism?: number;
  communication?: number;
  qualityOfCare?: number;
  valueForMoney?: number;
}

export interface ReviewPhoto {
  url: string;
  publicId?: string;
}

export interface ReviewMedia {
  _id?: string;
  mediaType: "image" | "video";
  url: string;
  publicId: string;
  thumbnailUrl?: string;
  duration?: number;
  format?: string;
  bytes?: number;
  uploadedAt?: string;
}

export interface ReviewAuditLog {
  _id?: string;
  actorId?: string | User;
  action: string;
  reason?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface ReviewReport {
  userId: string | User;
  reason: ReportReason;
  description?: string;
  createdAt: string;
}

export interface ReviewModeration {
  moderatedBy: string | User;
  action: ModerationAction;
  reason?: string;
  moderatedAt: string;
}

export interface ReviewResponse {
  content: string;
  respondedAt: string;
}

export interface Review {
  _id: string;
  reviewType: ReviewType;
  bookingId?: string;
  reviewerId: string | User;
  revieweeId: string | User;
  overallRating: number;
  ratings: ReviewRatings;
  title?: string;
  comment: string;
  photos?: Array<string | ReviewPhoto>;
  media?: ReviewMedia[];
  response?: ReviewResponse;
  helpful: {
    count: number;
    users: string[];
  };
  reported: {
    isReported: boolean;
    reports: ReviewReport[];
  };
  status: ReviewStatus;
  moderation?: ReviewModeration;
  auditLogs?: ReviewAuditLog[];
  serviceType?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVerifiedReviewData {
  overallRating: number;
  ratings?: ReviewRatings;
  title?: string;
  comment: string;
  photos?: Array<string | ReviewPhoto>;
  serviceType?: string;
}

export interface ReviewFilters {
  page?: number;
  limit?: number;
  reviewType?: ReviewType;
  status?: ReviewStatus;
  reported?: boolean;
  minRating?: number;
  maxRating?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface ReviewListResponse {
  reviews: Review[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface AverageRatings {
  overall: number;
  punctuality: number;
  professionalism: number;
  communication: number;
  qualityOfCare: number;
  valueForMoney: number;
  totalReviews: number;
}

export interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  verifiedReviews: number;
  publicReviews: number;
  reportedReviews: number;
  hiddenReviews: number;
  ratingDistribution: Record<string, number>;
}

interface BackendReviewStatsPayload {
  total: number;
  verified: number;
  public: number;
  published: number;
  hidden: number;
  removed: number;
  reported: number;
  averageRating: number;
}

export interface ReviewableBooking {
  _id: string;
  bookingNumber: string;
  caregiverId: string | User;
  careSeekerId: string | User;
  serviceType: string;
  schedule: {
    startDate: string;
    endDate?: string;
  };
  completedAt?: string;
}

// ---- Service ----

class ReviewService {
  // Create a verified review (post-booking completion)
  async createVerifiedReview(
    bookingId: string,
    data: CreateVerifiedReviewData
  ): Promise<ApiResponse<{ review: Review }>> {
    return apiClient.post<{ review: Review }>(
      `/reviews/booking/${bookingId}`,
      data
    );
  }

  // Get reviews for a specific user (public-facing)
  async getUserReviews(
    userId: string,
    filters: ReviewFilters = {}
  ): Promise<ApiResponse<ReviewListResponse & { averageRatings: AverageRatings }>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== "") {
        params.append(key, String(value));
      }
    });
    const queryString = params.toString();
    return apiClient.get<ReviewListResponse & { averageRatings: AverageRatings }>(
      `/reviews/user/${userId}${queryString ? `?${queryString}` : ""}`
    );
  }

  // Get reviews written by current user
  async getMyWrittenReviews(
    filters: ReviewFilters = {}
  ): Promise<ApiResponse<ReviewListResponse>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== "") {
        params.append(key, String(value));
      }
    });
    const queryString = params.toString();
    return apiClient.get<ReviewListResponse>(
      `/reviews/me/written${queryString ? `?${queryString}` : ""}`
    );
  }

  // Get reviews about current user
  async getMyReceivedReviews(
    filters: ReviewFilters = {}
  ): Promise<ApiResponse<ReviewListResponse>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== "") {
        params.append(key, String(value));
      }
    });
    const queryString = params.toString();
    return apiClient.get<ReviewListResponse>(
      `/reviews/me/received${queryString ? `?${queryString}` : ""}`
    );
  }

  // Get a single review by ID
  async getReviewById(
    reviewId: string
  ): Promise<ApiResponse<{ review: Review }>> {
    return apiClient.get<{ review: Review }>(`/reviews/${reviewId}`);
  }

  // Respond to a review (as the reviewee)
  async respondToReview(
    reviewId: string,
    content: string
  ): Promise<ApiResponse<{ review: Review }>> {
    return apiClient.post<{ review: Review }>(
      `/reviews/${reviewId}/respond`,
      { content }
    );
  }

  // Toggle helpful vote on a review
  async toggleHelpful(
    reviewId: string
  ): Promise<ApiResponse<{ helpful: { count: number; hasVoted: boolean } }>> {
    return apiClient.post<{
      helpful: { count: number; hasVoted: boolean };
    }>(`/reviews/${reviewId}/helpful`);
  }

  // Report a review
  async reportReview(
    reviewId: string,
    data: { reason: ReportReason; description?: string }
  ): Promise<ApiResponse<{ message: string }>> {
    return apiClient.post<{ message: string }>(
      `/reviews/${reviewId}/report`,
      data
    );
  }

  // Check if current user can review a booking
  async canReviewBooking(
    bookingId: string
  ): Promise<ApiResponse<{ canReview: boolean; reason?: string }>> {
    return apiClient.get<{ canReview: boolean; reason?: string }>(
      `/reviews/booking/${bookingId}/check`
    );
  }

  // Get bookings that are reviewable
  async getReviewableBookings(): Promise<
    ApiResponse<{ bookings: ReviewableBooking[] }>
  > {
    return apiClient.get<{ bookings: ReviewableBooking[] }>(
      "/reviews/me/reviewable"
    );
  }

  // ---- Admin Methods ----

  // Get all reviews (admin)
  async getAllReviews(
    filters: ReviewFilters = {}
  ): Promise<ApiResponse<ReviewListResponse>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== "") {
        params.append(key, String(value));
      }
    });
    const queryString = params.toString();
    return apiClient.get<ReviewListResponse>(
      `/reviews/admin/all${queryString ? `?${queryString}` : ""}`
    );
  }

  // Get review stats (admin)
  async getReviewStats(): Promise<ApiResponse<ReviewStats>> {
    const response = await apiClient.get<ReviewStats | { stats: BackendReviewStatsPayload }>(
      "/reviews/admin/stats"
    );

    const data = response.data;
    if (
      data &&
      typeof data === "object" &&
      "stats" in data &&
      data.stats &&
      typeof data.stats === "object"
    ) {
      const stats = data.stats as BackendReviewStatsPayload;
      return {
        ...response,
        data: {
          totalReviews: Number(stats.total || 0),
          averageRating: Number(stats.averageRating || 0),
          verifiedReviews: Number(stats.verified || 0),
          publicReviews: Number(stats.public || 0),
          reportedReviews: Number(stats.reported || 0),
          hiddenReviews: Number(stats.hidden || 0),
          ratingDistribution: {},
        },
      };
    }

    return response as ApiResponse<ReviewStats>;
  }

  // Moderate a review (admin)
  async moderateReview(
    reviewId: string,
    data: { action: ModerationAction; reason: string }
  ): Promise<ApiResponse<{ review: Review }>> {
    return apiClient.post<{ review: Review }>(
      `/reviews/admin/${reviewId}/moderate`,
      data
    );
  }

  // Add optional media to an existing review (multipart upload)
  async addReviewMedia(
    reviewId: string,
    files: File[]
  ): Promise<ApiResponse<{ review: Review }>> {
    const formData = new FormData();
    files.forEach((file) => formData.append("media", file));
    return apiClient.post<{ review: Review }>(`/reviews/${reviewId}/media`, formData);
  }

  // Admin: remove a specific media item from a review
  async removeReviewMediaAsAdmin(
    reviewId: string,
    mediaId: string,
    reason?: string
  ): Promise<ApiResponse<{ review: Review }>> {
    const reasonParam = reason ? `?reason=${encodeURIComponent(reason)}` : "";
    return apiClient.delete<{ review: Review }>(
      `/reviews/admin/${reviewId}/media/${mediaId}${reasonParam}`
    );
  }
}

export const reviewService = new ReviewService();
export default reviewService;
