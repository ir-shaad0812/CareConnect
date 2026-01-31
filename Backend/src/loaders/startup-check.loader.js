// ============================================
// STARTUP CHECK LOADER
// Runs non-blocking startup prerequisites
// ============================================

import { runStartupChecks } from '../startup/startup-check.js';

export const runStartupValidation = async () => {
  return runStartupChecks();
};

export default runStartupValidation;
