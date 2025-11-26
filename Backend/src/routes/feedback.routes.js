import { Router } from 'express';
import * as feedbackController from '../controllers/feedback/feedback.controller.js';
import { authenticate, authorize, requireActive } from '../middleware/auth.middleware.js';
import {
  uploadFeedbackScreenshot,
  handleUploadError,
} from '../middleware/upload.middleware.js';
import { USER_ROLES } from '../constants/index.js';

const router = Router();

// Feedback is restricted to authenticated, active accounts.
router.use(authenticate, requireActive);

router.post(
  '/',
  uploadFeedbackScreenshot,
  handleUploadError,
  feedbackController.createFeedback,
);

router.get('/my', feedbackController.getMyFeedback);

router.get(
  '/admin',
  authorize(USER_ROLES.ADMIN),
  feedbackController.getAdminFeedback,
);

router.patch(
  '/admin/:feedbackId/status',
  authorize(USER_ROLES.ADMIN),
  feedbackController.updateFeedbackStatus,
);

router.get('/:feedbackId', feedbackController.getFeedbackById);

export default router;
