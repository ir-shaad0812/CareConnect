import { Router } from 'express';
import passport from 'passport';
import * as authController from '../controllers/auth/auth.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { uploadRegistrationDocuments, handleUploadError } from '../middleware/upload.middleware.js';
import { authLimiter, adminAuthLimiter, passwordResetLimiter, refreshTokenLimiter } from '../middleware/rateLimiter.middleware.js';
import {
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  verifyEmailValidation,
  refreshTokenValidation,
  changePasswordValidation,
} from '../validators/auth.validator.js';

const router = Router();

// Public routes
router.post('/register', authLimiter, registerValidation, validate, authController.register);
router.post(
  '/register/complete',
  authLimiter, // throttle document upload + email send endpoint
  uploadRegistrationDocuments,
  handleUploadError,
  authController.registerComplete
);
router.post(
  '/onboarding/complete',
  authenticate,
  uploadRegistrationDocuments,
  handleUploadError,
  authController.onboardingComplete
);
router.post('/login', authLimiter, loginValidation, validate, authController.login);
router.post('/admin/login', adminAuthLimiter, loginValidation, validate, authController.adminLogin);
router.get('/verify-email', verifyEmailValidation, validate, authController.verifyEmail);
router.post('/resend-verification', passwordResetLimiter, forgotPasswordValidation, validate, authController.resendVerification);
router.post('/forgot-password', passwordResetLimiter, forgotPasswordValidation, validate, authController.forgotPassword);
router.post('/reset-password', passwordResetLimiter, resetPasswordValidation, validate, authController.resetPassword);
router.post('/refresh', refreshTokenLimiter, refreshTokenValidation, validate, authController.refreshToken);
router.post('/refresh-token', refreshTokenLimiter, refreshTokenValidation, validate, authController.refreshToken);
router.post('/logout', authController.logout);

// Protected routes
router.post('/change-password', authenticate, changePasswordValidation, validate, authController.changePassword);
router.post('/logout-all', authenticate, authController.logoutAll);
router.get('/me', authenticate, authController.getCurrentUser);

// OAuth routes — Google only (Facebook removed)
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/api/auth/oauth-failure' }),
  authController.oauthCallback
);

router.get('/oauth-failure', (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  res.redirect(`${frontendUrl}/login?error=oauth_failed`);
});

export default router;
