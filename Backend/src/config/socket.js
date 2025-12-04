// ============================================
// SOCKET.IO CONFIGURATION
// Real-time communication setup
// ============================================

import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import IORedis from "ioredis";
import jwt from "jsonwebtoken";
import config from "./index.js";
import redisConnection from "./redis.js";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import Conversation from "../models/conversation.model.js";
import chatService from "../services/chat.service.js";
import chatAccessService from "../services/chatAccess.service.js";
import {
  SOCKET_EVENTS,
  MESSAGE_STATUS,
  CONVERSATION_STATUS,
} from "../constants/chat.constants.js";
import logger from "../utils/logger.js";
import { sanitizeMessageContent, isValidObjectId } from "../utils/sanitize.js";

// Store for online users and their socket IDs
const onlineUsers = new Map();
// Store for user typing status
const typingUsers = new Map();
// Store for active WebRTC call sessions
const activeWebRTCCalls = new Map();

const setActiveWebRTCCall = ({
  callId,
  callerId,
  recipientId,
  conversationId,
  callType,
}) => {
  if (!callId || !callerId || !recipientId) return;

  activeWebRTCCalls.set(String(callId), {
    callId: String(callId),
    callerId: String(callerId),
    recipientId: String(recipientId),
    conversationId: conversationId ? String(conversationId) : null,
    callType: callType || "audio",
    createdAt: new Date(),
  });
};

const getActiveWebRTCCall = (callId) => {
  if (!callId) return null;
  return activeWebRTCCalls.get(String(callId)) || null;
};

const clearActiveWebRTCCall = (callId) => {
  if (!callId) return;
  activeWebRTCCalls.delete(String(callId));
};

const parseCookieHeader = (cookieHeader = "") => {
  if (typeof cookieHeader !== "string" || cookieHeader.length === 0) {
    return {};
  }

  return cookieHeader.split(";").reduce((acc, part) => {
    const separatorIndex = part.indexOf("=");
    if (separatorIndex <= 0) return acc;

    const key = part.slice(0, separatorIndex).trim();
    const rawValue = part.slice(separatorIndex + 1).trim();
    if (!key) return acc;

    try {
      acc[key] = decodeURIComponent(rawValue);
    } catch {
      acc[key] = rawValue;
    }

    return acc;
  }, {});
};

const extractSocketToken = (socket) => {
  const authToken = socket.handshake?.auth?.token;
  if (typeof authToken === "string" && authToken.trim().length > 0) {
    return authToken.trim();
  }

  const authHeader = socket.handshake?.headers?.authorization;
  if (typeof authHeader === "string") {
    const parts = authHeader.split(" ");
    if (parts.length === 2 && /^Bearer$/i.test(parts[0]) && parts[1]) {
      return parts[1].trim();
    }
  }

  const cookies = parseCookieHeader(socket.handshake?.headers?.cookie);
  const cookieToken = cookies.accessToken;
  if (typeof cookieToken === "string" && cookieToken.trim().length > 0) {
    return cookieToken.trim();
  }

  return null;
};

// ============================================
// SOCKET EVENT RATE LIMITER
// Prevents DoS via socket event flooding.
// Per-socket, per-event sliding window counter.
// ============================================
const socketRateLimits = new Map(); // socketId → Map<event, { count, resetAt }>

const RATE_LIMITS = {
  send_message:     { max: 20,  windowMs: 10_000 },  // 20 msg/10s
  typing_start:     { max: 10,  windowMs: 5_000  },
  add_reaction:     { max: 30,  windowMs: 10_000 },
  remove_reaction:  { max: 30,  windowMs: 10_000 },
  toggle_pin:       { max: 10,  windowMs: 10_000 },
  join_conversation:{ max: 10,  windowMs: 10_000 },
  "location:update":{ max: 60,  windowMs: 60_000 },  // 1/s max GPS updates
  DEFAULT:          { max: 100, windowMs: 10_000 },
};

function checkRateLimit(socketId, event) {
  const rule = RATE_LIMITS[event] || RATE_LIMITS.DEFAULT;
  const now = Date.now();

  if (!socketRateLimits.has(socketId)) {
    socketRateLimits.set(socketId, new Map());
  }
  const evtMap = socketRateLimits.get(socketId);

  let entry = evtMap.get(event);
  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + rule.windowMs };
    evtMap.set(event, entry);
  }

  entry.count++;
  return entry.count <= rule.max;
}

function clearSocketRateLimit(socketId) {
  socketRateLimits.delete(socketId);
}

/**
 * Wrap a socket event handler with rate-limit enforcement.
 * Returns a wrapped handler that silently drops excess events.
 */
function withRateLimit(socket, event, handler) {
  return function rateLimitedHandler(...args) {
    if (!checkRateLimit(socket.id, event)) {
      logger.warn(`[Socket] Rate limit hit: ${event} by ${socket.user?._id}`);
      socket.emit(SOCKET_EVENTS.CHAT_ERROR, {
        message: "You are sending events too fast. Please slow down.",
        code: "RATE_LIMITED",
        event,
      });
      return;
    }
    handler(...args);
  };
}

const emitToPresenceSockets = (io, presenceEntry, event, payload) => {
  if (!presenceEntry?.socketIds || presenceEntry.socketIds.size === 0) {
    return false;
  }

  presenceEntry.socketIds.forEach((socketId) => {
    io.to(socketId).emit(event, payload);
  });

  return true;
};

/**
 * Initialize Socket.io server
 */
export const initializeSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: config.frontendUrl,
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  if (config.redis?.enabled) {
    try {
      const pubClient = new IORedis(redisConnection);
      const subClient = new IORedis(redisConnection);

      pubClient.on("error", (error) => {
        logger.socket.error("Socket Redis pub client error", error);
      });

      subClient.on("error", (error) => {
        logger.socket.error("Socket Redis sub client error", error);
      });

      io.adapter(createAdapter(pubClient, subClient));
      logger.info("[Socket] Redis adapter enabled for multi-instance sync");
    } catch (error) {
      logger.error("[Socket] Failed to initialize Redis adapter", error);
    }
  }

  // Authentication middleware for socket connections
  io.use(async (socket, next) => {
    try {
      const token = extractSocketToken(socket);

      if (!token) {
        return next(new Error("Authentication required"));
      }

      // Verify JWT
      const decoded = jwt.verify(token, config.jwt.accessSecret);

      // Validate token type - only access tokens for websocket
      if (decoded.type !== "access") {
        return next(new Error("Invalid token type"));
      }

      if (!decoded.userId) {
        return next(new Error("Invalid token payload"));
      }

      // Fetch user
      const user = await User.findById(decoded.userId)
        .select(
          "_id fullName avatar role status isProfileComplete completionPercentage",
        )
        .lean();

      if (!user) {
        return next(new Error("User not found"));
      }

      const BLOCKED_STATUSES = ["suspended", "rejected", "deleted"];
      if (BLOCKED_STATUSES.includes(user.status)) {
        return next(
          new Error(`Account is ${user.status}. Please contact support.`),
        );
      }

      socket.user = user;
      next();
    } catch (error) {
      if (error.name === "JsonWebTokenError") {
        return next(new Error("Invalid token"));
      }
      if (error.name === "TokenExpiredError") {
        return next(new Error("Token expired"));
      }
      logger.socket.error("Socket authentication error", error);
      next(new Error("Authentication failed"));
    }
  });

  // Connection handler
  io.on("connection", (socket) => {
    const userId = socket.user._id.toString();
    logger.socket.connected(userId, socket.id);

    // Add or update online presence for this user.
    const existingPresence = onlineUsers.get(userId);
    const wasOffline = !existingPresence;

    if (existingPresence) {
      existingPresence.socketIds.add(socket.id);
      existingPresence.user = socket.user;
      existingPresence.lastConnectedAt = new Date();
    } else {
      onlineUsers.set(userId, {
        socketIds: new Set([socket.id]),
        user: socket.user,
        connectedAt: new Date(),
        lastConnectedAt: new Date(),
      });
    }

    if (wasOffline) {
      // Broadcast online status only when user transitions offline -> online.
      broadcastOnlineStatus(io, userId, true);
    }

    // Per-socket rate limiting middleware — wraps all subsequent event handlers
    const _originalOn = socket.on.bind(socket);
    socket.on = function rateLimitedOn(event, handler) {
      const systemEvents = ["connect", "disconnect", "error", "connect_error",
        "map:subscribe", "map:unsubscribe", "get_online_users",
        "join_booking_room", "leave_booking_room",
        "subscribe_caregiver_availability", "unsubscribe_caregiver_availability",
        "location:request_caregiver",
      ];
      if (systemEvents.includes(event) || typeof handler !== "function") {
        return _originalOn(event, handler);
      }
      return _originalOn(event, withRateLimit(socket, event, handler));
    };

    // ============================================
    // JOIN/LEAVE CONVERSATION
    // ============================================

    socket.on(SOCKET_EVENTS.JOIN_CONVERSATION, async (conversationId) => {
      try {
        // Validate conversation ID format
        if (
          !conversationId ||
          typeof conversationId !== "string" ||
          !isValidObjectId(conversationId)
        ) {
          return socket.emit(SOCKET_EVENTS.CHAT_ERROR, {
            message: "Invalid conversation ID",
            code: "INVALID_ID",
          });
        }

        // Verify user is participant
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
          return socket.emit(SOCKET_EVENTS.CHAT_ERROR, {
            message: "Conversation not found",
            code: "NOT_FOUND",
          });
        }
        const isParticipant = conversation.participants.some(
          (p) => p.toString() === userId,
        );

        if (!isParticipant) {
          return socket.emit(SOCKET_EVENTS.CHAT_ERROR, {
            message: "Not authorized",
            code: "UNAUTHORIZED",
          });
        }

        // Join the conversation room
        socket.join(conversationId);
        logger.socket.joinedRoom(userId, conversationId);

        // Mark messages as delivered
        await Message.markAsDelivered(conversationId, userId);

        // Notify other participant that messages are delivered
        socket.to(conversationId).emit(SOCKET_EVENTS.MESSAGE_DELIVERED, {
          conversationId,
          userId,
        });
      } catch (error) {
        logger.socket.error("Join conversation error", error, {
          conversationId,
          userId,
        });
        socket.emit(SOCKET_EVENTS.CHAT_ERROR, {
          message: "Failed to join conversation",
          code: "JOIN_ERROR",
        });
      }
    });

    socket.on(SOCKET_EVENTS.LEAVE_CONVERSATION, (conversationId) => {
      if (!conversationId || !isValidObjectId(conversationId)) return;

      socket.leave(conversationId);
      logger.socket.leftRoom(userId, conversationId);

      // Clear typing status
      const typingKey = `${conversationId}:${userId}`;
      if (typingUsers.has(typingKey)) {
        typingUsers.delete(typingKey);
        socket.to(conversationId).emit(SOCKET_EVENTS.USER_TYPING, {
          conversationId,
          userId,
          isTyping: false,
        });
      }
    });

    // ============================================
    // MESSAGING
    // ============================================

    socket.on(SOCKET_EVENTS.SEND_MESSAGE, async (data) => {
      try {
        const { conversationId, content, messageType, attachments, tempId } =
          data;

        // Validate conversation ID
        if (!conversationId || !isValidObjectId(conversationId)) {
          return socket.emit(SOCKET_EVENTS.MESSAGE_FAILED, {
            tempId,
            conversationId,
            error: "Invalid conversation ID",
            errorCode: "INVALID_ID",
          });
        }

        // Sanitize message content to prevent XSS
        const sanitizedContent = sanitizeMessageContent(content);

        // Use chat service to send message (includes access control validation)
        const message = await chatService.sendMessage(conversationId, userId, {
          content: sanitizedContent,
          messageType: messageType || "text",
          attachments,
        });

        logger.chat.messageSent(conversationId, userId, message._id);

        // Emit to all participants in the conversation
        // Include tempId for optimistic UI reconciliation on frontend
        io.to(conversationId).emit(SOCKET_EVENTS.NEW_MESSAGE, {
          message,
          conversationId,
          tempId, // Frontend uses this to replace optimistic message
        });

        // Clear typing status
        const typingKey = `${conversationId}:${userId}`;
        if (typingUsers.has(typingKey)) {
          typingUsers.delete(typingKey);
          socket.to(conversationId).emit(SOCKET_EVENTS.USER_TYPING, {
            conversationId,
            userId,
            isTyping: false,
          });
        }
      } catch (error) {
        logger.chat.error("Send message error", error, {
          userId,
          conversationId: data?.conversationId,
        });

        // If chat becomes restricted/closed, push status change in real-time.
        if (
          data?.conversationId &&
          ["CHAT_LOCKED", "CHAT_RESTRICTED", "CHAT_CLOSED"].includes(
            error?.code,
          )
        ) {
          try {
            const latestConversation = await Conversation.findById(
              data.conversationId,
            )
              .select("status metadata accessControl")
              .lean();

            if (latestConversation) {
              io.to(data.conversationId).emit(SOCKET_EVENTS.CHAT_STATUS_CHANGED, {
                conversationId: data.conversationId,
                status: latestConversation.status,
                reason:
                  latestConversation.accessControl?.statusReason ||
                  error.code.toLowerCase(),
                message:
                  latestConversation.metadata?.disabledReason || error.message,
                timestamp: new Date(),
              });
            }
          } catch (statusEmitError) {
            logger.chat.error("Failed to emit chat status change", statusEmitError, {
              conversationId: data?.conversationId,
            });
          }
        }

        // Emit message_failed event with tempId for frontend to mark message as failed
        socket.emit(SOCKET_EVENTS.MESSAGE_FAILED, {
          tempId: data?.tempId,
          conversationId: data?.conversationId,
          error: error.message,
          errorCode: error.code || "SEND_FAILED",
        });
      }
    });

    // ============================================
    // MESSAGE READ STATUS
    // ============================================

    socket.on(SOCKET_EVENTS.MESSAGE_READ, async (data) => {
      try {
        const { conversationId } = data;

        // Mark messages as read
        await chatService.markMessagesAsRead(conversationId, userId);

        // Notify other participant
        socket.to(conversationId).emit(SOCKET_EVENTS.MESSAGES_READ, {
          conversationId,
          userId,
          readAt: new Date(),
        });
      } catch (error) {
        logger.chat.error("Mark read error", error, {
          userId,
          conversationId: data?.conversationId,
        });
      }
    });

    // ============================================
    // TYPING INDICATORS
    // ============================================

    socket.on(SOCKET_EVENTS.TYPING_START, (data) => {
      if (!data?.conversationId) return;

      const { conversationId } = data;
      const typingKey = `${conversationId}:${userId}`;

      if (!typingUsers.has(typingKey)) {
        typingUsers.set(typingKey, {
          timeout: setTimeout(() => {
            typingUsers.delete(typingKey);
            socket.to(conversationId).emit(SOCKET_EVENTS.USER_TYPING, {
              conversationId,
              userId,
              user: socket.user,
              isTyping: false,
            });
          }, 5000), // Auto-clear after 5 seconds
        });

        socket.to(conversationId).emit(SOCKET_EVENTS.USER_TYPING, {
          conversationId,
          userId,
          user: socket.user,
          isTyping: true,
        });
      }
    });

    socket.on(SOCKET_EVENTS.TYPING_STOP, (data) => {
      if (!data?.conversationId) return;

      const { conversationId } = data;
      const typingKey = `${conversationId}:${userId}`;
      if (typingUsers.has(typingKey)) {
        clearTimeout(typingUsers.get(typingKey).timeout);
        typingUsers.delete(typingKey);
        socket.to(conversationId).emit(SOCKET_EVENTS.USER_TYPING, {
          conversationId,
          userId,
          user: socket.user,
          isTyping: false,
        });
      }
    });

    // ============================================
    // REACTIONS & PIN EVENTS
    // ============================================

    socket.on(SOCKET_EVENTS.ADD_REACTION, async (data) => {
      try {
        const { messageId, emoji, conversationId } = data;
        if (!messageId || !emoji) return;

        const message = await chatService.addReaction(
          messageId,
          userId,
          socket.user?.fullName || "User",
          emoji,
        );
        // Broadcast to the conversation room
        io.to(conversationId || message.conversationId?.toString()).emit(
          SOCKET_EVENTS.REACTION_UPDATED,
          {
            messageId,
            reactions: message.reactions,
          },
        );
      } catch (error) {
        logger.chat.error("Add reaction error", error, { userId });
      }
    });

    socket.on(SOCKET_EVENTS.REMOVE_REACTION, async (data) => {
      try {
        const { messageId, emoji, conversationId } = data;
        if (!messageId || !emoji) return;

        const message = await chatService.removeReaction(
          messageId,
          userId,
          emoji,
        );
        io.to(conversationId || message.conversationId?.toString()).emit(
          SOCKET_EVENTS.REACTION_UPDATED,
          {
            messageId,
            reactions: message.reactions,
          },
        );
      } catch (error) {
        logger.chat.error("Remove reaction error", error, { userId });
      }
    });

    socket.on(SOCKET_EVENTS.TOGGLE_PIN, async (data) => {
      try {
        const { messageId, conversationId } = data;
        if (!messageId) return;

        const message = await chatService.togglePinMessage(messageId, userId);
        io.to(conversationId || message.conversationId?.toString()).emit(
          SOCKET_EVENTS.MESSAGE_PINNED,
          {
            messageId,
            pinned: message.pinned,
          },
        );
      } catch (error) {
        logger.chat.error("Toggle pin error", error, { userId });
      }
    });

    // ============================================
    // ONLINE STATUS
    // ============================================

    socket.on(SOCKET_EVENTS.GET_ONLINE_USERS, (userIds) => {
      if (!Array.isArray(userIds)) return;
      const onlineStatus = {};
      userIds.forEach((id) => {
        if (typeof id === "string") {
          onlineStatus[id] = onlineUsers.has(id);
        }
      });
      socket.emit("online_users_status", onlineStatus);
    });

    // ============================================
    // CHAT STATUS SUBSCRIPTION
    // ============================================

    socket.on(SOCKET_EVENTS.SUBSCRIBE_CHAT_STATUS, async (conversationId) => {
      try {
        if (!conversationId || !isValidObjectId(conversationId)) return;

        // Verify user is participant
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return;

        const isParticipant = conversation.participants.some(
          (p) => p.toString() === userId,
        );
        if (!isParticipant) return;

        // Join a room for chat status updates
        socket.join(`chat_status_${conversationId}`);
        logger.debug("User subscribed to chat status", {
          userId,
          conversationId,
        });
      } catch (error) {
        logger.socket.error("Subscribe chat status error", error, {
          userId,
          conversationId,
        });
      }
    });

    // ============================================
    // WEBRTC SIGNALING
    // Pure peer-to-peer signaling relay.
    // Stream.io has been removed — the server
    // acts only as a SDP/ICE relay between peers.
    // ============================================

    /**
     * Caller sends offer → relay to recipient
     * payload: { callId, callType, conversationId, recipientId,
     *            callerName, callerAvatar, sdp }
     */
    socket.on("webrtc:call_offer", async (data) => {
      try {
        const { conversationId, recipientId, callId, callType, sdp } = data;
        if (!conversationId || !recipientId || !sdp) {
          return socket.emit(SOCKET_EVENTS.CHAT_ERROR, {
            message: "Invalid call request",
            code: "CALL_INVALID_PAYLOAD",
          });
        }

        // Guard: chat must be accessible for calls
        const canCallResult = await chatAccessService.canMakeCall(
          conversationId,
          userId,
        );
        if (!canCallResult.canCall) {
          // Notify participants so open chat UIs can switch to read-only immediately.
          const latestConversation = await Conversation.findById(conversationId)
            .select("status metadata accessControl")
            .lean();

          if (latestConversation) {
            io.to(conversationId).emit(SOCKET_EVENTS.CHAT_STATUS_CHANGED, {
              conversationId,
              status: latestConversation.status,
              reason:
                latestConversation.accessControl?.statusReason ||
                canCallResult.reason ||
                "call_not_allowed",
              message:
                latestConversation.metadata?.disabledReason ||
                canCallResult.error ||
                "Calls are not allowed in this conversation.",
              timestamp: new Date(),
            });
          }

          return socket.emit(SOCKET_EVENTS.CHAT_ERROR, {
            message: canCallResult.error,
            code: "CALL_NOT_ALLOWED",
          });
        }

        const recipientEntry = onlineUsers.get(recipientId.toString());
        if (!recipientEntry || recipientEntry.socketIds.size === 0) {
          return socket.emit("webrtc:call_busy", {
            callId,
            reason: "User is offline",
          });
        }

        logger.call?.initiated?.(userId, recipientId, callType);

        setActiveWebRTCCall({
          callId,
          callerId: userId,
          recipientId,
          conversationId,
          callType,
        });

        emitToPresenceSockets(io, recipientEntry, "webrtc:call_offer", {
          callId,
          callType,
          conversationId,
          callerId: userId,
          callerName: socket.user.fullName,
          callerAvatar: socket.user.avatar,
          sdp,
        });
      } catch (error) {
        logger.socket?.error?.("webrtc:call_offer error", error, { userId });
        socket.emit(SOCKET_EVENTS.CHAT_ERROR, {
          message: "Call offer failed",
          code: "CALL_ERROR",
        });
      }
    });

    /**
     * Callee sends answer → relay back to caller
     * payload: { callId, callerId, sdp, acceptedByName }
     */
    socket.on("webrtc:call_answer", (data) => {
      const { callId, callerId: callerIdFromPayload, sdp } = data || {};
      if (!callId || !sdp) return;

      const callSession = getActiveWebRTCCall(callId);
      const callerId = callSession?.callerId || callerIdFromPayload;
      if (!callerId) return;

      // Only the intended callee can answer this call.
      if (callSession && callSession.recipientId !== userId) {
        socket.emit(SOCKET_EVENTS.CHAT_ERROR, {
          message: "You are not allowed to answer this call",
          code: "CALL_NOT_ALLOWED",
        });
        return;
      }

      const callerEntry = onlineUsers.get(callerId.toString());
      if (callerEntry) {
        logger.call?.accepted?.(callId, userId);
        emitToPresenceSockets(io, callerEntry, "webrtc:call_answer", {
          callId,
          sdp,
          acceptedBy: userId,
          acceptedByName: socket.user.fullName,
        });
      }
    });

    /**
     * ICE candidate trickle — relay to the target peer
     * payload: { callId, targetId, candidate }
     */
    socket.on("webrtc:ice_candidate", (data) => {
      const { targetId: targetIdFromPayload, candidate, callId } = data || {};
      if (!candidate) return;

      const callSession = getActiveWebRTCCall(callId);
      if (callSession) {
        const isParticipant =
          callSession.callerId === userId || callSession.recipientId === userId;
        if (!isParticipant) return;
      }

      let targetId = targetIdFromPayload;
      if ((!targetId || typeof targetId !== "string") && callSession) {
        targetId =
          callSession.callerId === userId
            ? callSession.recipientId
            : callSession.callerId;
      }

      if (!targetId) return;

      if (
        callSession &&
        callSession.callerId !== targetId.toString() &&
        callSession.recipientId !== targetId.toString()
      ) {
        targetId =
          callSession.callerId === userId
            ? callSession.recipientId
            : callSession.callerId;
      }

      const targetEntry = onlineUsers.get(targetId.toString());
      if (targetEntry) {
        emitToPresenceSockets(io, targetEntry, "webrtc:ice_candidate", {
          callId,
          candidate,
          from: userId,
        });
      }
    });

    /**
     * Callee declines incoming call
     * payload: { callId, callerId }
     */
    socket.on("webrtc:call_decline", (data) => {
      const { callId, callerId: callerIdFromPayload } = data || {};
      if (!callId) return;

      const callSession = getActiveWebRTCCall(callId);
      const callerId = callSession?.callerId || callerIdFromPayload;
      if (!callerId) return;

      if (
        callSession &&
        callSession.callerId !== userId &&
        callSession.recipientId !== userId
      ) {
        return;
      }

      const callerEntry = onlineUsers.get(callerId.toString());
      if (callerEntry) {
        logger.call?.declined?.(callId, userId);
        emitToPresenceSockets(io, callerEntry, "webrtc:call_declined", {
          callId,
          declinedBy: userId,
          declinedByName: socket.user.fullName,
        });
      }

      clearActiveWebRTCCall(callId);
    });

    /**
     * Either peer ends an active call
     * payload: { callId, recipientId }
     */
    socket.on("webrtc:call_end", (data) => {
      const { callId, recipientId: recipientIdFromPayload } = data || {};
      if (!callId) return;

      const callSession = getActiveWebRTCCall(callId);
      if (
        callSession &&
        callSession.callerId !== userId &&
        callSession.recipientId !== userId
      ) {
        return;
      }

      let recipientId = recipientIdFromPayload;
      if ((!recipientId || typeof recipientId !== "string") && callSession) {
        recipientId =
          callSession.callerId === userId
            ? callSession.recipientId
            : callSession.callerId;
      }

      if (!recipientId) {
        clearActiveWebRTCCall(callId);
        return;
      }

      logger.call?.ended?.(callId, userId);
      const recipientEntry = onlineUsers.get(recipientId.toString());
      if (recipientEntry) {
        emitToPresenceSockets(io, recipientEntry, "webrtc:call_ended", {
          callId,
          endedBy: userId,
        });
      }

      clearActiveWebRTCCall(callId);
    });

    // ============================================
    // AVAILABILITY SUBSCRIPTIONS
    // ============================================

    // Subscribe to a caregiver's availability updates (for booking page)
    socket.on("subscribe_caregiver_availability", (caregiverId) => {
      if (
        !caregiverId ||
        typeof caregiverId !== "string" ||
        !isValidObjectId(caregiverId)
      )
        return;

      socket.join(`caregiver_availability_${caregiverId}`);
      logger.debug("User subscribed to availability", { userId, caregiverId });
    });

    // Unsubscribe from caregiver's availability updates
    socket.on("unsubscribe_caregiver_availability", (caregiverId) => {
      if (!caregiverId || typeof caregiverId !== "string") return;

      socket.leave(`caregiver_availability_${caregiverId}`);
      logger.debug("User unsubscribed from availability", {
        userId,
        caregiverId,
      });
    });

    // ── Booking location tracking rooms ───────────────────────────────────────
    socket.on("join_booking_room", (bookingId) => {
      if (
        !bookingId ||
        typeof bookingId !== "string" ||
        !isValidObjectId(bookingId)
      )
        return;
      socket.join(`booking_${bookingId}`);
      socket.join(`booking:${bookingId}`);
    });

    socket.on("leave_booking_room", (bookingId) => {
      if (!bookingId || typeof bookingId !== "string") return;
      socket.leave(`booking_${bookingId}`);
      socket.leave(`booking:${bookingId}`);
    });

    // Join user's personal notification room
    socket.join(`user_${userId}`);
    socket.join(`user:${userId}`);

    if (socket.user?.role === "admin") {
      socket.join("admin:global");
    }

    // ============================================
    // LOCATION TRACKING (Real-time Map)
    // ============================================

    // Caregiver broadcasts their live location
    socket.on("location:update", async ({ lat, lng, accuracy, bookingId }) => {
      if (!lat || !lng || socket.user?.role !== "caregiver") return;

      const locationPayload = {
        userId,
        caregiverId: userId,
        userType: "caregiver",
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        accuracy: accuracy || null,
        bookingId: bookingId || null,
        timestamp: new Date(),
      };

      // Broadcast to admin map room
      io.to("admin:map").emit("location:caregiver_moved", locationPayload);

      // If there's an active booking, notify the care-seeker
      if (bookingId) {
        // Notify the booking room
        io.to(`booking:${bookingId}`).emit(
          "location:caregiver_live",
          locationPayload,
        );
      }
    });

    // Subscribe/unsubscribe to map updates (Admin)
    socket.on("map:subscribe", () => {
      socket.join("admin:map");
    });

    socket.on("map:unsubscribe", () => {
      socket.leave("admin:map");
    });

    // Care-seeker requests caregiver location for active booking
    socket.on("location:request_caregiver", ({ bookingId, caregiverId }) => {
      if (!bookingId || !caregiverId) return;
      // Request caregiver to share location
      const caregiverEntry = onlineUsers.get(caregiverId.toString());
      if (caregiverEntry) {
        emitToPresenceSockets(io, caregiverEntry, "location:share_request", {
          bookingId,
          requestedBy: userId,
        });
      }
    });

    // ============================================
    // DISCONNECT
    // ============================================

    socket.on("disconnect", (reason) => {
      logger.socket.disconnected(userId, socket.id, reason);

      // Remove only this socket; keep user online while any sockets remain.
      const presenceEntry = onlineUsers.get(userId);
      let wentOffline = false;

      if (presenceEntry) {
        presenceEntry.socketIds.delete(socket.id);
        if (presenceEntry.socketIds.size === 0) {
          onlineUsers.delete(userId);
          wentOffline = true;
        }
      }

      // Clear rate limit counters for this socket
      clearSocketRateLimit(socket.id);

      // Clear all typing statuses for this user
      for (const [key, value] of typingUsers.entries()) {
        if (key.endsWith(`:${userId}`)) {
          clearTimeout(value.timeout);
          typingUsers.delete(key);
          const conversationId = key.split(":")[0];
          io.to(conversationId).emit(SOCKET_EVENTS.USER_TYPING, {
            conversationId,
            userId,
            isTyping: false,
          });
        }
      }

      if (wentOffline) {
        // End any active call sessions involving this user.
        const sessionsToEnd = [];
        for (const [callId, session] of activeWebRTCCalls.entries()) {
          if (session.callerId === userId || session.recipientId === userId) {
            sessionsToEnd.push({ callId, session });
          }
        }

        sessionsToEnd.forEach(({ callId, session }) => {
          const peerId =
            session.callerId === userId ? session.recipientId : session.callerId;
          const peerEntry = onlineUsers.get(peerId);

          if (peerEntry) {
            emitToPresenceSockets(io, peerEntry, "webrtc:call_ended", {
              callId,
              endedBy: userId,
              reason: "peer_disconnected",
            });
          }

          activeWebRTCCalls.delete(callId);
        });

        broadcastOnlineStatus(io, userId, false);
      }
    });

    // ============================================
    // ERROR HANDLING
    // ============================================

    socket.on("error", (error) => {
      logger.socket.error("Socket error", error, {
        userId,
        socketId: socket.id,
      });
    });
  });

  return io;
};

/**
 * Broadcast user online/offline status to their contacts
 */
const broadcastOnlineStatus = async (io, userId, isOnline) => {
  try {
    // Get user's conversations to find their contacts
    const conversations = await Conversation.find({
      participants: userId,
      status: "active",
    }).select("participants");

    // Get unique participant IDs
    const contactIds = new Set();
    conversations.forEach((conv) => {
      conv.participants.forEach((p) => {
        if (p.toString() !== userId) {
          contactIds.add(p.toString());
        }
      });
    });

    // Notify online contacts about status change
    contactIds.forEach((contactId) => {
      const contact = onlineUsers.get(contactId);
      if (contact) {
        emitToPresenceSockets(
          io,
          contact,
          isOnline ? SOCKET_EVENTS.USER_ONLINE : SOCKET_EVENTS.USER_OFFLINE,
          { userId, isOnline },
        );
      }
    });

    logger.debug("Broadcast online status", {
      userId,
      isOnline,
      contactCount: contactIds.size,
    });
  } catch (error) {
    logger.error("Error broadcasting online status", error, {
      userId,
      isOnline,
    });
  }
};

/**
 * Emit a real-time notification to a specific user's room
 * Called by notificationService after persisting to DB
 */
export const emitNotification = (io, userId, notification) => {
  io.to(`user_${userId.toString()}`).emit("notification:new", notification);
  io.to(`user:${userId.toString()}`).emit("notification:new", notification);
};

/**
 * Get online users map (for external use)
 */
export const getOnlineUsers = () => onlineUsers;

/**
 * Check if a specific user is online
 */
export const isUserOnline = (userId) => onlineUsers.has(userId.toString());

/**
 * Send notification to specific user via socket
 */
export const sendToUser = (io, userId, event, data) => {
  const userIdStr = userId.toString();
  io.to(`user_${userIdStr}`).emit(event, data);
  io.to(`user:${userIdStr}`).emit(event, data);
  return onlineUsers.has(userIdStr);
};

/**
 * Emit chat status change to all subscribers of a conversation
 */
export const emitChatStatusChange = (
  io,
  conversationId,
  status,
  reason,
  message = "",
) => {
  io.to(`chat_status_${conversationId}`).emit(
    SOCKET_EVENTS.CHAT_STATUS_CHANGED || "chat_status_changed",
    {
      conversationId,
      status,
      reason,
      message,
      timestamp: new Date(),
    },
  );
  // Also emit to the conversation room itself
  io.to(conversationId).emit(
    SOCKET_EVENTS.CHAT_STATUS_CHANGED || "chat_status_changed",
    {
      conversationId,
      status,
      reason,
      message,
      timestamp: new Date(),
    },
  );
};

// ============================================
// AVAILABILITY SOCKET EVENTS
// ============================================

/**
 * Emit availability update to users watching a caregiver's availability
 */
export const emitAvailabilityUpdated = (io, caregiverId, changes) => {
  io.to(`caregiver_availability_${caregiverId}`).emit("availability_updated", {
    caregiverId,
    changes,
    timestamp: new Date(),
  });
};

/**
 * Emit when a booking is reserved (slot temporarily held)
 */
export const emitBookingReserved = (io, booking) => {
  // Notify caregiver
  sendToUser(io, booking.caregiverId.toString(), "booking_reserved", {
    bookingId: booking._id,
    bookingNumber: booking.bookingNumber,
    schedule: booking.schedule,
    expiresAt: booking.reservationExpiry,
  });

  // Update availability view for anyone watching this caregiver
  emitAvailabilityUpdated(io, booking.caregiverId.toString(), {
    type: "slot_reserved",
    schedule: booking.schedule,
    bookingId: booking._id,
  });
};

/**
 * Emit when a booking is confirmed
 */
export const emitBookingConfirmed = (io, booking) => {
  // Notify care seeker
  sendToUser(io, booking.careSeekerId.toString(), "booking_confirmed", {
    bookingId: booking._id,
    bookingNumber: booking.bookingNumber,
  });

  // Update availability view
  emitAvailabilityUpdated(io, booking.caregiverId.toString(), {
    type: "slot_booked",
    schedule: booking.schedule,
    bookingId: booking._id,
  });
};

/**
 * Emit when a booking is cancelled
 */
export const emitBookingCancelled = (io, booking) => {
  // Update availability view (slot released)
  emitAvailabilityUpdated(io, booking.caregiverId.toString(), {
    type: "slot_released",
    schedule: booking.schedule,
    bookingId: booking._id,
  });
};

/**
 * Emit when a reservation expires
 */
export const emitReservationExpired = (io, booking) => {
  // Notify care seeker
  sendToUser(io, booking.careSeekerId.toString(), "reservation_expired", {
    bookingId: booking._id,
    bookingNumber: booking.bookingNumber,
  });

  // Update availability view (slot released)
  emitAvailabilityUpdated(io, booking.caregiverId.toString(), {
    type: "slot_released",
    schedule: booking.schedule,
    bookingId: booking._id,
  });
};

/**
 * Emit new_review to caregiver, family, and admin:global room.
 * Called by review.service after persisting to DB.
 */
export const emitNewReview = (io, review) => {
  const caregiverId =
    review.revieweeId?.toString() || review.caregiverId?.toString();
  const familyId = review.reviewerId?.toString() || review.familyId?.toString();

  const payload = {
    reviewId: review._id,
    rating: review.overallRating,
    reviewType: review.reviewType,
    bookingId: review.bookingId,
    revieweeId: caregiverId,
    reviewerId: familyId,
    status: review.status,
    createdAt: review.createdAt,
  };

  // Caregiver sees their updated rating immediately
  if (caregiverId) sendToUser(io, caregiverId, "review:new", payload);
  // Care-seeker gets confirmation
  if (familyId) sendToUser(io, familyId, "review:new", payload);
  // Admin global room — full review object for moderation
  io.to("admin:global").emit("admin:review:new", { ...payload, comment: review.comment });
};

/**
 * Emit a structured log entry to the admin:global room.
 * Called by userActivity tracking whenever an action is recorded.
 */
export const emitAdminLog = (io, logEntry) => {
  io.to("admin:global").emit("admin:log", logEntry);
};

/**
 * Emit wallet_update to a user (caregiver or careseeker).
 */
export const emitWalletUpdate = (io, userId, walletData) => {
  const payload = {
    ...walletData,
    userId: userId.toString(),
    timestamp: new Date(),
  };
  sendToUser(io, userId.toString(), "wallet:updated", payload);
  // Also emit legacy event name for backward compat
  sendToUser(io, userId.toString(), "wallet_update", payload);
};

/**
 * Emit new_note to receiver.
 */
export const emitNewNote = (io, receiverId, note) => {
  sendToUser(io, receiverId.toString(), "new_note", note);
};

/**
 * Emit profile_completion_updated to the user so their dashboard
 * percentage bar updates in real time after profile saves.
 */
export const emitProfileCompletion = (io, userId, completionPercentage) => {
  sendToUser(io, userId.toString(), "profile:completion_updated", {
    userId: userId.toString(),
    completionPercentage,
    timestamp: new Date(),
  });
};

/**
 * Emit presence:online_status to all contacts of a user (used for
 * public profile pages outside of conversation rooms).
 */
export const emitPresenceUpdate = (io, userId, isOnline) => {
  sendToUser(io, userId.toString(), "presence:self_update", {
    userId: userId.toString(),
    isOnline,
    timestamp: new Date(),
  });
};

export default {
  initializeSocket,
  getOnlineUsers,
  isUserOnline,
  sendToUser,
  emitNotification,
  emitChatStatusChange,
  emitAvailabilityUpdated,
  emitBookingReserved,
  emitBookingConfirmed,
  emitBookingCancelled,
  emitReservationExpired,
  emitNewReview,
  emitAdminLog,
  emitWalletUpdate,
  emitNewNote,
  emitProfileCompletion,
  emitPresenceUpdate,
};
