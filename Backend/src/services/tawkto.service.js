// ============================================
// TAWK.TO INTEGRATION SERVICE
// Customer support chat integration
// ============================================

import crypto from "crypto";
import User from "../models/user.model.js";
import Conversation from "../models/conversation.model.js";

// Tawk.to REST API base URL
const TAWKTO_API_BASE = "https://api.tawk.to/v3";

class TawkToService {
  constructor() {
    this.propertyId = process.env.TAWKTO_PROPERTY_ID;
    this.widgetId = process.env.TAWKTO_WIDGET_ID;
    this.apiKey = process.env.TAWKTO_API_KEY;
    this.secretKey = process.env.TAWKTO_SECRET_KEY;
  }

  /**
   * Generate secure visitor hash for tawk.to SSO
   * This ensures only authenticated users can use the chat widget
   * @param {string} email - User email
   * @returns {string} HMAC hash for visitor authentication
   */
  generateVisitorHash(email) {
    if (!this.secretKey) {
      console.warn("TAWKTO_SECRET_KEY not configured");
      return null;
    }

    return crypto
      .createHmac("sha256", this.secretKey)
      .update(email)
      .digest("hex");
  }

  /**
   * Get widget configuration for frontend
   * @param {Object} user - User object (optional, for authenticated users)
   * @returns {Object} Widget configuration
   */
  getWidgetConfig(user = null) {
    const config = {
      propertyId: this.propertyId,
      widgetId: this.widgetId,
      enabled: Boolean(this.propertyId && this.widgetId),
    };

    if (user && user.email) {
      config.visitor = {
        name: user.fullName || user.email.split("@")[0],
        email: user.email,
        hash: this.generateVisitorHash(user.email),
      };

      // Add custom attributes for support context
      config.attributes = {
        userId: user._id.toString(),
        role: user.role,
        accountStatus: user.status,
        createdAt: user.createdAt,
        phone: user.phone || "Not provided",
      };
    }

    return config;
  }

  /**
   * Set custom visitor attributes in tawk.to
   * Used to pass contextual information to support agents
   * @param {Object} user - User object
   * @param {Object} additionalData - Additional context data
   * @returns {Object} Attributes configuration
   */
  getVisitorAttributes(user, additionalData = {}) {
    const attributes = {
      // User info
      "User ID": user._id.toString(),
      "User Role": user.role,
      "Account Status": user.status,
      "Email Verified": user.isEmailVerified ? "Yes" : "No",
      "Phone Verified": user.isPhoneVerified ? "Yes" : "No",
      "Join Date": new Date(user.createdAt).toLocaleDateString(),

      // Additional context
      ...additionalData,
    };

    return attributes;
  }

  /**
   * Get support context for a locked chat conversation
   * Provides agents with relevant booking and payment info
   * @param {string} conversationId - Chat conversation ID
   * @param {string} userId - User ID requesting support
   * @returns {Object} Support context
   */
  async getLockedChatSupportContext(conversationId, userId) {
    try {
      const conversation = await Conversation.findById(conversationId)
        .populate("participants", "fullName email phone role")
        .populate("booking");

      if (!conversation) {
        return { error: "Conversation not found" };
      }

      const user = await User.findById(userId);

      const context = {
        conversationId: conversation._id.toString(),
        conversationStatus: conversation.status,
        accessReason: conversation.accessControl?.statusReason,
        participants: conversation.participants.map((p) => ({
          name: p.fullName,
          role: p.role,
          isRequester: p._id.toString() === userId,
        })),
      };

      if (conversation.booking) {
        context.booking = {
          id: conversation.booking._id.toString(),
          status: conversation.booking.status,
          paymentStatus: conversation.booking.paymentStatus,
          totalPrice: conversation.booking.totalPrice,
          createdAt: conversation.booking.createdAt,
        };
      }

      return {
        success: true,
        supportContext: context,
        visitorAttributes: this.getVisitorAttributes(user, {
          "Support Reason": "Locked Chat",
          "Conversation ID": conversationId,
          "Chat Status": conversation.status,
        }),
      };
    } catch (error) {
      console.error("Error getting locked chat support context:", error);
      return { error: error.message };
    }
  }

  /**
   * Log support interaction for analytics
   * @param {string} userId - User ID
   * @param {string} type - Interaction type
   * @param {Object} metadata - Additional metadata
   */
  async logSupportInteraction(userId, type, metadata = {}) {
    try {
      // Could be stored in a SupportLog model for analytics
      console.log(`[TawkTo] Support interaction logged:`, {
        userId,
        type,
        metadata,
        timestamp: new Date().toISOString(),
      });

      // In production, you might want to:
      // - Store in database for analytics
      // - Track in analytics service (Mixpanel, Amplitude, etc.)
      // - Send to monitoring service

      return { success: true };
    } catch (error) {
      console.error("Error logging support interaction:", error);
      return { error: error.message };
    }
  }

  /**
   * Handle webhook from tawk.to
   * Tawk.to can send events like chat started, ended, new message, etc.
   * @param {Object} payload - Webhook payload
   * @returns {Object} Processing result
   */
  async handleWebhook(payload) {
    try {
      const { event, message, visitor, chat } = payload;

      console.log(`[TawkTo] Webhook received: ${event}`, {
        chatId: chat?.id,
        visitorEmail: visitor?.email,
      });

      switch (event) {
        case "chat:start":
          await this.logSupportInteraction(visitor?.email, "chat_started", {
            chatId: chat?.id,
          });
          break;

        case "chat:end":
          await this.logSupportInteraction(visitor?.email, "chat_ended", {
            chatId: chat?.id,
            duration: chat?.duration,
          });
          break;

        case "ticket:create":
          await this.logSupportInteraction(visitor?.email, "ticket_created", {
            ticketId: payload.ticket?.id,
            subject: payload.ticket?.subject,
          });
          break;

        default:
          console.log(`[TawkTo] Unhandled webhook event: ${event}`);
      }

      return { success: true };
    } catch (error) {
      console.error("Error handling tawk.to webhook:", error);
      return { error: error.message };
    }
  }

  /**
   * Get quick support links for common issues
   * @returns {Array} Support links with descriptions
   */
  getSupportLinks() {
    return [
      {
        id: "payment_help",
        title: "Payment Issues",
        description: "Help with payments, refunds, or billing",
        icon: "credit-card",
      },
      {
        id: "booking_help",
        title: "Booking Help",
        description: "Questions about bookings or scheduling",
        icon: "calendar",
      },
      {
        id: "chat_unlock",
        title: "Unlock Chat",
        description: "Having trouble accessing a conversation",
        icon: "unlock",
      },
      {
        id: "report_user",
        title: "Report User",
        description: "Report inappropriate behavior",
        icon: "flag",
      },
      {
        id: "technical",
        title: "Technical Support",
        description: "App issues or technical problems",
        icon: "help-circle",
      },
    ];
  }
}

export default new TawkToService();
