// ============================================
// WEBRTC SIGNALING SERVICE
// Peer-to-peer audio/video call management
// via Socket.IO as the signaling channel.
// No third-party call SDK required.
// ============================================

import Conversation from '../models/conversation.model.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';
import config from '../config/index.js';

// Active calls: callId → { callerId, recipientId, callType, conversationId, startedAt }
const activeCalls = new Map();

class WebRTCService {
  /**
   * Generate a unique call ID
   */
  generateCallId(conversationId, callType = 'video') {
    return `cc-${callType}-${conversationId}-${uuidv4().slice(0, 8)}`;
  }

  /**
   * Validate that the user belongs to the conversation and the
   * conversation's booking is in CONFIRMED / ACTIVE / IN_PROGRESS state.
   */
  async validateCallAccess(conversationId, userId) {
    const conversation = await Conversation.findById(conversationId)
      .populate('bookingId', 'status')
      .lean();

    if (!conversation) {
      return { allowed: false, error: 'Conversation not found' };
    }

    const isParticipant = conversation.participants.some(
      (p) => p.toString() === userId.toString(),
    );

    if (!isParticipant) {
      return { allowed: false, error: 'Not a participant in this conversation' };
    }

    // Allow calls when the backing booking is active
    const callableStatuses = ['confirmed', 'active', 'in_progress'];
    if (
      conversation.bookingId &&
      !callableStatuses.includes(conversation.bookingId.status)
    ) {
      return {
        allowed: false,
        error: 'Calls are only available for confirmed/active bookings',
      };
    }

    return { allowed: true, conversation };
  }

  /**
   * Register an active call
   */
  registerCall(callId, callerId, recipientId, callType, conversationId) {
    activeCalls.set(callId, {
      callerId: callerId.toString(),
      recipientId: recipientId.toString(),
      callType,
      conversationId: conversationId.toString(),
      startedAt: new Date(),
    });

    // Auto-cleanup after 4 hours
    setTimeout(() => activeCalls.delete(callId), 4 * 60 * 60 * 1000);
  }

  /**
   * Terminate an active call record
   */
  endCall(callId) {
    activeCalls.delete(callId);
  }

  /**
   * Get call metadata
   */
  getCall(callId) {
    return activeCalls.get(callId) || null;
  }

  /**
   * Get WebRTC configuration returned to the frontend.
   * STUN servers are always included; TURN is added when configured via env vars.
   */
  getWebRTCConfig() {
    const iceServers = [...(config.webrtc?.stunServers ?? [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ])];

    // Append TURN server if configured
    if (config.webrtc?.turnUrl) {
      const turn = { urls: config.webrtc.turnUrl };
      if (config.webrtc.turnUsername) turn.username = config.webrtc.turnUsername;
      if (config.webrtc.turnCredential) turn.credential = config.webrtc.turnCredential;
      iceServers.push(turn);
    }

    return { iceServers, iceCandidatePoolSize: 10 };
  }

  /**
   * Summarise service status for health checks
   */
  getStatus() {
    return {
      provider: 'webrtc',
      activeCalls: activeCalls.size,
      iceServers: this.getWebRTCConfig().iceServers.length,
    };
  }
}

export default new WebRTCService();
