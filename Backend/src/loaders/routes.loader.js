// ============================================
// ROUTES LOADER
// Registers health checks and API routes
// ============================================

import config from "../config/index.js";
import { SUPPORTED_LANGUAGES } from "../middleware/localization.middleware.js";
import {
  apiLimiter,
  authLimiter,
} from "../middleware/rateLimiter.middleware.js";
import {
  bookingRoutes,
  paymentRoutes,
  chatRoutes,
  trackingRoutes,
  userRoutes,
} from "../modules/index.js";
import {
  authRoutes,
  agreementRoutes,
  documentRoutes,
  adminRoutes,
  notificationRoutes,
  searchRoutes,
  videoRoutes,
  reviewRoutes,
  trackRoutes,
  aiMatchRoutes,
  jobRoutes,
  adminJobRoutes,
  supportRoutes,
  locationRoutes,
  availabilityRoutes,
  noteRoutes,
  walletRoutes,
  dashboardRoutes,
  disputeRoutes,
  noticeRoutes,
  taskRoutes,
  aiRoutes,
  feedbackRoutes,
} from "../routes/index.js";
import {
  getDatabaseStatusPayload,
  requireDatabaseConnection,
} from "../middleware/database.middleware.js";

const getHealthPayload = (lang) => {
  const database = getDatabaseStatusPayload();

  if (config.isProduction) {
    return {
      success: database.connected,
      message: database.connected ? "OK" : "DEGRADED",
      language: lang,
      database,
    };
  }

  return {
    success: database.connected,
    message: database.connected
      ? "CareConnect API is running"
      : "CareConnect API is running in degraded mode",
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    language: lang,
    database,
  };
};

const registerPublicRoutes = (app) => {
  app.get("/", (req, res) => {
    res.status(200).json({
      success: true,
      message: req.t("common", "success"),
      version: "1.0.0",
      docs: "/api",
      health: "/health",
      language: req.lang,
      supportedLanguages: SUPPORTED_LANGUAGES,
    });
  });

  app.get("/favicon.ico", (req, res) => {
    res.status(204).end();
  });

  app.get("/health", (req, res) => {
    res.status(200).json(getHealthPayload(req.lang));
  });

  app.get("/api/languages", (req, res) => {
    res.status(200).json({
      success: true,
      data: {
        current: req.lang,
        supported: SUPPORTED_LANGUAGES,
      },
    });
  });

  app.get("/api", (req, res) => {
    res.status(200).json({
      success: true,
      message: "Welcome to CareConnect API",
      version: "1.0.0",
      endpoints: {
        auth: "/api/auth",
        users: "/api/users",
        documents: "/api/documents",
      },
    });
  });
};

const registerApiRoutes = (app) => {
  app.use("/api", apiLimiter);
  app.use('/api', requireDatabaseConnection);
  app.use("/api/auth", authLimiter, authRoutes);

  app.use("/api/users", userRoutes);
  app.use("/api/documents", documentRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/bookings", bookingRoutes);
  app.use("/api/agreements", agreementRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/chat", chatRoutes);
  app.use("/api/search", searchRoutes);
  app.use("/api/video", videoRoutes);
  app.use("/api/payments", paymentRoutes);
  app.use("/api/reviews", reviewRoutes);
  app.use("/api/track", trackRoutes);
  app.use("/api/tracking", trackingRoutes);
  app.use("/api/ai-match", aiMatchRoutes);
  app.use("/api/jobs", jobRoutes);
  app.use("/api/admin/jobs", adminJobRoutes);
  app.use("/api/support", supportRoutes);
  app.use("/api/location", locationRoutes);
  app.use("/api/availability", availabilityRoutes);
  app.use("/api/notes", noteRoutes);
  app.use("/api/wallet", walletRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/disputes", disputeRoutes);
  app.use("/api/notices", noticeRoutes);
  app.use("/api/tasks", taskRoutes);
  app.use("/api/ai", aiRoutes);
  app.use('/api/feedback', feedbackRoutes);
};

export const registerRoutes = (app) => {
  registerPublicRoutes(app);
  registerApiRoutes(app);
};
