/**
 * validate-env.ts
 *
 * Called once at app boot (in layout.tsx or instrumentation.ts).
 * Throws in production if critical NEXT_PUBLIC_ vars are missing so that
 * a bad deploy is caught immediately rather than silently serving a broken app.
 *
 * Rules:
 *  - Only validate NEXT_PUBLIC_ vars here (accessible at runtime in the browser).
 *  - Server-only vars are validated by the backend's own validateEnv() in config/index.js.
 *  - Never log values — only names.
 */

import { validateEnv } from "@/config/env";

/**
 * Run frontend environment validation.
 * Delegates to src/config/env.ts so process.env stays centralized.
 */
export function validateFrontendEnv(): void {
  validateEnv();
}
