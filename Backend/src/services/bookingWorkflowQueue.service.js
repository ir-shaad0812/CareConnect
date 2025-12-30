// ============================================
// BOOKING WORKFLOW QUEUE SERVICE
// Queue-driven orchestration for critical booking flows.
// ============================================

import { Queue, Worker, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';

import config from '../config/index.js';
import redisConnection from '../config/redis.js';
import Booking from '../models/booking.model.js';
import Conversation from '../models/conversation.model.js';
import BookingWorkflowLog, {
  BOOKING_WORKFLOW_EVENT,
  BOOKING_WORKFLOW_STATUS,
} from '../models/bookingWorkflowLog.model.js';
import bookingDayService from './bookingDay.service.js';
import slotService from './slot.service.js';
import chatAccessService from './chatAccess.service.js';
import chatService from './chat.service.js';
import { eventBus, SYSTEM_EVENTS } from '../utils/eventBus.js';

const QUEUE_NAME = 'booking-workflow';

class BookingWorkflowQueueService {
  constructor() {
    this.queue = null;
    this.worker = null;
    this.queueEvents = null;
    this.producerConnection = null;
    this.workerConnection = null;
    this.eventsConnection = null;
    this.started = false;
  }

  isEnabled() {
    return config.redis.enabled;
  }

  isReady() {
    return this.started && this.queue && this.worker;
  }

  async start() {
    if (!this.isEnabled()) {
      console.log('[QUEUE] Booking workflow queue disabled (REDIS_ENABLED is false)');
      return { enabled: false, started: false };
    }

    if (this.started) {
      return { enabled: true, started: true };
    }

    this.producerConnection = new IORedis(redisConnection);
    this.workerConnection = new IORedis(redisConnection);
    this.eventsConnection = new IORedis(redisConnection);

    this.queue = new Queue(QUEUE_NAME, {
      connection: this.producerConnection,
      prefix: config.redis.queuePrefix,
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 2500,
        },
        removeOnComplete: 1000,
        removeOnFail: 1000,
      },
    });

    this.queueEvents = new QueueEvents(QUEUE_NAME, {
      connection: this.eventsConnection,
      prefix: config.redis.queuePrefix,
    });

    this.worker = new Worker(
      QUEUE_NAME,
      async (job) => {
        if (job.name === BOOKING_WORKFLOW_EVENT.BOOKING_CONFIRMED) {
          return this.processBookingConfirmedJob(job.data);
        }

        throw new Error(`Unsupported booking workflow job: ${job.name}`);
      },
      {
        connection: this.workerConnection,
        prefix: config.redis.queuePrefix,
        concurrency: 5,
      },
    );

    this.worker.on('failed', (job, error) => {
      console.error(
        `[QUEUE] Booking workflow job failed (${job?.id || 'unknown'}):`,
        error.message,
      );
    });

    this.worker.on('completed', (job) => {
      if (config.isDevelopment) {
        console.log(`[QUEUE] Booking workflow job completed (${job.id})`);
      }
    });

    this.started = true;
    console.log('[QUEUE] Booking workflow queue worker started');

    return { enabled: true, started: true };
  }

  async stop() {
    if (!this.started) {
      return;
    }

    await Promise.allSettled([
      this.worker?.close(),
      this.queueEvents?.close(),
      this.queue?.close(),
    ]);

    await Promise.allSettled([
      this.workerConnection?.quit(),
      this.eventsConnection?.quit(),
      this.producerConnection?.quit(),
    ]);

    this.worker = null;
    this.queueEvents = null;
    this.queue = null;
    this.workerConnection = null;
    this.eventsConnection = null;
    this.producerConnection = null;
    this.started = false;

    console.log('[QUEUE] Booking workflow queue worker stopped');
  }

  async enqueueBookingConfirmed(bookingId, metadata = {}) {
    if (!bookingId) {
      throw new Error('bookingId is required for booking.confirmed workflow');
    }

    const bookingIdStr = bookingId.toString();
    const payload = {
      bookingId: bookingIdStr,
      source: metadata.source || 'unknown',
      metadata,
      enqueuedAt: new Date().toISOString(),
    };

    if (!this.isEnabled() || !this.isReady()) {
      // Fallback to inline orchestration for environments without Redis.
      const result = await this.processBookingConfirmedJob(payload);
      return {
        queued: false,
        inlineProcessed: true,
        result,
      };
    }

    const jobId = `${BOOKING_WORKFLOW_EVENT.BOOKING_CONFIRMED}:${bookingIdStr}`;

    await this.queue.add(
      BOOKING_WORKFLOW_EVENT.BOOKING_CONFIRMED,
      payload,
      { jobId },
    );

    return {
      queued: true,
      jobId,
      event: BOOKING_WORKFLOW_EVENT.BOOKING_CONFIRMED,
    };
  }

  async processBookingConfirmedJob(data) {
    const bookingId = data?.bookingId?.toString?.() || String(data?.bookingId || '');
    if (!bookingId) {
      throw new Error('booking.confirmed job missing bookingId');
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return {
        processed: false,
        skipped: true,
        reason: 'booking_not_found',
      };
    }

    const idempotencyKey = `${BOOKING_WORKFLOW_EVENT.BOOKING_CONFIRMED}:${booking._id}`;

    const alreadyCompleted = await BookingWorkflowLog.findOne({
      idempotencyKey,
      status: BOOKING_WORKFLOW_STATUS.COMPLETED,
    });

    if (alreadyCompleted) {
      return {
        processed: true,
        skipped: true,
        reason: 'already_processed',
      };
    }

    const workflowLog = await BookingWorkflowLog.findOneAndUpdate(
      { idempotencyKey },
      {
        $setOnInsert: {
          bookingId: booking._id,
          bookingNumber: booking.bookingNumber,
          eventType: BOOKING_WORKFLOW_EVENT.BOOKING_CONFIRMED,
          idempotencyKey,
          startedAt: new Date(),
        },
        $set: {
          status: BOOKING_WORKFLOW_STATUS.PROCESSING,
          source: data?.source || 'queue-worker',
          triggerMetadata: data?.metadata || null,
        },
        $inc: { attemptCount: 1 },
      },
      {
        upsert: true,
        new: true,
      },
    );

    try {
      const bookingDays = await bookingDayService.ensureBookingDaysForBooking(booking);
      const slots = await slotService.createSlotsForBooking(booking);

      const participants = [booking.careSeekerId, booking.caregiverId];
      let conversation = await Conversation.findOne({ bookingId: booking._id });

      if (!conversation) {
        conversation = await Conversation.findOrCreateByBooking(
          booking._id,
          participants,
        );
      }

      if (!booking.conversationId && conversation?._id) {
        booking.conversationId = conversation._id;
        await booking.save();
      }

      await chatAccessService.unlockChatOnPayment(booking._id, global.__careconnect_io);

      if (conversation?._id) {
        await chatService.createSystemMessage(
          conversation._id,
          'booking_confirmed',
          'Booking is confirmed. Daily execution plan is now active.',
          booking._id,
        );
      }

      const realtimePayload = {
        bookingId: booking._id.toString(),
        bookingNumber: booking.bookingNumber,
        status: booking.status,
        bookingDayCount: bookingDays.length,
        slotCount: slots.length,
        trigger: data?.source || 'booking_workflow_queue',
        timestamp: new Date().toISOString(),
      };

      eventBus.safeEmit(() => {
        eventBus.emitToBookingParties(
          booking,
          SYSTEM_EVENTS.BOOKING_CONFIRMED,
          realtimePayload,
        );
      });

      const io = global.__careconnect_io;
      if (io) {
        io.to(`booking_${booking._id}`).emit('bookingConfirmed', realtimePayload);
        io.to(`booking:${booking._id}`).emit('bookingConfirmed', realtimePayload);
        io.to('admin:global').emit('bookingConfirmed', realtimePayload);
      }

      workflowLog.status = BOOKING_WORKFLOW_STATUS.COMPLETED;
      workflowLog.completedAt = new Date();
      workflowLog.result = {
        bookingDayCount: bookingDays.length,
        slotCount: slots.length,
        conversationId: booking.conversationId || null,
      };
      workflowLog.error = {
        message: null,
        stack: null,
        at: null,
      };

      await workflowLog.save();

      return {
        processed: true,
        bookingId: booking._id.toString(),
        bookingDayCount: bookingDays.length,
        slotCount: slots.length,
      };
    } catch (error) {
      workflowLog.status = BOOKING_WORKFLOW_STATUS.FAILED;
      workflowLog.error = {
        message: error.message,
        stack: error.stack || null,
        at: new Date(),
      };
      await workflowLog.save();

      throw error;
    }
  }
}

const bookingWorkflowQueueService = new BookingWorkflowQueueService();

export default bookingWorkflowQueueService;
