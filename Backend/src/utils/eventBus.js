// ============================================
// EVENT BUS
// Central point of truth for all domain events.
// Wraps Socket.IO so that services never import
// the raw `io` object directly.
//
// SYSTEM_EVENTS naming convention:  domain:action
//
// Initialise once from server.js:
//   import { eventBus } from './utils/eventBus.js';
//   eventBus.init(io);
//
// Emit from any service:
//   eventBus.emitToUser(userId, SYSTEM_EVENTS.BOOKING_CREATED, payload);
//
//   // 4-arg form (spec):
//   eventBus.emitToBookingParties(careSeekerId, caregiverId, SYSTEM_EVENTS.BOOKING_ACCEPTED, payload);
//
//   // booking-doc form (backward-compat — used by booking/agreement services):
//   eventBus.emitToBookingParties(booking, SYSTEM_EVENTS.BOOKING_ACCEPTED, payload);
// ============================================

import logger from "./logger.js";

// ────────────────────────────────────────────────────────────────────────────
// SYSTEM EVENTS REGISTRY
// Single source of truth — import this wherever you need event name strings.
// ────────────────────────────────────────────────────────────────────────────
export const SYSTEM_EVENTS = Object.freeze({
  // ── Booking lifecycle ────────────────────────────────────────────────────
  BOOKING_CREATED: "booking:created",
  BOOKING_ACCEPTED: "booking:accepted",
  BOOKING_AGREEMENT_GENERATED: "booking:agreement_generated",
  BOOKING_AGREEMENT_ACCEPTED: "booking:agreement_accepted",
  BOOKING_PAYMENT_COMPLETED: "booking:payment_completed",
  BOOKING_PAYMENT_FAILED: "booking:payment_failed",
  BOOKING_CONFIRMED: "booking:confirmed",
  BOOKING_ACTIVE: "booking:active",
  BOOKING_COMPLETED: "booking:completed",
  BOOKING_CANCELLED: "booking:cancelled",

  // ── Tracking ─────────────────────────────────────────────────────────────
  TRACKING_SUBMITTED: "tracking:submitted",
  TRACKING_FLAGGED: "tracking:flagged",
  TRACKING_MISSED: "tracking:missed",

  // ── Disputes ─────────────────────────────────────────────────────────────
  DISPUTE_CREATED: "dispute:created",
  DISPUTE_RESOLVED: "dispute:resolved",
  DISPUTE_UPDATED: "dispute:updated",

  // ── Notes ────────────────────────────────────────────────────────────────
  NOTE_CREATED: "note:created",
  NOTE_UPDATED: "note:updated",
  NOTE_DELETED: "note:deleted",
  NOTE_SHARED: "note:shared",
  NOTE_EDIT_REQUEST_CREATED: "note:edit_request_created",
  NOTE_EDIT_REQUEST_APPROVED: "note:edit_request_approved",
  NOTE_EDIT_REQUEST_REJECTED: "note:edit_request_rejected",

  // ── System ───────────────────────────────────────────────────────────────
  SYSTEM_STATS_UPDATED: "system:stats_updated",
  NOTIFICATION_CREATED: "notification:created",
});

// ────────────────────────────────────────────────────────────────────────────
// INTERNAL HELPERS
// ────────────────────────────────────────────────────────────────────────────

/**
 * Enrich every outgoing payload with a standard envelope so clients can
 * identify the event type and timestamp without inspecting the socket
 * event name string.
 *
 * @param {string} event
 * @param {*}      payload
 * @returns {object}
 */
function enrich(event, payload) {
  return {
    ...(payload && typeof payload === "object" ? payload : { data: payload }),
    _event: event,
    _timestamp: new Date().toISOString(),
  };
}

/**
 * Resolve a userId that may be a Mongoose ObjectId, a populated sub-document,
 * or a plain string.  Returns null when the value is falsy.
 *
 * @param {string|object|null|undefined} value
 * @returns {string|null}
 */
function resolveId(value) {
  if (!value) return null;
  if (value._id) return value._id.toString(); // populated Mongoose doc
  return value.toString();
}

// ────────────────────────────────────────────────────────────────────────────
// EVENT BUS CLASS
// ────────────────────────────────────────────────────────────────────────────
class EventBus {
  constructor() {
    /** @type {import('socket.io').Server | null} */
    this._io = null;

    /**
     * Simple userId → socketId map (spec requirement: Map<string, string>).
     * Kept in sync with `_connectedUsers` at all connection lifecycle events.
     * Can also be updated externally via registerUser() / unregisterUser().
     *
     * @type {Map<string, string>}
     */
    this.userSocketMap = new Map();

    /**
     * Richer connection registry, used internally for role-based broadcasts.
     * key   → userId (string)
     * value → { socketId: string, role: string, connectedAt: Date }
     *
     * @type {Map<string, { socketId: string, role: string, connectedAt: Date }>}
     */
    this._connectedUsers = new Map();

    /** Whether the bus has been wired to an io instance. */
    this._initialised = false;
  }

  // ── Initialisation ──────────────────────────────────────────────────────

  /**
   * Wire the event bus to the Socket.IO server instance.
   * Call this exactly once from server.js, right after `io` is created.
   *
   * @param {import('socket.io').Server} io
   * @returns {EventBus} this (fluent)
   */
  init(io) {
    if (this._initialised) {
      logger.warn(
        "[EventBus] init() called more than once — ignoring duplicate call",
      );
      return this;
    }

    if (!io) {
      logger.error(
        "[EventBus] init() received a falsy io instance — event bus will be inert",
      );
      return this;
    }

    this._io = io;
    this._initialised = true;

    // ── Track connections & disconnections ────────────────────────────────
    // socket.js already registers its own 'connection' handler on the same
    // io instance.  Node's EventEmitter supports multiple listeners, so this
    // second handler runs independently and only maintains the internal maps.
    io.on("connection", (socket) => {
      const userId = resolveId(socket.user?._id);
      if (!userId) return;

      const entry = {
        socketId: socket.id,
        role: socket.user?.role ?? "unknown",
        connectedAt: new Date(),
      };

      this._connectedUsers.set(userId, entry);
      this.userSocketMap.set(userId, socket.id);

      socket.on("disconnect", () => {
        this._connectedUsers.delete(userId);
        this.userSocketMap.delete(userId);
      });
    });

    logger.info("[EventBus] Initialised and listening for connections");
    return this;
  }

  // ── Explicit user registration ──────────────────────────────────────────

  /**
   * Explicitly register a userId → socketId mapping.
   *
   * Useful when socket authentication happens outside the `io.on('connection')`
   * listener managed by init() — for example, in a custom handshake handler or
   * during integration tests.
   *
   * Calling registerUser() for an already-connected user will update the
   * stored socketId to the new value.
   *
   * @param {string|object} userId   - Mongoose ObjectId, populated doc, or plain string
   * @param {string}        socketId - The raw socket.id string
   */
  registerUser(userId, socketId) {
    const id = resolveId(userId);
    if (!id || !socketId) {
      logger.warn(
        "[EventBus] registerUser called with missing userId or socketId",
      );
      return;
    }

    this.userSocketMap.set(id, socketId);

    // Upsert the richer registry entry so emitToRole() keeps working.
    const existing = this._connectedUsers.get(id);
    if (existing) {
      existing.socketId = socketId;
    } else {
      this._connectedUsers.set(id, {
        socketId,
        role: "unknown",
        connectedAt: new Date(),
      });
    }

    logger.debug("[EventBus] registerUser", { userId: id, socketId });
  }

  /**
   * Remove a userId → socketId mapping.
   *
   * Call this on explicit logout or on any disconnect event raised outside
   * the bus's own connection listener.
   *
   * @param {string|object} userId
   */
  unregisterUser(userId) {
    const id = resolveId(userId);
    if (!id) return;

    const had = this.userSocketMap.has(id);
    this.userSocketMap.delete(id);
    this._connectedUsers.delete(id);

    if (had) {
      logger.debug("[EventBus] unregisterUser", { userId: id });
    }
  }

  // ── Internal io resolver ────────────────────────────────────────────────

  /**
   * Retrieve the Socket.IO server instance.
   *
   * Falls back to `global.__careconnect_io` so that services which emit
   * events before `init()` has been called (e.g. during automated tests)
   * can still function when the global is set externally.
   *
   * @returns {import('socket.io').Server | null}
   */
  _getIo() {
    if (this._io) return this._io;

    // Lazy fallback: adopt the global if available, so future calls skip it.
    if (global.__careconnect_io) {
      this._io = global.__careconnect_io;
      return this._io;
    }

    return null;
  }

  // ── Public emit API ─────────────────────────────────────────────────────

  /**
   * Send an event to a single user's personal Socket.IO room (`user_<userId>`).
   *
   * Works transparently when the same user has multiple browser tabs open,
   * because socket.js joins every authenticated socket to `user_${userId}`
   * on connect.
   *
   * Never throws — a failed socket emission must not propagate into a
   * business transaction.
   *
   * @param {string|object} userId  - Mongoose ObjectId, populated doc, or string
   * @param {string}        event   - One of SYSTEM_EVENTS
   * @param {object}        [payload={}]
   */
  emitToUser(userId, event, payload = {}) {
    try {
      const io = this._getIo();
      if (!io) {
        logger.warn("[EventBus] io not ready — skipping emitToUser", {
          event,
          userId: resolveId(userId),
        });
        return;
      }

      const id = resolveId(userId);
      if (!id) {
        logger.warn("[EventBus] emitToUser called with null/undefined userId", {
          event,
        });
        return;
      }

      const enriched = enrich(event, payload);
      io.to(`user_${id}`).emit(event, enriched);
      io.to(`user:${id}`).emit(event, enriched);
    } catch (err) {
      // Non-fatal — a failed socket emit must never crash a business transaction.
      logger.error("[EventBus] emitToUser threw", {
        error: err.message,
        event,
        userId: resolveId(userId),
      });
    }
  }

  /**
   * Emit to a booking room using both legacy and modern room names.
   * Legacy: booking_<bookingId>
   * Modern: booking:<bookingId>
   */
  emitToBookingRoom(bookingId, event, payload = {}) {
    try {
      const io = this._getIo();
      if (!io) {
        logger.warn("[EventBus] io not ready — skipping emitToBookingRoom", {
          event,
          bookingId: resolveId(bookingId),
        });
        return;
      }

      const id = resolveId(bookingId);
      if (!id) {
        logger.warn("[EventBus] emitToBookingRoom called with null/undefined bookingId", {
          event,
        });
        return;
      }

      const enriched = enrich(event, payload);
      io.to(`booking_${id}`).emit(event, enriched);
      io.to(`booking:${id}`).emit(event, enriched);
    } catch (err) {
      logger.error("[EventBus] emitToBookingRoom threw", {
        error: err.message,
        event,
        bookingId: resolveId(bookingId),
      });
    }
  }

  /**
   * Emit to all connected admin users.
   */
  emitToAdmins(event, payload = {}) {
    try {
      const io = this._getIo();
      if (!io) {
        logger.warn("[EventBus] io not ready — skipping emitToAdmins", { event });
        return;
      }

      const enriched = enrich(event, payload);
      io.to('admin:global').emit(event, enriched);
      this.emitToRole('admin', event, payload);
    } catch (err) {
      logger.error("[EventBus] emitToAdmins threw", {
        error: err.message,
        event,
      });
    }
  }

  /**
   * Broadcast an event to every connected, authenticated socket.
   *
   * Use sparingly — prefer targeted room emits for privacy-sensitive events.
   *
   * @param {string} event
   * @param {object} [payload={}]
   */
  emitToAll(event, payload = {}) {
    try {
      const io = this._getIo();
      if (!io) {
        logger.warn("[EventBus] io not ready — skipping emitToAll", { event });
        return;
      }

      io.emit(event, enrich(event, payload));
    } catch (err) {
      logger.error("[EventBus] emitToAll threw", { error: err.message, event });
    }
  }

  /**
   * Send an event to every currently-connected user that holds a given role.
   *
   * Role is read from `socket.user.role`, which socket.js sets during the
   * JWT authentication handshake.  Only users who connected *after* init()
   * was called are reachable; in practice init() always runs before any user
   * authenticates.
   *
   * @param {string} role    - e.g. 'caregiver' | 'careseeker' | 'admin'
   * @param {string} event   - One of SYSTEM_EVENTS
   * @param {object} [payload={}]
   */
  emitToRole(role, event, payload = {}) {
    try {
      const io = this._getIo();
      if (!io) {
        logger.warn("[EventBus] io not ready — skipping emitToRole", {
          event,
          role,
        });
        return;
      }

      const enriched = enrich(event, payload);
      let count = 0;

      for (const [userId, info] of this._connectedUsers) {
        if (info.role === role) {
          io.to(`user_${userId}`).emit(event, enriched);
          io.to(`user:${userId}`).emit(event, enriched);
          count++;
        }
      }

      logger.debug("[EventBus] emitToRole", {
        event,
        role,
        recipientCount: count,
      });
    } catch (err) {
      logger.error("[EventBus] emitToRole threw", {
        error: err.message,
        event,
        role,
      });
    }
  }

  /**
   * Send an event to both the care seeker and the caregiver on a booking.
   *
   * ── Supported call signatures ────────────────────────────────────────────
   *
   * **4-arg form** (spec-defined, explicit IDs):
   *   emitToBookingParties(careSeekerId, caregiverId, event, payload)
   *
   * **3-arg / booking-doc form** (backward-compatible, used internally):
   *   emitToBookingParties(booking, event, payload)
   *   → Automatically merges `bookingId` and `bookingNumber` into the payload.
   *
   * Detection is done by inspecting whether the first argument has a
   * `careSeekerId` property (i.e. is a Mongoose booking document or plain
   * booking object), so the two forms cannot be confused.
   *
   * @param {string|object} careSeekerId_or_booking
   *   Either a userId string/ObjectId (4-arg form) or a booking document
   *   (3-arg form).
   * @param {string|object} caregiverId_or_event
   *   Either a userId string/ObjectId (4-arg) or the event name string (3-arg).
   * @param {string|object} [event_or_payload]
   *   The event name (4-arg) or the payload object (3-arg).
   * @param {object}        [payload={}]
   *   Payload (4-arg only; ignored in 3-arg form).
   */
  emitToBookingParties(
    careSeekerId_or_booking,
    caregiverId_or_event,
    event_or_payload,
    payload = {},
  ) {
    try {
      let resolvedCareSeekerId;
      let resolvedCaregiverId;
      let resolvedEvent;
      let resolvedPayload;

      // ── Detect call form ─────────────────────────────────────────────────
      const firstArg = careSeekerId_or_booking;
      const isBookingDocForm =
        firstArg !== null &&
        typeof firstArg === "object" &&
        ("careSeekerId" in firstArg || "caregiverId" in firstArg);

      if (isBookingDocForm) {
        // booking-doc form: (booking, event, payload)
        const booking = firstArg;
        resolvedEvent = caregiverId_or_event; // 2nd arg is the event
        resolvedPayload = event_or_payload ?? {}; // 3rd arg is the payload

        resolvedCareSeekerId = resolveId(booking.careSeekerId);
        resolvedCaregiverId = resolveId(booking.caregiverId);

        // Auto-merge booking context so clients always know which booking
        // this event belongs to, without the caller having to repeat it.
        resolvedPayload = {
          bookingId: booking._id?.toString() ?? null,
          bookingNumber: booking.bookingNumber ?? null,
          ...resolvedPayload,
        };
      } else {
        // 4-arg form: (careSeekerId, caregiverId, event, payload)
        resolvedCareSeekerId = resolveId(firstArg);
        resolvedCaregiverId = resolveId(caregiverId_or_event);
        resolvedEvent = event_or_payload;
        resolvedPayload = payload ?? {};
      }

      if (!resolvedEvent) {
        logger.warn(
          "[EventBus] emitToBookingParties called without a valid event name",
        );
        return;
      }

      if (resolvedCareSeekerId) {
        this.emitToUser(resolvedCareSeekerId, resolvedEvent, resolvedPayload);
      }
      if (resolvedCaregiverId) {
        this.emitToUser(resolvedCaregiverId, resolvedEvent, resolvedPayload);
      }
    } catch (err) {
      logger.error("[EventBus] emitToBookingParties threw", {
        error: err.message,
        // Log whichever identifier is available for debugging
        ref:
          resolveId(careSeekerId_or_booking) ??
          String(careSeekerId_or_booking?._id ?? ""),
      });
    }
  }

  /**
   * Wrap any arbitrary emission function in a try/catch so that a failed
   * socket emission can never propagate and crash a business transaction.
   *
   * @example
   *   eventBus.safeEmit(() => {
   *     eventBus.emitToUser(userId, SYSTEM_EVENTS.BOOKING_CONFIRMED, data);
   *   });
   *
   * @param {() => void} fn - Any zero-argument function performing emissions
   */
  safeEmit(fn) {
    try {
      fn();
    } catch (err) {
      logger.error("[EventBus] safeEmit caught an error", {
        error: err.message,
      });
    }
  }

  // ── Diagnostics ─────────────────────────────────────────────────────────

  /**
   * Returns a snapshot of currently connected users for debugging purposes.
   * Do NOT expose this data on any public-facing API endpoint.
   *
   * @returns {{ total: number, byRole: Record<string, number> }}
   */
  getConnectionStats() {
    const byRole = {};
    for (const [, info] of this._connectedUsers) {
      byRole[info.role] = (byRole[info.role] ?? 0) + 1;
    }
    return { total: this._connectedUsers.size, byRole };
  }

  /**
   * Check whether a specific user currently has an active socket connection.
   *
   * @param {string|object} userId
   * @returns {boolean}
   */
  isUserConnected(userId) {
    const id = resolveId(userId);
    return id ? this._connectedUsers.has(id) : false;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// SINGLETON EXPORT
// ────────────────────────────────────────────────────────────────────────────

/**
 * The single shared EventBus instance for the entire application.
 *
 * Usage pattern:
 *   // In server.js (once, at startup):
 *   import { eventBus } from './utils/eventBus.js';
 *   const io = initializeSocket(httpServer);
 *   eventBus.init(io);
 *
 *   // In any service file:
 *   import { eventBus, SYSTEM_EVENTS } from '../utils/eventBus.js';
 *   eventBus.emitToUser(userId, SYSTEM_EVENTS.BOOKING_CREATED, payload);
 */
export const eventBus = new EventBus();

export default eventBus;
