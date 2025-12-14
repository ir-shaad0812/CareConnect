// ============================================
// AI CONTROLLER - AI chatbot endpoints
// ============================================

import aiService from '../services/ai.service.js';
import logger from '../utils/logger.js';

const aiController = {
  /**
   * Generate AI chat response
   * POST /api/ai/chat
   */
  async chat(req, res) {
    try {
      const { message, conversationId } = req.body;
      const userId = req.user._id.toString();

      if (!message || !message.trim()) {
        return res.status(400).json({ error: 'Message is required' });
      }

      if (!conversationId) {
        return res.status(400).json({ error: 'Conversation ID is required' });
      }

      // Build context from user data
      const context = {
        userId,
        userName: req.user.fullName,
        userRole: req.user.role,
      };

      const result = await aiService.generateResponse(message, conversationId, context);

      if (!result.success) {
        return res.status(503).json({ 
          error: result.error, 
          message: result.message 
        });
      }

      res.json({
        success: true,
        message: result.message,
        duration: result.duration,
      });
    } catch (error) {
      logger.ai.error('AI chat endpoint error', error, { userId: req.user._id });
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to generate AI response' 
      });
    }
  },

  /**
   * Get quick suggestions based on user role
   * GET /api/ai/suggestions
   */
  async getSuggestions(req, res) {
    try {
      const userRole = req.user.role;
      const suggestions = await aiService.getQuickSuggestions(userRole);
      
      res.json({
        success: true,
        suggestions,
      });
    } catch (error) {
      logger.error('AI suggestions error', { error: error.message });
      res.status(500).json({ error: 'Failed to get suggestions' });
    }
  },

  /**
   * Clear conversation history
   * DELETE /api/ai/history/:conversationId
   */
  async clearHistory(req, res) {
    try {
      const { conversationId } = req.params;
      
      if (!conversationId) {
        return res.status(400).json({ error: 'Conversation ID is required' });
      }

      aiService.clearHistory(conversationId);
      
      res.json({
        success: true,
        message: 'Conversation history cleared',
      });
    } catch (error) {
      logger.error('Clear AI history error', { error: error.message });
      res.status(500).json({ error: 'Failed to clear history' });
    }
  },

  /**
   * Check AI service status
   * GET /api/ai/status
   */
  async getStatus(req, res) {
    try {
      const isAvailable = aiService.isAvailable();
      
      res.json({
        success: true,
        available: isAvailable,
        message: isAvailable 
          ? 'AI service is available' 
          : 'AI service is currently unavailable',
      });
    } catch (error) {
      logger.error('AI status error', { error: error.message });
      res.status(500).json({ error: 'Failed to check AI status' });
    }
  },
};

export default aiController;
