import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import * as locationController from '../controllers/location/location.controller.js';

const router = Router();

router.get('/search', locationController.searchAddress);
router.get('/reverse', locationController.reverseGeocode);

router.use(authenticate);

router.post('/proof', locationController.saveLocationProof);
router.get('/trust-score', locationController.getTrustScore);
router.get('/logs', locationController.getLocationLogs);
router.post('/service/:bookingId/start', locationController.startServiceSession);
router.post('/service/:bookingId/ping', locationController.trackServiceLocation);
router.post('/service/:bookingId/end', locationController.endServiceSession);
router.get('/service/:bookingId/timeline', locationController.getServiceTimeline);

export default router;
