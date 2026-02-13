// ============================================
// STRUCTURED LOGGER
// Production-ready logging utility
// ============================================

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const currentLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

/**
 * Format log message with timestamp and metadata
 */
function formatLog(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...meta,
  };

  // In production, output JSON for log aggregation
  if (process.env.NODE_ENV === 'production') {
    return JSON.stringify(logEntry);
  }

  // In development, use readable format
  const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
}

/**
 * Check if log level should be output
 */
function shouldLog(level) {
  return LOG_LEVELS[level] <= LOG_LEVELS[currentLevel];
}

/**
 * Logger singleton
 */
const logger = {
  error(message, meta = {}) {
    if (shouldLog('error')) {
      console.error(formatLog('error', message, meta));
    }
  },

  warn(message, meta = {}) {
    if (shouldLog('warn')) {
      console.warn(formatLog('warn', message, meta));
    }
  },

  info(message, meta = {}) {
    if (shouldLog('info')) {
      console.log(formatLog('info', message, meta));
    }
  },

  debug(message, meta = {}) {
    if (shouldLog('debug')) {
      console.log(formatLog('debug', message, meta));
    }
  },

  // Chat-specific logging
  chat: {
    messageReceived(conversationId, userId, messageId) {
      logger.info('Message received', { conversationId, userId, messageId, event: 'chat:message_received' });
    },

    messageSent(conversationId, userId, messageId) {
      logger.info('Message sent', { conversationId, userId, messageId, event: 'chat:message_sent' });
    },

    messageDelivered(conversationId, userId) {
      logger.debug('Messages delivered', { conversationId, userId, event: 'chat:message_delivered' });
    },

    messageRead(conversationId, userId) {
      logger.debug('Messages read', { conversationId, userId, event: 'chat:message_read' });
    },

    unlocked(conversationId, meta = {}) {
      logger.info('Chat unlocked', { conversationId, ...meta, event: 'chat:unlocked' });
    },

    chatRestricted(conversationId, reason) {
      logger.info('Chat restricted', { conversationId, reason, event: 'chat:restricted' });
    },

    statusChanged(conversationId, oldStatus, newStatus, meta = {}) {
      logger.info('Chat status changed', { conversationId, oldStatus, newStatus, ...meta, event: 'chat:status_changed' });
    },

    accessDenied(userId, reason, meta = {}) {
      logger.warn('Chat access denied', { userId, reason, ...meta, event: 'chat:access_denied' });
    },

    error(message, error, meta = {}) {
      logger.error(message, {
        ...meta,
        error: error?.message || String(error),
        stack: error?.stack,
        event: 'chat:error',
      });
    },
  },

  // Socket-specific logging
  socket: {
    connected(userId, socketId) {
      logger.info('Socket connected', { userId, socketId, event: 'socket:connected' });
    },

    disconnected(userId, socketId, reason) {
      logger.info('Socket disconnected', { userId, socketId, reason, event: 'socket:disconnected' });
    },

    joinedRoom(userId, room) {
      logger.debug('Joined room', { userId, room, event: 'socket:joined_room' });
    },

    leftRoom(userId, room) {
      logger.debug('Left room', { userId, room, event: 'socket:left_room' });
    },

    error(message, error, meta = {}) {
      logger.error(message, {
        ...meta,
        error: error?.message || String(error),
        event: 'socket:error',
      });
    },
  },

  // Call-specific logging
  call: {
    initiated(callerId, recipientId, callType) {
      logger.info('Call initiated', { callerId, recipientId, callType, event: 'call:initiated' });
    },

    accepted(callId, acceptedBy) {
      logger.info('Call accepted', { callId, acceptedBy, event: 'call:accepted' });
    },

    declined(callId, declinedBy) {
      logger.info('Call declined', { callId, declinedBy, event: 'call:declined' });
    },

    ended(callId, endedBy) {
      logger.info('Call ended', { callId, endedBy, event: 'call:ended' });
    },

    error(message, error, meta = {}) {
      logger.error(message, {
        ...meta,
        error: error?.message || String(error),
        event: 'call:error',
      });
    },
  },

  // AI-specific logging
  ai: {
    requestStart(conversationId, userId) {
      logger.info('AI request started', { conversationId, userId, event: 'ai:request_start' });
    },

    requestComplete(conversationId, duration) {
      logger.info('AI request completed', { conversationId, duration, event: 'ai:request_complete' });
    },

    error(message, error, meta = {}) {
      logger.error(message, {
        ...meta,
        error: error?.message || String(error),
        event: 'ai:error',
      });
    },
  },
};

export default logger;
