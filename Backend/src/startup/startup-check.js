// ============================================
// STARTUP CHECKS
// Validates runtime prerequisites before boot
// ============================================

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import config from '../config/index.js';
import { STARTUP_CHECK_CODES } from '../shared/constants/system.constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, '../../uploads');

const ensureUploadsDirectory = async () => {
  await fs.mkdir(uploadsDir, { recursive: true });
};

const getConfigurationSummary = () => {
  return {
    environment: config.nodeEnv,
    port: config.port,
    cloudinaryEnabled: config.cloudinary.enabled,
    smtpEnabled: config.smtp.enabled,
    stripeEnabled: config.stripe.enabled,
    streamEnabled: config.stream?.enabled ?? false,
    redisEnabled: config.redis.enabled,
    code: STARTUP_CHECK_CODES.PASSED,
  };
};

export const runStartupChecks = async () => {
  await ensureUploadsDirectory();
  return getConfigurationSummary();
};

export default runStartupChecks;
