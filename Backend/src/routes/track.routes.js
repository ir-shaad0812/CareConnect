// tracking routes - 404 errors, broken links, analytics
import express from 'express';
import emailService from '../integrations/email/email.service.js';
const router = express.Router();

// track 404 errors - silent logging, no user-facing response
router.post('/404', async (req, res) => {
  try {
    const { url, path, query, referrer, timestamp, userAgent } = req.body;

    const safePayload = {
      url: typeof url === 'string' ? url : '',
      path: typeof path === 'string' ? path : '',
      query: typeof query === 'string' ? query : '',
      referrer: typeof referrer === 'string' ? referrer : 'Direct',
      timestamp: timestamp || new Date().toISOString(),
      userAgent: typeof userAgent === 'string' ? userAgent.substring(0, 200) : 'Unknown',
    };

    // log to console (in production, send to monitoring service)
    console.log('🔗 404 Error Detected:', {
      url: safePayload.url,
      path: safePayload.path,
      query: safePayload.query,
      referrer: safePayload.referrer,
      timestamp: safePayload.timestamp,
      userAgent: safePayload.userAgent.substring(0, 50),
    });

    // Optional email alert to ops inbox when configured
    if (process.env.ADMIN_EMAIL) {
      await emailService.sendEmail(
        process.env.ADMIN_EMAIL,
        '404 Error Detected on CareConnect',
        `
          <h2>404 Error Report</h2>
          <p><strong>URL:</strong> ${safePayload.url}</p>
          <p><strong>Path:</strong> ${safePayload.path}</p>
          <p><strong>Query:</strong> ${safePayload.query || 'None'}</p>
          <p><strong>Referrer:</strong> ${safePayload.referrer}</p>
          <p><strong>Timestamp:</strong> ${safePayload.timestamp}</p>
          <p><strong>User Agent:</strong> ${safePayload.userAgent}</p>
        `
      );
    }

    res.status(200).json({ success: true });
  } catch (error) {
    // fail silently - don't expose errors to client
    console.error('Track 404 failed:', error);
    res.status(200).json({ success: false });
  }
});

export default router;
