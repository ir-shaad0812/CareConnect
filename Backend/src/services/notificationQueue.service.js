// ============================================
// NOTIFICATION QUEUE SERVICE
// BullMQ-based async notification delivery
// ============================================

import { Queue, Worker, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';

import config from '../config/index.js';
import redisConnection from '../config/redis.js';

const QUEUE_NAME = 'notification-delivery';
const JOB_NAME = 'dispatch-notification';

class NotificationQueueService {
  constructor() {
    this.queue = null;
    this.worker = null;
    this.queueEvents = null;
    this.producerConnection = null;
    this.workerConnection = null;
    this.eventsConnection = null;
    this.processor = null;
    this.started = false;
  }

  isEnabled() {
    return config.redis.enabled;
  }

  isReady() {
    return this.started && this.queue && this.worker;
  }

  registerProcessor(processor) {
    this.processor = processor;
  }

  async start() {
    if (!this.isEnabled()) {
      console.log('[QUEUE] Notification queue disabled (REDIS_ENABLED is false)');
      return { enabled: false, started: false };
    }

    if (this.started) {
      return { enabled: true, started: true };
    }

    if (typeof this.processor !== 'function') {
      throw new Error('Notification queue processor is not registered');
    }

    this.producerConnection = new IORedis(redisConnection);
    this.workerConnection = new IORedis(redisConnection);
    this.eventsConnection = new IORedis(redisConnection);

    this.queue = new Queue(QUEUE_NAME, {
      connection: this.producerConnection,
      prefix: config.redis.queuePrefix,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
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
      async (job) => this.processor(job.data),
      {
        connection: this.workerConnection,
        prefix: config.redis.queuePrefix,
        concurrency: 5,
      },
    );

    this.worker.on('failed', (job, error) => {
      console.error(
        `[QUEUE] Notification job failed (${job?.id || 'unknown'}):`,
        error.message,
      );
    });

    this.worker.on('completed', (job) => {
      if (config.isDevelopment) {
        console.log(`[QUEUE] Notification job completed (${job.id})`);
      }
    });

    this.started = true;

    console.log('[QUEUE] Notification queue worker started');
    return { enabled: true, started: true };
  }

  async enqueueDelivery(notificationId) {
    if (!notificationId) {
      return { queued: false, reason: 'notificationId is required' };
    }

    if (!this.isReady()) {
      return { queued: false, reason: 'queue not ready' };
    }

    const jobId = `notification:${notificationId.toString()}`;

    await this.queue.add(
      JOB_NAME,
      { notificationId: notificationId.toString() },
      { jobId },
    );

    return { queued: true, jobId };
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

    console.log('[QUEUE] Notification queue worker stopped');
  }
}

const notificationQueueService = new NotificationQueueService();

export default notificationQueueService;
