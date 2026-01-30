// ============================================
// SHUTDOWN LOADER
// Registers graceful shutdown and fatal handlers
// ============================================

const SHUTDOWN_TIMEOUT_MS = 10_000;

let shutdownHandlersRegistered = false;
let fatalHandlersRegistered = false;
let shuttingDown = false;

const safeInvoke = async (handler) => {
  if (typeof handler !== 'function') {
    return;
  }

  try {
    await handler();
  } catch (error) {
    console.error('[SHUTDOWN] Cleanup hook failed:', error.message);
  }
};

const createShutdownHandler = ({ httpServer, onShutdown }) => {
  return async (signal) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    console.log(`[SHUTDOWN] ${signal} received, closing resources`);

    await safeInvoke(onShutdown);

    httpServer.close(() => {
      console.log('[SHUTDOWN] HTTP server closed');
      process.exit(0);
    });

    setTimeout(() => {
      console.error('[SHUTDOWN] Force exit after timeout');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS).unref();
  };
};

export const registerShutdownHandlers = ({ httpServer, onShutdown }) => {
  if (shutdownHandlersRegistered) {
    return;
  }

  const shutdown = createShutdownHandler({ httpServer, onShutdown });

  process.on('SIGTERM', () => {
    shutdown('SIGTERM');
  });
  process.on('SIGINT', () => {
    shutdown('SIGINT');
  });

  shutdownHandlersRegistered = true;
};

export const registerFatalHandlers = () => {
  if (fatalHandlersRegistered) {
    return;
  }

  process.on('unhandledRejection', (error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[FATAL] Unhandled rejection:', message);
    process.exit(1);
  });

  process.on('uncaughtException', (error) => {
    console.error('[FATAL] Uncaught exception:', error.message);
    process.exit(1);
  });

  fatalHandlersRegistered = true;
};
