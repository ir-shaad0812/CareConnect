// ============================================
// CHAT SERVICE - Frontend API Client
// Handles all chat-related API calls
// ============================================

import { apiClient } from "./client";
import { API_CONFIG, AUTH_CONFIG } from "@/lib/constants";

// Types
export interface Participant {
  _id: string;
  fullName: string;
  avatar?: string;
  role: string;
}

export interface Reaction {
  emoji: string;
  userId: string;
  userName: string;
  createdAt: string;
}

export interface PinnedInfo {
  isPinned: boolean;
  pinnedBy?: string;
  pinnedAt?: string;
}

export interface Message {
  _id: string;
  conversationId: string;
  senderId: Participant;
  receiverId: Participant;
  messageType: "text" | "image" | "file" | "voice" | "system";
  content: string;
  attachments?: Attachment[];
  status: "sent" | "delivered" | "read" | "failed";
  deliveredAt?: string;
  readAt?: string;
  reactions?: Reaction[];
  pinned?: PinnedInfo;
  createdAt: string;
  updatedAt: string;
  metadata?: {
    systemMessageType?: string;
    bookingId?: string;
  };
  // For retry tracking
  retryInfo?: {
    attempts: number;
    lastAttempt?: string;
    errorCode?: string;
    errorMessage?: string;
  };
}

// Optimistic message for pending/failed states (frontend only)
export interface OptimisticMessage extends Omit<Message, "_id" | "senderId" | "receiverId" | "status"> {
  _id: string;
  tempId: string;
  senderId: Participant | { _id: string; fullName: string; avatar?: string };
  receiverId?: Participant | { _id: string };
  status: "sending" | "sent" | "delivered" | "read" | "failed";
  retryCount?: number;
}

export interface Attachment {
  type: "image" | "document" | "audio";
  url: string;
  name?: string;
  size?: number;
  mimeType?: string;
}

// Conversation status types
export type ConversationStatus = "locked" | "active" | "restricted" | "archived" | "closed";

// Chat access control types
export interface AccessControlInfo {
  chatUnlockedAt?: string;
  lastStatusChange?: string;
  statusReason?: string;
  paymentVerifiedAt?: string;
  changedBy?: string;
}

export interface BookingInfo {
  bookingId: string;
  bookingNumber: string;
  bookingStatus: string;
  paymentStatus: string;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  paymentDeadline?: string;
  isPaymentExpired?: boolean;
}

export interface ChatAccessStatus {
  exists: boolean;
  conversationId?: string;
  status: ConversationStatus;
  canSendMessages: boolean;
  reason: string;
  reasonCode: string;
  booking?: BookingInfo;
  participants?: Participant[];
  accessControl?: AccessControlInfo;
  chatUnlockedAt?: string;
  isMuted?: boolean;
}

export interface ChatAccessResponse {
  conversation: Conversation;
  accessStatus: {
    canSendMessages: boolean;
    status: ConversationStatus;
    reason: string;
    reasonMessage: string;
    bookingStatus?: string;
    paymentStatus?: string;
    amountDue?: number;
    paymentDeadline?: string;
  };
}

export interface Conversation {
  _id: string;
  participants: Participant[];
  bookingId?: {
    _id: string;
    bookingNumber: string;
    serviceType: string;
    status: string;
    paymentStatus?: string;
    totalAmount?: number;
    amountPaid?: number;
    amountDue?: number;
    paymentDeadline?: string;
    schedule: {
      startDate: string;
      endDate: string;
    };
  };
  lastMessage?: {
    content: string;
    senderId: string;
    messageType: string;
    createdAt: string;
    status?: "sending" | "sent" | "delivered" | "read" | "failed";
  };
  unreadCount: Record<string, number>;
  status: ConversationStatus;
  accessControl?: AccessControlInfo;
  label?: "inquiry" | "booked" | "active" | "completed" | null;
  isBlocked?: boolean;
  blockedBy?: string;
  mutedBy?: string[];
  pinnedMessages?: string[];
  isPinned?: boolean;
  otherParticipant?: Participant;
  myUnreadCount?: number;
  metadata?: {
    chatEnabled?: boolean;
    disabledReason?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ConversationsResponse {
  conversations: Conversation[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

export interface MessagesResponse {
  messages: Message[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface SendMessagePayload {
  content: string;
  messageType?: "text" | "image" | "file" | "voice";
  attachments?: Attachment[];
}

// ============================================
// CONVERSATION ENDPOINTS
// ============================================

/**
 * Start or get a conversation for a booking
 * Returns conversation with access status for strict payment verification
 */
export async function startConversation(bookingId: string) {
  return apiClient.post<ChatAccessResponse>(
    "/chat/conversations/start",
    { bookingId }
  );
}

/**
 * Get all conversations for the current user
 */
export async function getConversations(page = 1, limit = 20, status?: string) {
  const statusParam = status ? `&status=${status}` : '';
  return apiClient.get<ConversationsResponse>(
    `/chat/conversations?page=${page}&limit=${limit}${statusParam}`
  );
}

/**
 * Get a single conversation by ID
 */
export async function getConversationById(conversationId: string) {
  return apiClient.get<{ conversation: Conversation }>(
    `/chat/conversations/${conversationId}`
  );
}

/**
 * Get conversation by booking ID
 */
export async function getConversationByBooking(bookingId: string) {
  return apiClient.get<{ conversation: Conversation | null }>(
    `/chat/conversations/booking/${bookingId}`
  );
}

// ============================================
// CHAT ACCESS CONTROL ENDPOINTS
// ============================================

/**
 * Get chat access status for a conversation
 * This provides detailed status info for the frontend UI
 */
export async function getChatAccessStatus(conversationId: string) {
  return apiClient.get<{ accessStatus: ChatAccessStatus }>(
    `/chat/conversations/${conversationId}/access-status`
  );
}

/**
 * Request chat unlock (returns payment info needed)
 */
export async function requestChatUnlock(conversationId: string) {
  return apiClient.post<{
    alreadyUnlocked: boolean;
    message: string;
    bookingId?: string;
    bookingNumber?: string;
    amountDue?: number;
    paymentDeadline?: string;
    paymentStatus?: string;
  }>(
    `/chat/conversations/${conversationId}/request-unlock`
  );
}

// ============================================
// MESSAGE ENDPOINTS
// ============================================

/**
 * Send a message in a conversation
 */
export async function sendMessage(
  conversationId: string,
  payload: SendMessagePayload
) {
  return apiClient.post<{ message: Message }>(
    `/chat/conversations/${conversationId}/messages`,
    payload
  );
}

/**
 * Get messages for a conversation
 */
export async function getMessages(
  conversationId: string,
  options: { page?: number; limit?: number } = {}
) {
  const { page = 1, limit = 50 } = options;
  return apiClient.get<MessagesResponse>(
    `/chat/conversations/${conversationId}/messages?page=${page}&limit=${limit}`
  );
}

/**
 * Search messages in a conversation
 */
export async function searchMessages(conversationId: string, query: string) {
  return apiClient.get<{ messages: Message[] }>(
    `/chat/conversations/${conversationId}/search?query=${encodeURIComponent(query)}`
  );
}

/**
 * Mark messages as read in a conversation
 */
export async function markMessagesAsRead(conversationId: string) {
  return apiClient.patch(`/chat/conversations/${conversationId}/read`);
}

/**
 * Delete a message
 */
export async function deleteMessage(messageId: string) {
  return apiClient.delete(`/chat/messages/${messageId}`);
}

// ============================================
// BLOCK/REPORT ENDPOINTS
// ============================================

/**
 * Block a user in a conversation
 */
export async function blockUser(conversationId: string, reason?: string) {
  return apiClient.post(`/chat/conversations/${conversationId}/block`, {
    reason,
  });
}

/**
 * Unblock a user in a conversation
 */
export async function unblockUser(conversationId: string) {
  return apiClient.delete(`/chat/conversations/${conversationId}/block`);
}

/**
 * Report a message
 */
export async function reportMessage(messageId: string, reason: string) {
  return apiClient.post(`/chat/messages/${messageId}/report`, { reason });
}

// ============================================
// UTILITY ENDPOINTS
// ============================================

/**
 * Get unread message count
 */
export async function getUnreadCount() {
  return apiClient.get<{ unreadCount: number }>("/chat/unread-count");
}

/**
 * Upload a file attachment
 */
export async function uploadAttachment(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  // Custom fetch for file upload
  const token = localStorage.getItem(AUTH_CONFIG.TOKEN_KEY);
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(
    `${API_CONFIG.BASE_URL}/chat/upload`,
    {
      method: "POST",
      credentials: "include",
      headers,
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error("Failed to upload file");
  }

  return response.json();
}

// ============================================
// REACTION ENDPOINTS
// ============================================

/**
 * Add a reaction to a message
 */
export async function addReaction(messageId: string, emoji: string) {
  return apiClient.post<{ message: Message }>(
    `/chat/messages/${messageId}/reactions`,
    { emoji }
  );
}

/**
 * Remove a reaction from a message
 */
export async function removeReaction(messageId: string, emoji: string) {
  return apiClient.delete(
    `/chat/messages/${messageId}/reactions?emoji=${encodeURIComponent(emoji)}`
  );
}

// ============================================
// PIN ENDPOINTS
// ============================================

/**
 * Toggle pin/unpin a message
 */
export async function togglePinMessage(messageId: string) {
  return apiClient.patch<{ message: Message }>(
    `/chat/messages/${messageId}/pin`
  );
}

/**
 * Get pinned messages for a conversation
 */
export async function getPinnedMessages(conversationId: string) {
  return apiClient.get<{ messages: Message[] }>(
    `/chat/conversations/${conversationId}/pinned`
  );
}

// ============================================
// LABEL / MUTE / ARCHIVE ENDPOINTS
// ============================================

/**
 * Set a label on a conversation
 */
export async function setConversationLabel(
  conversationId: string,
  label: string | null
) {
  return apiClient.patch(
    `/chat/conversations/${conversationId}/label`,
    { label }
  );
}

/**
 * Toggle mute on a conversation
 */
export async function toggleMuteConversation(conversationId: string) {
  return apiClient.patch(
    `/chat/conversations/${conversationId}/mute`
  );
}

/**
 * Archive a conversation
 */
export async function archiveConversation(conversationId: string) {
  return apiClient.patch(
    `/chat/conversations/${conversationId}/archive`
  );
}

/**
 * Unarchive/restore a conversation
 */
export async function unarchiveConversation(conversationId: string) {
  return apiClient.patch(
    `/chat/conversations/${conversationId}/unarchive`
  );
}

// ============================================
// DIRECT CONVERSATION ENDPOINTS
// ============================================

/**
 * Start or get a direct conversation with another user.
 * Backend enforces booking-linked eligibility before opening chat.
 */
export async function startDirectConversation(userId: string) {
  return apiClient.post<{ conversation: Conversation }>(
    "/chat/conversations/direct",
    {
      userId,
      participantId: userId,
    }
  );
}

// ============================================
// EXPORT ENDPOINTS
// ============================================

/**
 * Export conversation in various formats (txt, json)
 */
export async function exportConversation(
  conversationId: string,
  format: "txt" | "json" = "txt"
): Promise<Blob> {
  const token = localStorage.getItem(AUTH_CONFIG.TOKEN_KEY);
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(
    `${API_CONFIG.BASE_URL}/chat/conversations/${conversationId}/export?format=${format}`,
    {
      method: "GET",
      credentials: "include",
      headers,
    }
  );

  if (!response.ok) {
    throw new Error("Failed to export conversation");
  }

  return response.blob();
}

/**
 * Download chat export as a file
 */
export async function downloadChatExport(
  conversationId: string,
  format: "txt" | "json" = "txt",
  filename?: string
): Promise<void> {
  const blob = await exportConversation(conversationId, format);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || `chat_export.${format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================
// EXPORT SERVICE OBJECT
// ============================================

export const chatService = {
  // Conversations
  startConversation,
  startDirectConversation,
  getConversations,
  getConversationById,
  getConversationByBooking,

  // Chat Access Control
  getChatAccessStatus,
  requestChatUnlock,

  // Messages
  sendMessage,
  getMessages,
  searchMessages,
  markMessagesAsRead,
  markAsRead: markMessagesAsRead,
  deleteMessage,

  // Reactions
  addReaction,
  removeReaction,

  // Pin
  togglePinMessage,
  getPinnedMessages,

  // Label / Mute / Archive
  setConversationLabel,
  toggleMuteConversation,
  archiveConversation,
  unarchiveConversation,

  // Block/Report
  blockUser,
  unblockUser,
  reportMessage,

  // Export
  exportConversation,
  downloadChatExport,

  // Utilities
  getUnreadCount,
  uploadAttachment,
};

export default chatService;
