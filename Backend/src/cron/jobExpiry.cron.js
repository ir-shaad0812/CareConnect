// JOB EXPIRY CRON — auto-expires jobs past their deadline or expiresAt date

import Job from '../models/job.model.js';
import { isConnected } from '../config/database.js';

class JobExpiryCron {
  constructor() {
    this.interval = null;
    this.io = null;
  }

  start(io = null) {
    this.io = io;
    console.log('[CRON] Job expiry job scheduled');

    this.interval = setInterval(async () => {
      await this.processExpiredJobs();
    }, 5 * 60 * 1000); // every 5 minutes

    setTimeout(() => this.processExpiredJobs(), 8000);
  }

  async processExpiredJobs() {
    if (!isConnected()) {
      return;
    }

    try {
      const now = new Date();
      const result = await Job.updateMany(
        {
          status: { $in: ['active', 'paused'] },
          isDeleted: false,
          $or: [
            { applicationDeadline: { $lt: now } },
            { expiresAt: { $lt: now } },
          ],
        },
        {
          $set: { status: 'expired', isActive: false, updatedAt: now },
        }
      );

      if (result.modifiedCount > 0) {
        console.log(`[CRON] Expired ${result.modifiedCount} jobs`);
        // Broadcast to admin room that jobs have been auto-expired
        if (this.io) {
          this.io.to('admin:global').emit('admin:jobs_expired', {
            count: result.modifiedCount,
            timestamp: now,
          });
          // Broadcast to all connected caregivers to refresh their job listings
          this.io.emit('jobs:listing_updated', {
            reason: 'jobs_expired',
            timestamp: now,
          });
        }
      }
    } catch (error) {
      console.error('[CRON] Job expiry error:', error.message);
    }
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    console.log('[CRON] Job expiry job stopped');
  }
}

export default new JobExpiryCron();
