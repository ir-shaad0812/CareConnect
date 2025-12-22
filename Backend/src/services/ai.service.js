// ============================================
// AI SERVICE
// AI runtime is intentionally disabled
// ============================================

import logger from '../utils/logger.js';
import { sanitizeMessageContent } from '../utils/sanitize.js';

class AIService {
  constructor() {
    this.isEnabled = false;
    this.conversationHistory = new Map();
    this.maxHistoryLength = 10;
  }

  async initialize() {
    this.isEnabled = false;
  }

  isAvailable() {
    return false;
  }

  addToHistory(conversationId, role, content) {
    let history = this.conversationHistory.get(conversationId) || [];
    history.push({ role, content, timestamp: new Date() });
    if (history.length > this.maxHistoryLength) {
      history = history.slice(-this.maxHistoryLength);
    }
    this.conversationHistory.set(conversationId, history);
  }

  clearHistory(conversationId) {
    this.conversationHistory.delete(conversationId);
  }

  async generateResponse(userMessage, conversationId, context = {}) {
    const sanitizedMessage = sanitizeMessageContent(userMessage);
    if (!sanitizedMessage?.trim()) {
      return {
        success: false,
        error: 'Empty message',
        message: 'Please provide a message.',
      };
    }

    logger.warn('AI request received while AI service is disabled', {
      conversationId,
      userId: context.userId,
    });

    return {
      success: false,
      error: 'AI disabled',
      message: 'AI assistance is currently disabled.',
    };
  }

  async getQuickSuggestions(userRole) {
    const suggestions = {
      careseeker: [
        'How do I book a caregiver?',
        'What services are available?',
        'How do payments work?',
        'How do I contact support?',
      ],
      caregiver: [
        'How do I manage my schedule?',
        'How do I get more bookings?',
        'How do payments work?',
        'How do I update my profile?',
      ],
      default: [
        'Tell me about CareConnect',
        'How do I get started?',
        'What services do you offer?',
        'How can I contact support?',
      ],
    };

    return suggestions[userRole] || suggestions.default;
  }
}

const aiService = new AIService();
export default aiService;
