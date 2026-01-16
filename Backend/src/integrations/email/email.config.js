// ============================================
// EMAIL INTEGRATION CONFIG
// Centralized SMTP runtime configuration
// ============================================

import config from '../../config/index.js';

export const emailConfig = {
  enabled: config.smtp.enabled,
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.secure,
  from: config.smtp.from,
};

export default emailConfig;
