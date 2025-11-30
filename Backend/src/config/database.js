import mongoose from 'mongoose';
import config from './index.js';
import logger from '../utils/logger.js';

const READY_STATE_LABELS = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

mongoose.set('bufferCommands', false);

/**
 * Connect to MongoDB with production-ready configuration
 * @returns {Promise<void>}
 */
export const connectDB = async () => {
  try {
    // Connection options
    const options = {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    };

    const conn = await mongoose.connect(config.mongodbUri, options);

    // Only register listeners once
    if (mongoose.connection.listenerCount('error') === 0) {
      // Handle connection errors
      mongoose.connection.on('error', (err) => {
        logger.error('[SERVICES] MongoDB connection error', { reason: err.message });
      });

      // Handle disconnection
      mongoose.connection.on('disconnected', () => {
        logger.warn('[SERVICES] MongoDB disconnected');
      });

      // Handle initial/ongoing connection success
      mongoose.connection.on('connected', () => {
        logger.info('[SERVICES] MongoDB connected');
      });

      // Handle reconnection
      mongoose.connection.on('reconnected', () => {
        logger.info('[SERVICES] MongoDB reconnected');
      });
    }

    return conn;

  } catch (error) {
    throw new Error(`MongoDB connection failed: ${error.message}`);
  }
};

/**
 * Check if database is connected
 * @returns {boolean}
 */
export const isConnected = () => {
  return mongoose.connection.readyState === 1;
};

/**
 * Get current database connection state as a human-readable string
 * @returns {'disconnected' | 'connected' | 'connecting' | 'disconnecting' | 'unknown'}
 */
export const getConnectionState = () => {
  return READY_STATE_LABELS[mongoose.connection.readyState] || 'unknown';
};

export default connectDB;
