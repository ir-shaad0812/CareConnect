import { Router } from 'express';
import * as trackingController from '../controllers/tracking/tracking.controller.js';
import { authenticate, requireActive, authorize } from '../middleware/auth.middleware.js';
import { uploadTrackingImages, handleUploadError } from '../middleware/upload.middleware.js';
import { USER_ROLES } from '../constants/index.js';
import { validateRequest } from '../shared/validators/joiRequest.validator.js';
import {
	trackingCheckSchema,
	trackingSubmitSchema,
	bookingIdParamSchema,
	bookingDateParamSchema,
} from '../modules/tracking/tracking.validation.js';

const router = Router();
const validateTrackingBody = validateRequest({ body: trackingCheckSchema });
const validateTrackingSubmit = validateRequest({ body: trackingSubmitSchema });
const validateBookingId = validateRequest({ params: bookingIdParamSchema });
const validateBookingDate = validateRequest({ params: bookingDateParamSchema });

router.use(authenticate, requireActive);

router.post('/check-in', validateTrackingBody, trackingController.checkInTracking);
router.post('/check-out', validateTrackingBody, trackingController.checkOutTracking);
router.post('/submit', uploadTrackingImages, handleUploadError, validateTrackingSubmit, trackingController.submitTrackingLog);

router.get('/admin/overview', authorize(USER_ROLES.ADMIN), trackingController.getAdminTrackingOverview);
router.patch('/:bookingId/:date/admin', authorize(USER_ROLES.ADMIN), validateBookingDate, trackingController.adminUpdateTrackingLog);
router.post('/:bookingId/:date/remind', authorize(USER_ROLES.ADMIN), validateBookingDate, trackingController.sendTrackingReminder);

router.patch('/:bookingId/:date/review', validateBookingDate, trackingController.reviewTrackingLog);
router.get('/:bookingId', validateBookingId, trackingController.getTrackingLogs);

export default router;
