// ============================================
// CHAT TYPES
// ============================================

export interface Message {
  id: string;
  _id?: string;
  conversationId: string;
  senderId: string;
  content: string;
  messageType: 'text' | 'image' | 'file' | 'system';
  attachments?: Attachment[];
  readBy: string[];
  createdAt: string;
}

export interface Attachment {
  url: string;
  name: string;
  type: string;
  size: number;
}

export interface Conversation {
  id: string;
  _id?: string;
  participants: string[];
  lastMessage?: Message;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SendMessageData {
  conversationId: string;
  content: string;
  messageType?: 'text' | 'image' | 'file';
}
