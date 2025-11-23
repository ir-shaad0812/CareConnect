// ============================================
// OFFLINE MESSAGE QUEUE
// Handles message queueing when socket is disconnected
// ============================================

interface QueuedMessage {
  id: string;
  conversationId: string;
  content: string;
  type?: string;
  metadata?: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

const STORAGE_KEY = 'careconnect_message_queue';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

class OfflineMessageQueue {
  private queue: QueuedMessage[] = [];
  private processing = false;

  constructor() {
    this.loadFromStorage();
  }

  add(conversationId: string, content: string, type = 'text', metadata = {}) {
    const message: QueuedMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      conversationId,
      content,
      type,
      metadata,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: MAX_RETRIES,
    };

    this.queue.push(message);
    this.saveToStorage();
    return message.id;
  }

  getAll(): QueuedMessage[] {
    return [...this.queue];
  }

  getByConversation(conversationId: string): QueuedMessage[] {
    return this.queue.filter(msg => msg.conversationId === conversationId);
  }

  remove(messageId: string) {
    this.queue = this.queue.filter(msg => msg.id !== messageId);
    this.saveToStorage();
  }

  clear() {
    this.queue = [];
    this.saveToStorage();
  }

  async process(sendFunction: (msg: QueuedMessage) => Promise<boolean>) {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;
    const messagesToProcess = [...this.queue];
    
    for (const message of messagesToProcess) {
      try {
        const success = await sendFunction(message);
        
        if (success) {
          this.remove(message.id);
        } else {
          message.retryCount++;
          
          if (message.retryCount >= message.maxRetries) {
            this.remove(message.id);
          } else {
            const delay = RETRY_DELAY_MS * Math.pow(2, message.retryCount);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      } catch (error) {
        message.retryCount++;
        if (message.retryCount >= message.maxRetries) {
          this.remove(message.id);
        }
      }
    }

    this.saveToStorage();
    this.processing = false;
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        this.queue = this.queue.filter(msg => msg.timestamp > oneDayAgo);
      }
    } catch (error) {
      this.queue = [];
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save queue:', error);
    }
  }

  size(): number {
    return this.queue.length;
  }
}

export default OfflineMessageQueue;
export type { QueuedMessage };
