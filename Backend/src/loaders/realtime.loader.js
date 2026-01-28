// ============================================
// REAL-TIME LOADER
// Initializes Socket.IO and event bus integration
// ============================================

import { initializeSocket } from '../integrations/socket/socket.service.js';
import { eventBus } from '../utils/eventBus.js';

export const initializeRealtime = (httpServer, app = null) => {
  const io = initializeSocket(httpServer);

  if (app && typeof app.set === 'function') {
    app.set('io', io);
  }

  global.__careconnect_io = io;
  eventBus.init(io);

  return io;
};
