// ============================================
// CRON LOADER
// Starts and stops background cron jobs
// ============================================

import paymentDeadlineCron from "../cron/paymentDeadline.cron.js";
import reservationExpiryCron from "../cron/reservationExpiry.cron.js";
import reviewReminderCron from "../cron/reviewReminder.cron.js";
import trackingEnforcementCron from "../cron/trackingEnforcement.cron.js";
import jobExpiryCron from "../cron/jobExpiry.cron.js";
import noticeExpiryCron from "../cron/noticeExpiry.cron.js";

let jobsStarted = false;

export const startBackgroundJobs = (io = null) => {
  if (jobsStarted) {
    return stopBackgroundJobs;
  }

  paymentDeadlineCron.start();
  reservationExpiryCron.start(io);
  reviewReminderCron.start(io);
  trackingEnforcementCron.start();
  jobExpiryCron.start(io);
  noticeExpiryCron.start(io);

  jobsStarted = true;

  return stopBackgroundJobs;
};

export const stopBackgroundJobs = () => {
  if (!jobsStarted) {
    return;
  }

  paymentDeadlineCron.stop();
  reservationExpiryCron.stop();
  reviewReminderCron.stop();
  trackingEnforcementCron.stop();
  jobExpiryCron.stop();
  noticeExpiryCron.stop();

  jobsStarted = false;
};
