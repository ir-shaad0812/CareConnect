// ============================================
// STARTUP CHECK SCRIPT
// Manual command: npm run startup:check
// ============================================

import { runStartupChecks } from '../startup/startup-check.js';

const run = async () => {
  try {
    const summary = await runStartupChecks();
    console.log(`[CONFIG] Environment: ${summary.environment}`);
    console.log(`[CONFIG] Port: ${summary.port}`);
    console.log('[READY] Startup checks passed');
    process.exit(0);
  } catch (error) {
    console.error('[FATAL] Startup checks failed:', error.message);
    process.exit(1);
  }
};

run();
