/**
 * Jest Configuration — CareConnect Backend
 *
 * Targets Node.js native ES Modules via --experimental-vm-modules.
 * No Babel transform is required; Jest runs source files as-is.
 *
 * Run:  node --experimental-vm-modules node_modules/jest/bin/jest.js
 * Cover: node --experimental-vm-modules node_modules/jest/bin/jest.js --coverage
 */

export default {
  // ─── Environment ───────────────────────────────────────────────────────────
  testEnvironment: "node",

  // ─── ES Module support ─────────────────────────────────────────────────────
  // NOTE: extensionsToTreatAsEsm must NOT include '.js' when the nearest
  // package.json carries "type":"module" — Jest 29 infers it automatically.

  // No transform — Node handles ESM natively under --experimental-vm-modules.
  transform: {},

  // ─── Test discovery ────────────────────────────────────────────────────────
  testMatch: ["**/tests/**/*.test.js"],

  // Never scan node_modules or build artifacts.
  testPathIgnorePatterns: ["/node_modules/", "/dist/", "/coverage/"],

  // ─── Module resolution ─────────────────────────────────────────────────────
  // Add path aliases here if/when src/ barrel files or absolute imports are used.
  // e.g.  '^@/(.*)$': '<rootDir>/src/$1'
  moduleNameMapper: {},

  // ─── Global test setup ─────────────────────────────────────────────────────
  // Runs after the Jest test framework is installed in the environment.
  // Has full access to jest, expect, beforeEach, etc.
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],

  // ─── Coverage ──────────────────────────────────────────────────────────────
  collectCoverageFrom: [
    "src/services/**/*.js",
    "src/utils/**/*.js",
    // Exclude backup files, generated scripts, and entry points.
    "!src/services/**/*.backup.js",
    "!src/scripts/**/*.js",
    "!src/server.js",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  // Fail CI if any threshold drops below these values (tighten as suite grows).
  coverageThreshold: {
    global: {
      statements: 0,
      branches: 0,
      functions: 0,
      lines: 0,
    },
  },

  // ─── Timing ────────────────────────────────────────────────────────────────
  // 10 s per test is generous; async service tests rarely need more.
  testTimeout: 10000,

  // ─── Output ────────────────────────────────────────────────────────────────
  verbose: true,

  // ─── Mock lifecycle ────────────────────────────────────────────────────────
  // clearMocks  — resets .mock.calls / .mock.instances between every test.
  // restoreMocks — restores jest.spyOn() stubs to real implementations after each test.
  // resetMocks is intentionally left false so mockResolvedValue() on fixtures survives.
  clearMocks: true,
  resetMocks: false,
  restoreMocks: true,

  // ─── Miscellaneous ─────────────────────────────────────────────────────────
  // Warn when a test suite leaves async handles open (e.g. unclosed DB connections).
  detectOpenHandles: true,
  // Fail fast in CI: stop after the first suite-level failure.
  // Set via CLI flag (--bail) rather than here so local runs still show all failures.
};
