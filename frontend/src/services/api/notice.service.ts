// ============================================
// NOTICE API SERVICE
// ============================================

import { apiClient } from "./client";
import type { ApiResponse } from "@/types";

export interface NoticeAttachment {
  name: string;
  url: string;
  type: string;
}

export interface Notice {
  _id: string;
  title: string;
  content: string;
  type: "info" | "normal" | "urgent" | "warning" | "announcement";
  targetRoles: string[];
  allowResponse: boolean;
  attachments: NoticeAttachment[];
  expiryDate?: string;
  isActive: boolean;
  isRead: boolean;
  createdBy: { _id: string; fullName: string; avatar?: string };
  createdAt: string;
  updatedAt: string;
}

export interface NoticeListResponse {
  notices: Notice[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

class NoticeService {
  async getNotices(params: { page?: number; limit?: number } = {}): Promise<ApiResponse<NoticeListResponse>> {
    const qs = new URLSearchParams();
    if (params.page) qs.set("page", String(params.page));
    if (params.limit) qs.set("limit", String(params.limit));
    return apiClient.get<NoticeListResponse>(`/notices?${qs}`);
  }

  async markRead(noticeId: string): Promise<ApiResponse<null>> {
    return apiClient.patch<null>(`/notices/${noticeId}/read`);
  }

  async respond(noticeId: string, message: string): Promise<ApiResponse<unknown>> {
    return apiClient.post<unknown>(`/notices/${noticeId}/respond`, { message });
  }

  // Admin
  async createNotice(data: Partial<Notice>): Promise<ApiResponse<{ notice: Notice }>> {
    return apiClient.post<{ notice: Notice }>("/notices", data);
  }

  async updateNotice(noticeId: string, data: Partial<Notice>): Promise<ApiResponse<{ notice: Notice }>> {
    return apiClient.patch<{ notice: Notice }>(`/notices/${noticeId}`, data);
  }

  async deleteNotice(noticeId: string): Promise<ApiResponse<null>> {
    return apiClient.delete<null>(`/notices/${noticeId}`);
  }

  async adminListNotices(params: { page?: number; limit?: number; type?: string; isActive?: boolean } = {}): Promise<ApiResponse<NoticeListResponse>> {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined) qs.set(k, String(v)); });
    return apiClient.get<NoticeListResponse>(`/notices/admin/all?${qs}`);
  }
}

export const noticeService = new NoticeService();
export default noticeService;
