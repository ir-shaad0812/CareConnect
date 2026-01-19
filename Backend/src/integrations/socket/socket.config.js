// ============================================
// SOCKET INTEGRATION CONFIG
// Default socket runtime configuration values
// ============================================

import config from '../../config/index.js';

export const socketConfig = {
  corsOrigin: config.frontendUrl,
  pingTimeout: 60000,
  pingInterval: 25000,
};

export default socketConfig;
