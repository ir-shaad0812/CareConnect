// ============================================
// NOTE SERVICE - Frontend API Layer
// Full collaborative notes with edit requests
// ============================================

import { apiClient } from "./client";

export interface Note {
  _id: string;
  createdBy: {
    _id: string;
    fullName?: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
    role: string;
  };
  creatorRole: "caregiver" | "careseeker";
  bookingId?: {
    _id: string;
    bookingNumber: string;
    serviceType: string;
    status: string;
    schedule?: { startDate: string; endDate: string };
  };
  sharedWith?: {
    _id: string;
    fullName?: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
    role: string;
  };
  title: string;
  content: string;
  tags: string[];
  tag: string;
  visibility: "private" | "shared";
  hasPendingEditRequest: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NoteEditRequest {
  _id: string;
  noteId: {
    _id: string;
    title: string;
    content: string;
    tag: string;
    tags?: string[];
    visibility: string;
  };
  requestedBy: {
    _id: string;
    fullName?: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
    role: string;
  };
  requestedTo: {
    _id: string;
    fullName?: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
    role: string;
  };
  bookingId?: { _id: string; bookingNumber: string; serviceType: string };
  proposedTitle?: string;
  proposedContent?: string;
  proposedTag?: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  responseMessage?: string;
  respondedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NoteStats {
  totalNotes: number;
  tags: Record<string, number>;
  visibility: { private: number; shared: number };
  editRequests: { pending: number; approved: number; rejected: number };
}

export interface CreateNotePayload {
  bookingId?: string;
  title: string;
  content: string;
  tags?: string[];
  tag?: string;
  visibility?: string;
}

export interface UpdateNotePayload {
  title?: string;
  content?: string;
  tags?: string[];
  tag?: string;
  visibility?: string;
}

export interface CreateEditRequestPayload {
  noteId: string;
  proposedTitle?: string;
  proposedContent?: string;
  proposedTag?: string;
  reason: string;
}

export interface NotesResponse {
  notes: Note[];
  pagination: { total: number; page: number; limit: number; pages: number };
}

export interface EditRequestsResponse {
  editRequests: NoteEditRequest[];
  pagination: { total: number; page: number; limit: number; pages: number };
}

const noteService = {
  // CRUD
  getNotes: (params?: {
    tag?: string;
    bookingId?: string;
    search?: string;
    visibility?: string;
    page?: number;
    limit?: number;
  }) => apiClient.get<NotesResponse>("/notes", { params: params as Record<string, unknown> }),

  getNoteById: (noteId: string) =>
    apiClient.get<{ note: Note }>(`/notes/${noteId}`),

  createNote: (data: CreateNotePayload) =>
    apiClient.post<{ note: Note }>("/notes", data),

  updateNote: (noteId: string, data: UpdateNotePayload) =>
    apiClient.put<{ note: Note }>(`/notes/${noteId}`, data),

  deleteNote: (noteId: string) =>
    apiClient.delete<{ message: string }>(`/notes/${noteId}`),

  // Sharing
  shareNote: (noteId: string, bookingId: string) =>
    apiClient.patch<{ note: Note }>(`/notes/${noteId}/share`, { bookingId }),

  shareMultipleNotes: (noteIds: string[], bookingId: string) =>
    apiClient.patch<{ results: Array<{ noteId: string; success: boolean; error?: string }> }>(
      "/notes/share-bulk",
      { noteIds, bookingId }
    ),

  // Booking notes
  getBookingNotes: (bookingId: string) =>
    apiClient.get<{ notes: Note[] }>(`/notes/booking/${bookingId}`),

  // Stats
  getNoteStats: () =>
    apiClient.get<{ stats: NoteStats }>("/notes/stats"),

  // Edit requests
  createEditRequest: (data: CreateEditRequestPayload) =>
    apiClient.post<{ editRequest: NoteEditRequest }>("/notes/edit-request", data),

  getEditRequests: (params?: { status?: string; role?: string; page?: number; limit?: number }) =>
    apiClient.get<EditRequestsResponse>("/notes/edit-requests", { params: params as Record<string, unknown> }),

  approveEditRequest: (requestId: string, responseMessage?: string) =>
    apiClient.patch<{ editRequest: NoteEditRequest }>(
      `/notes/edit-request/${requestId}/approve`,
      { responseMessage }
    ),

  rejectEditRequest: (requestId: string, responseMessage?: string) =>
    apiClient.patch<{ editRequest: NoteEditRequest }>(
      `/notes/edit-request/${requestId}/reject`,
      { responseMessage }
    ),

  // Admin
  adminGetNotes: (params?: Record<string, unknown>) =>
    params
      ? apiClient.get<NotesResponse>("/admin/notes", { params })
      : apiClient.get<NotesResponse>("/admin/notes"),

  adminDeleteNote: (noteId: string) =>
    apiClient.delete<{ message: string }>(`/admin/notes/${noteId}`),
};

export default noteService;
