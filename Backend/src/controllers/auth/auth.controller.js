// ============================================
// AUTH CONTROLLER
// Handles authentication endpoints
// ============================================

import authService from '../../services/auth.service.js';
import userActivityService from '../../services/userActivity.service.js';
import { ApiResponse, asyncHandler } from '../../utils/apiResponse.js';
import { setAuthCookies, clearAuthCookies } from '../../utils/tokenUtils.js';
import config from '../../config/index.js';

/**
 * Register a new user
 * POST /api/auth/register
 */
export const register = asyncHandler(async (req, res) => {
  const { email, password, fullName, role, age, phone, gender, location } = req.body;
  const userAgent = req.headers['user-agent'] || 'unknown';
  const ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';

  const result = await authService.register({
    email,
    password,
    fullName,
    role,
    age,
    phone,
    gender,
    location,
  });

  // Log registration activity
  if (result.user && result.user._id) {
    await userActivityService.logAuth(result.user._id, 'register', ipAddress, userAgent, {
      role: result.user.role,
      email: result.user.email,
    });
  }

  res.status(201).json(
    new ApiResponse(201, result, req.t('auth', 'registrationSuccess'))
  );
});

/**
 * Complete 3-step registration with optional document uploads
 * POST /api/auth/register/complete
 * Accepts multipart/form-data with personal fields + optional file array "documents"
 */
export const registerComplete = asyncHandler(async (req, res) => {
  const {
    fullName,
    email,
    password,
    phone,
    dateOfBirth,
    gender,
    address,
    role,
    documentTypes, // array or single string – parallel to uploaded files
    locationProof, // JSON string with location data for care-seeker address verification
  } = req.body;

  // Normalise documentTypes to an array
  const docTypes = Array.isArray(documentTypes)
    ? documentTypes
    : documentTypes
    ? [documentTypes]
    : [];

  const files = req.files || []; // from uploadRegistrationDocuments (array)

  // Basic server-side validation
  if (!fullName || !email || !password || !role) {
    res.status(400).json(new ApiResponse(400, null, 'fullName, email, password, and role are required'));
    return;
  }

  const result = await authService.registerComplete({
    fullName,
    email,
    password,
    phone,
    dateOfBirth,
    gender,
    address,
    role,
    files,         // multer file objects
    docTypes,      // parallel array of document type strings
    locationProof, // location data for care-seeker address verification
  });

  res.status(201).json(
    new ApiResponse(201, result, 'Registration successful. Please check your email to verify your account.')
  );
});

/**
 * Complete onboarding for an authenticated user
 * POST /api/auth/onboarding/complete
 */
export const onboardingComplete = asyncHandler(async (req, res) => {
  const {
    fullName,
    phone,
    dateOfBirth,
    gender,
    address,
    role,
    documentTypes,
    locationProof,
    agreementAccepted,
    agreementAcceptedAt,
    agreementVersion,
  } = req.body;

  const docTypes = Array.isArray(documentTypes)
    ? documentTypes
    : documentTypes
    ? [documentTypes]
    : [];

  const files = req.files || [];

  const result = await authService.completeOnboarding(req.user._id, {
    fullName,
    phone,
    dateOfBirth,
    gender,
    address,
    role,
    files,
    docTypes,
    locationProof,
    agreementAccepted,
    agreementAcceptedAt,
    agreementVersion,
  });

  res.status(200).json(
    new ApiResponse(200, result, result.message || 'Onboarding completed successfully')
  );
});

/**
 * Login with email and password
 * POST /api/auth/login
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const userAgent = req.headers['user-agent'] || 'unknown';
  const ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';

  const result = await authService.login(email, password, userAgent, ipAddress);

  // Log the login activity
  await userActivityService.logAuth(result.user._id, 'login', ipAddress, userAgent, {
    role: result.user.role,
    email: result.user.email,
  });

  // Set cookies for web clients
  setAuthCookies(res, result.accessToken, result.refreshToken);

  res.status(200).json(
    new ApiResponse(200, result, req.t('auth', 'loginSuccess'))
  );
});

/**
 * Admin Login - Only allows admin role users
 * POST /api/auth/admin/login
 */
export const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const userAgent = req.headers['user-agent'] || 'unknown';
  const ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';

  const result = await authService.adminLogin(email, password, userAgent, ipAddress);

  // Log the admin login activity
  await userActivityService.logAuth(result.user._id, 'login', ipAddress, userAgent, {
    role: 'admin',
    email: result.user.email,
    adminLogin: true,
  });

  // Set cookies for web clients
  setAuthCookies(res, result.accessToken, result.refreshToken);

  res.status(200).json(
    new ApiResponse(200, result, req.t('auth', 'loginSuccess'))
  );
});

/**
 * Verify email with token
 * GET /api/auth/verify-email
 */
export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.query;
  const userAgent = req.headers['user-agent'] || 'unknown';
  const ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';

  const result = await authService.verifyEmail(token, userAgent, ipAddress);

  if (result?.accessToken && result?.refreshToken) {
    setAuthCookies(res, result.accessToken, result.refreshToken);
  }

  // Return JSON — the frontend /verify-email page handles UI and navigation.
  // Using a redirect here would cause CORS failures when the link is fetched
  // via JavaScript from the browser.
  res.status(200).json(
    new ApiResponse(200, result, result.message)
  );
});

/**
 * Resend verification email
 * POST /api/auth/resend-verification
 */
export const resendVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const result = await authService.resendVerificationEmail(email);

  res.status(200).json(
    new ApiResponse(200, result, req.t('auth', 'verificationSent'))
  );
});

/**
 * Forgot password - send reset email
 * POST /api/auth/forgot-password
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const result = await authService.forgotPassword(email);

  res.status(200).json(
    new ApiResponse(200, result, req.t('auth', 'passwordResetSent'))
  );
});

/**
 * Reset password with token
 * POST /api/auth/reset-password
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  const result = await authService.resetPassword(token, password);

  res.status(200).json(
    new ApiResponse(200, result, req.t('auth', 'passwordResetSuccess'))
  );
});

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
export const refreshToken = asyncHandler(async (req, res) => {
  const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;
  const userAgent = req.headers['user-agent'] || 'unknown';
  const ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';

  const tokens = await authService.refreshToken(refreshToken, userAgent, ipAddress);

  // Set new cookies
  setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

  res.status(200).json(
    new ApiResponse(200, tokens, req.t('auth', 'tokenRefreshed'))
  );
});

/**
 * Change password (authenticated)
 * POST /api/auth/change-password
 */
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user._id;

  const result = await authService.changePassword(userId, currentPassword, newPassword);

  // Clear cookies as user needs to re-login
  clearAuthCookies(res);

  res.status(200).json(
    new ApiResponse(200, result, req.t('auth', 'passwordChanged'))
  );
});

/**
 * Logout - invalidate refresh token
 * POST /api/auth/logout
 */
export const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;

  await authService.logout(refreshToken);

  // Clear cookies
  clearAuthCookies(res);

  res.status(200).json(
    new ApiResponse(200, null, req.t('auth', 'logoutSuccess'))
  );
});

/**
 * Logout from all devices
 * POST /api/auth/logout-all
 */
export const logoutAll = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  await authService.logoutAll(userId);

  // Clear cookies
  clearAuthCookies(res);

  res.status(200).json(
    new ApiResponse(200, null, req.t('auth', 'logoutAllSuccess'))
  );
});

/**
 * Get current authenticated user
 * GET /api/auth/me
 */
export const getCurrentUser = asyncHandler(async (req, res) => {
  res.status(200).json(
    new ApiResponse(200, { user: req.user }, req.t('user', 'profileFetched'))
  );
});

/**
 * OAuth callback handler — Google only (Facebook removed)
 * Security: Tokens are set in httpOnly cookies only, NOT in URL
 */
export const oauthCallback = asyncHandler(async (req, res) => {
  const userAgent = req.headers['user-agent'] || 'unknown';
  const ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';

  const result = await authService.oauthLogin(req.user, userAgent, ipAddress);

  // Set tokens in httpOnly cookies (secure method)
  setAuthCookies(res, result.accessToken, result.refreshToken);

  const frontendUrl = config.frontendUrl || 'http://localhost:3000';
  
  // Redirect with only non-sensitive flags - tokens are in cookies
  // Frontend will read user data from /api/auth/me endpoint
  if (result.requiresOnboarding) {
    res.redirect(`${frontendUrl}/onboarding?oauth=success`);
  } else {
    res.redirect(`${frontendUrl}/dashboard?oauth=success`);
  }
});
