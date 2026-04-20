
// SERVER BOOTSTRAP
// Starts HTTP server and infrastructure service

import { createServer } from 'http';
import cors from 'cors';
import app from './app.js';
import config from './config/index.js';
import { connectDB, isConnected } from './config/database.js';
import paymentService from './services/payment.service.js';
import khaltiService from './services/khalti.service.js';
import esewaService from './services/esewa.service.js';
import emailService from './services/email.service.js';
import {
  initializeRealtime,
  runStartupValidation,
  startBackgroundJobs,
  startQueueWorkers,
  stopQueueWorkers,
  registerShutdownHandlers,
  registerFatalHandlers,
} from './loaders/index.js';

const PORT = config.port;
const httpServer = createServer(app);
const DB_RETRY_INTERVAL_MS = 30_000;
let dbReconnectInterval = null;

app.use (cors({
  origin: process.env.CORS_ORIGIN ,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
httpServer.on('error', (error) => {
  if (error?.code === 'EADDRINUSE') {
    console.error(`[FATAL] Port ${PORT} is already in use.`);
    console.error(`[FATAL] Stop the existing process on port ${PORT} and restart the API.`);
    process.exit(1);
  }

  console.error('[FATAL] HTTP server error:', error.message);
  process.exit(1);
});

const printServiceStatus = (status) => {
  const level = String(status?.level || 'info').toUpperCase();
  const message = status?.message || 'Unknown service state';
  console.log(`[SERVICES] ${level} ${message}`);
};

const logStartupHeader = () => {
  console.log('[BOOT] CareConnect API starting...');
  console.log(`[CONFIG] Environment: ${config.nodeEnv}`);
  console.log(`[CONFIG] Port: ${PORT}`);
};

const startMongoReconnectLoop = () => {
  if (dbReconnectInterval) {
    return;
  }

  dbReconnectInterval = setInterval(async () => {
    if (isConnected()) {
      return;
    }

    try {
      await connectDB();
      console.log('[SERVICES] OK MongoDB reconnection succeeded');
    } catch (error) {
      console.warn(`[SERVICES] WARN MongoDB reconnect retry failed: ${error.message}`);
    }
  }, DB_RETRY_INTERVAL_MS);
};

const stopMongoReconnectLoop = () => {
  if (!dbReconnectInterval) {
    return;
  }

  clearInterval(dbReconnectInterval);
  dbReconnectInterval = null;
};

const startServer = async () => {
  try {
    logStartupHeader();

    const startupSummary = await runStartupValidation();
    let mongoConnected = false;

    try {
      await connectDB();
      mongoConnected = true;
    } catch (error) {
      console.warn(`[SERVICES] WARN MongoDB unavailable at startup: ${error.message}`);
      console.warn('[SERVICES] WARN API will run in degraded mode until MongoDB reconnects');
      startMongoReconnectLoop();
    }

    const smtpStatus = await emailService.waitForStartupValidation();

    printServiceStatus(
      mongoConnected
        ? { level: 'ok', message: 'MongoDB connected' }
        : { level: 'warn', message: 'MongoDB unavailable (degraded mode)' },
    );
    printServiceStatus(
      config.google.clientId && config.google.clientSecret
        ? { level: 'ok', message: 'Google OAuth configured' }
        : { level: 'warn', message: 'Google OAuth disabled (credentials missing)' },
    );
    printServiceStatus(paymentService.getStartupStatus());
    printServiceStatus(khaltiService.getStartupStatus());
    printServiceStatus(esewaService.getStartupStatus());
    printServiceStatus(smtpStatus);
    printServiceStatus(
      startupSummary.cloudinaryEnabled
        ? { level: 'ok', message: 'Cloudinary enabled' }
        : { level: 'warn', message: 'Cloudinary disabled' },
    );
    printServiceStatus(
      startupSummary.streamEnabled
        ? { level: 'ok', message: 'Stream service enabled' }
        : { level: 'warn', message: 'Stream service disabled' },
    );
    printServiceStatus(
      startupSummary.redisEnabled
        ? { level: 'ok', message: 'Redis queue enabled' }
        : { level: 'warn', message: 'Redis queue disabled' },
    );
    printServiceStatus({ level: 'warn', message: 'AI service disabled' });

    const io = initializeRealtime(httpServer, app);
    const stopJobs = startBackgroundJobs(io);
    await startQueueWorkers();

    registerShutdownHandlers({
      httpServer,
      onShutdown: async () => {
        stopJobs();
        await stopQueueWorkers();
        stopMongoReconnectLoop();
      },
    });

    httpServer.listen(PORT, () => {
      if (config.isDevelopment) {
        console.log(`[READY] Server running at http://localhost:${PORT}`);
        return;
      }

      console.log(`[READY] Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('[FATAL] Failed to start server:', error.message);
    process.exit(1);
  }
};

registerFatalHandlers();
startServer();

export default httpServer;
