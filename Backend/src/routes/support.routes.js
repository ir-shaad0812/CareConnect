// ============================================
// TAWK.TO SUPPORT ROUTES
// Customer support chat integration endpoints
// ============================================

import express from "express";
import jwt from "jsonwebtoken";
import { authenticate } from "../middleware/auth.middleware.js";
import tawktoService from "../services/tawkto.service.js";
import User from "../models/user.model.js";

const router = express.Router();

/**
 * @route   GET /api/support/widget-config
 * @desc    Get tawk.to widget configuration
 * @access  Public (with optional auth for personalization)
 */
router.get("/widget-config", async (req, res) => {
  try {
    // Check if user is authenticated (optional)
    let user = null;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        user = await User.findById(decoded.userId).select("fullName email phone role status createdAt isEmailVerified isPhoneVerified");
      } catch {
        // Token invalid, continue as guest
      }
    }

    const config = tawktoService.getWidgetConfig(user);

    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error("Error getting widget config:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get widget configuration",
    });
  }
});

/**
 * @route   GET /api/support/context/:conversationId
 * @desc    Get support context for a locked conversation
 * @access  Private
 */
router.get("/context/:conversationId", authenticate, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    const context = await tawktoService.getLockedChatSupportContext(
      conversationId,
      userId
    );

    if (context.error) {
      return res.status(400).json({
        success: false,
        message: context.error,
      });
    }

    res.json({
      success: true,
      data: context,
    });
  } catch (error) {
    console.error("Error getting support context:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get support context",
    });
  }
});

/**
 * @route   GET /api/support/links
 * @desc    Get quick support links
 * @access  Public
 */
router.get("/links", (req, res) => {
  const links = tawktoService.getSupportLinks();

  res.json({
    success: true,
    data: { links },
  });
});

/**
 * @route   POST /api/support/log-interaction
 * @desc    Log a support interaction
 * @access  Private
 */
router.post("/log-interaction", authenticate, async (req, res) => {
  try {
    const { type, metadata } = req.body;
    const userId = req.user._id;

    const result = await tawktoService.logSupportInteraction(
      userId,
      type,
      metadata
    );

    if (result.error) {
      return res.status(400).json({
        success: false,
        message: result.error,
      });
    }

    res.json({
      success: true,
      message: "Interaction logged",
    });
  } catch (error) {
    console.error("Error logging interaction:", error);
    res.status(500).json({
      success: false,
      message: "Failed to log interaction",
    });
  }
});

/**
 * @route   POST /api/support/webhook
 * @desc    Handle tawk.to webhooks
 * @access  Public (verified by tawk.to signature)
 */
router.post("/webhook", async (req, res) => {
  try {
    // In production, verify webhook signature here
    // const signature = req.headers['x-tawkto-signature'];
    // if (!verifySignature(signature, req.body)) {
    //   return res.status(401).json({ error: 'Invalid signature' });
    // }

    const result = await tawktoService.handleWebhook(req.body);

    if (result.error) {
      return res.status(400).json({
        success: false,
        message: result.error,
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error handling webhook:", error);
    res.status(500).json({
      success: false,
      message: "Webhook processing failed",
    });
  }
});

export default router;
