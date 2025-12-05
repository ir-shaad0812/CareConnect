// ============================================
// DISPUTE SERVICE - Frontend API Layer
// ============================================

import { apiClient } from "./client";

export interface DisputeEvidence {
  url: string;
  publicId?: string;
  type: "image" | "document" | "video";
  name?: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface DisputeTimeline {
  _id: string;
  action: string;
  performedBy: { _id: string; fullName: string; avatar?: string; role: string };
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface DisputeMessage {
  _id: string;
  sender: { _id: string; fullName: string; avatar?: string; role: string };
  senderRole: "admin" | "caregiver" | "careseeker";
  content: string;
  readBy: string[];
  createdAt: string;
}

export interface Dispute {
  _id: string;
  ticketNumber: string;
  bookingId: {
    _id: string;
    bookingNumber: string;
    serviceType: string;
    status: string;
    schedule?: { startDate: string; endDate: string };
    pricing?: { totalAmount: number; total?: number };
  };
  filedBy: { _id: string; fullName: string; avatar?: string; role: string; email?: string };
  filedByRole: "caregiver" | "careseeker";
  againstUser: { _id: string; fullName: string; avatar?: string; role: string; email?: string };
  category: string;
  subject: string;
  description: string;
  evidence: DisputeEvidence[];
  priority: "low" | "medium" | "high" | "critical";
  status: "open" | "investigating" | "awaiting_response" | "resolved" | "dismissed" | "escalated";
  resolution?: {
    type: string;
    description: string;
    refundAmount: number;
    resolvedBy?: { _id: string; fullName: string };
    resolvedAt: string;
  };
  assignedTo?: { _id: string; fullName: string; avatar?: string };
  timeline: DisputeTimeline[];
  messages: DisputeMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface DisputeStats {
  statusCounts: Record<string, number>;
  categoryCounts: Record<string, number>;
  avgResolutionTimeMs: number;
  total: number;
}

export interface CreateDisputePayload {
  bookingId: string;
  category: string;
  subject: string;
  description: string;
  evidence?: { url: string; type: string; name?: string }[];
}

const disputeService = {
  // User endpoints
  create: (data: CreateDisputePayload) =>
    apiClient.post<{ dispute: Dispute }>("/disputes", data),

  getMyDisputes: (params?: { status?: string; page?: number; limit?: number }) =>
    apiClient.get<{ disputes: Dispute[]; pagination: { total: number; page: number; pages: number } }>(
      "/disputes",
      { params: params as Record<string, unknown> }
    ),

  getById: (disputeId: string) =>
    apiClient.get<{ dispute: Dispute }>(`/disputes/${disputeId}`),

  addMessage: (disputeId: string, content: string) =>
    apiClient.post<{ dispute: Dispute }>(`/disputes/${disputeId}/message`, { content }),

  addEvidence: (disputeId: string, data: { url: string; type: string; name?: string }) =>
    apiClient.post<{ dispute: Dispute }>(`/disputes/${disputeId}/evidence`, data),

  // Admin endpoints
  adminGetAll: (params?: { status?: string; category?: string; priority?: string; search?: string; page?: number; limit?: number }) =>
    apiClient.get<{
      disputes: Dispute[];
      statusCounts: Record<string, number>;
      pagination: { total: number; page: number; pages: number };
    }>("/disputes/admin/all", { params: params as Record<string, unknown> }),

  adminGetStats: () =>
    apiClient.get<{ stats: DisputeStats }>("/disputes/admin/stats"),

  adminUpdateStatus: (disputeId: string, status: string, message?: string) =>
    apiClient.patch<{ dispute: Dispute }>(`/disputes/admin/${disputeId}/status`, { status, message }),

  adminResolve: (disputeId: string, data: { type: string; description?: string; refundAmount?: number }) =>
    apiClient.post<{ dispute: Dispute }>(`/disputes/admin/${disputeId}/resolve`, data),

  adminSendMessage: (disputeId: string, content: string, targetRole?: string) =>
    apiClient.post<{ dispute: Dispute }>(`/disputes/admin/${disputeId}/message`, { content, targetRole }),

  adminAddNote: (disputeId: string, content: string) =>
    apiClient.post<{ dispute: Dispute }>(`/disputes/admin/${disputeId}/note`, { content }),
};

export default disputeService;
