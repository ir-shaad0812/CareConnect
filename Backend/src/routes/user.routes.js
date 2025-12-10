import { Router } from 'express';
import * as userController from '../controllers/user/user.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { authenticate, authorize, optionalAuth } from '../middleware/auth.middleware.js';
import { uploadAvatar, handleUploadError } from '../middleware/upload.middleware.js';
import {
  updateProfileValidation,
  completeProfileValidation,
  userIdValidation,
} from '../validators/user.validator.js';
import { USER_ROLES } from '../constants/index.js';
import { validateRequest } from '../shared/validators/joiRequest.validator.js';
import {
  caregiverListQuerySchema,
  userIdParamSchema,
} from '../modules/user/user.validation.js';

const router = Router();
const validateCaregiverListQuery = validateRequest({ query: caregiverListQuerySchema });
const validateUserIdParam = validateRequest({ params: userIdParamSchema });

// Public routes (no authentication required)
router.get('/caregivers', validateCaregiverListQuery, userController.getPublicCaregivers);
router.get('/caregivers/market-context', userController.getCaregiverMarketContext);

// Public route with optional auth for view tracking
router.get('/caregivers/:userId', validateUserIdParam, optionalAuth, userController.getPublicCaregiverProfile);

// All routes below require authentication
router.use(authenticate);

// User routes
router.get('/profile', userController.getProfile);
router.patch('/profile', updateProfileValidation, validate, userController.updateProfile);
router.post('/avatar', uploadAvatar, handleUploadError, userController.uploadAvatar);
router.delete('/avatar', userController.removeAvatar);
router.post('/complete-profile', completeProfileValidation, validate, userController.completeProfile);
router.delete('/account', userController.deleteAccount);

// Caregiver-specific routes
router.get('/caregiver/dashboard', authorize(USER_ROLES.CAREGIVER), userController.getCaregiverDashboard);
router.put('/caregiver/availability', authorize(USER_ROLES.CAREGIVER), userController.updateAvailability);
router.put('/caregiver/rates', authorize(USER_ROLES.CAREGIVER), userController.updateRates);

// Admin routes
router.get('/', authorize(USER_ROLES.ADMIN), userController.getAllUsers);
router.get('/admin/caregivers', authorize(USER_ROLES.ADMIN), userController.getCaregiversForAdmin);
router.get('/:userId', authorize(USER_ROLES.ADMIN), validateUserIdParam, userIdValidation, validate, userController.getUserById);
router.patch('/:userId/status', authorize(USER_ROLES.ADMIN), validateUserIdParam, userIdValidation, validate, userController.updateUserStatus);
router.patch('/:userId/background-check', authorize(USER_ROLES.ADMIN), validateUserIdParam, userIdValidation, validate, userController.updateBackgroundCheck);
router.patch('/:userId/featured', authorize(USER_ROLES.ADMIN), validateUserIdParam, userIdValidation, validate, userController.toggleFeatured);

export default router;
