// ============================================
// NOTIFICATION API SERVICE
// Notification management API calls
// ============================================

import { apiClient } from "./client";
import type { ApiResponse } from "@/types";
import { AUTH_CONFIG } from "@/lib/constants";

export type NotificationType = 
  | "booking_request"
  | "booking_caregiver_accepted"
  | "booking_caregiver_rejected"
  | "booking_confirmed"
  | "booking_rejected"
  | "booking_cancelled"
  | "booking_completed"
  | "booking_modified"
  | "booking_reminder"
  | "booking_started"
  | "check_in"
  | "check_out"
  | "check_in_reminder"
  | "check_out_reminder"
  | "care_report_submitted"
  | "care_report_updated"
  | "incident_reported"
  | "document_uploaded"
  | "document_verified"
  | "document_approved"
  | "document_rejected"
  | "document_expiring"
  | "profile_viewed"
  | "profile_approved"
  | "profile_update_required"
  | "profile_suspended"
  | "message_received"
  | "new_message"
  | "review_received"
  | "review_response"
  | "review_reminder"
  | "payment_received"
  | "payment_released"
  | "payment_pending"
  | "payment_failed"
  | "payment_due"
  | "refund_processed"
  | "payout_sent"
  | "dispute_raised"
  | "dispute_resolved"
  | "system_announcement"
  | "system_update"
  | "welcome"
  | "account_activated"
  | "account_suspended"
  | "system";

export interface Notification {
  _id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  read?: boolean;
  readAt?: string;
  createdAt: string;
}

export interface NotificationPreferences {
  email: {
    bookingUpdates: boolean;
    messages: boolean;
    marketing: boolean;
    reminders: boolean;
  };
  push: {
    bookingUpdates: boolean;
    messages: boolean;
    reminders: boolean;
  };
  sms: {
    bookingUpdates: boolean;
    reminders: boolean;
  };
}

export interface NotificationFilters {
  page?: number;
  limit?: number;
  isRead?: boolean;
  read?: boolean;
  type?: NotificationType;
}

export interface NotificationListResponse {
  notifications: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  unreadCount: number;
}

class NotificationService {
  private hasClientAuthHint(): boolean {
    if (typeof window === "undefined") return true;

    const hasStoredUser = Boolean(localStorage.getItem(AUTH_CONFIG.USER_KEY));
    const hasStoredToken = Boolean(
      localStorage.getItem(AUTH_CONFIG.TOKEN_KEY) ||
        localStorage.getItem(AUTH_CONFIG.REFRESH_TOKEN_KEY)
    );
    const hasUserCookie = document.cookie.includes(`${AUTH_CONFIG.USER_KEY}=`);

    return hasStoredUser || hasStoredToken || hasUserCookie;
  }

  private emptyNotifications(): NotificationListResponse {
    return {
      notifications: [],
      pagination: {
        page: 1,
        limit: 0,
        total: 0,
        pages: 0,
      },
      unreadCount: 0,
    };
  }

  private isAuthError(error: unknown): boolean {
    const statusCode = (error as { statusCode?: number })?.statusCode;
    return statusCode === 401 || statusCode === 403;
  }

  private isServerError(error: unknown): boolean {
    const statusCode = (error as { statusCode?: number })?.statusCode;
    return typeof statusCode === "number" && statusCode >= 500;
  }

  /**
   * Get user notifications
   */
  async getNotifications(filters: NotificationFilters = {}): Promise<ApiResponse<NotificationListResponse>> {
    if (!this.hasClientAuthHint()) {
      return {
        success: true,
        data: this.emptyNotifications(),
      };
    }

    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== "") {
        params.append(key, String(value));
      }
    });

    const queryString = params.toString();
    try {
      return await apiClient.get<NotificationListResponse>(`/notifications${queryString ? `?${queryString}` : ""}`);
    } catch (error: unknown) {
      if (this.isAuthError(error) || this.isServerError(error)) {
        return {
          success: true,
          data: this.emptyNotifications(),
        };
      }
      throw error;
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<ApiResponse<{ count: number }>> {
    if (!this.hasClientAuthHint()) {
      return {
        success: true,
        data: { count: 0 },
      };
    }

    try {
      return await apiClient.get<{ count: number }>("/notifications/unread-count");
    } catch (error: unknown) {
      if (this.isAuthError(error) || this.isServerError(error)) {
        return {
          success: true,
          data: { count: 0 },
        };
      }
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<ApiResponse<{ notification: Notification }>> {
    return apiClient.patch<{ notification: Notification }>(`/notifications/${notificationId}/read`);
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<ApiResponse<{ message: string }>> {
    return apiClient.patch<{ message: string }>("/notifications/read-all");
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string): Promise<ApiResponse<null>> {
    return apiClient.delete<null>(`/notifications/${notificationId}`);
  }

  /**
   * Get notification preferences
   */
  async getPreferences(): Promise<ApiResponse<{ preferences: NotificationPreferences }>> {
    return apiClient.get<{ preferences: NotificationPreferences }>("/notifications/preferences");
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(
    preferences: Partial<NotificationPreferences>
  ): Promise<ApiResponse<{ preferences: NotificationPreferences }>> {
    return apiClient.put<{ preferences: NotificationPreferences }>("/notifications/preferences", preferences);
  }
}

export const notificationService = new NotificationService();
export default notificationService;
