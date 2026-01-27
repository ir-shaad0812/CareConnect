// ============================================
// QUEUE LOADER
// Starts and stops queue workers
// ============================================

import notificationQueueService from '../services/notificationQueue.service.js';
import bookingWorkflowQueueService from '../services/bookingWorkflowQueue.service.js';
import '../services/notification.service.js';

let queuesStarted = false;

export const startQueueWorkers = async () => {
  if (queuesStarted) {
    return stopQueueWorkers;
  }

  await bookingWorkflowQueueService.start();
  await notificationQueueService.start();
  queuesStarted = true;

  return stopQueueWorkers;
};

export const stopQueueWorkers = async () => {
  if (!queuesStarted) {
    return;
  }

  await bookingWorkflowQueueService.stop();
  await notificationQueueService.stop();
  queuesStarted = false;
};
