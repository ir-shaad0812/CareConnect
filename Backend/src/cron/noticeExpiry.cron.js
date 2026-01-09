// NOTICE EXPIRY CRON — auto-deactivates expired notices + broadcasts real-time removal

import Notice from '../models/notice.model.js';
import { isConnected } from '../config/database.js';

class NoticeExpiryCron {
  constructor() {
    this.interval = null;
    this.io = null;
  }

  start(io = null) {
    this.io = io;
    console.log('[CRON] Notice expiry job scheduled');

    this.interval = setInterval(async () => {
      await this.processExpiredNotices();
    }, 60 * 1000); // every minute

    setTimeout(() => this.processExpiredNotices(), 6000);
  }

  async processExpiredNotices() {
    if (!isConnected()) {
      return;
    }

    try {
      const now = new Date();
      // Find notices that just expired (were active, now past expiry)
      const expiredNotices = await Notice.find({
        isActive: true,
        expiryDate: { $lte: now },
      }).select('_id title targetRoles').lean();

      if (expiredNotices.length === 0) return;

      // Deactivate them
      const ids = expiredNotices.map(n => n._id);
      await Notice.updateMany(
        { _id: { $in: ids } },
        { $set: { isActive: false } }
      );

      console.log(`[CRON] Deactivated ${expiredNotices.length} expired notices`);

      // Real-time broadcast removal
      if (this.io) {
        expiredNotices.forEach(notice => {
          // Broadcast to each target role group
          const roles = notice.targetRoles || [];
          const targets = roles.includes('all')
            ? ['caregiver', 'careseeker', 'admin']
            : roles;

          targets.forEach(role => {
            this.io.emit(`notice:expired`, {
              noticeId: notice._id.toString(),
              title: notice.title,
              timestamp: now,
            });
          });

          // Also notify admin
          this.io.to('admin:global').emit('admin:notice_expired', {
            noticeId: notice._id.toString(),
            title: notice.title,
            timestamp: now,
          });
        });
      }
    } catch (error) {
      console.error('[CRON] Notice expiry error:', error.message);
    }
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    console.log('[CRON] Notice expiry job stopped');
  }
}

export default new NoticeExpiryCron();
