// ============================================
// API ENDPOINTS
// Centralized relative endpoint paths.
// ============================================

export const ENDPOINTS = {
  auth: {
    register: '/auth/register',
    login: '/auth/login',
    logout: '/auth/logout',
    verifyEmail: '/auth/verify-email',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
    refreshToken: '/auth/refresh-token',
    google: '/auth/google',
  },
  location: {
    search: '/location/search',
    reverse: '/location/reverse',
  },
  USER: {
    PROFILE: '/users/profile',
    AVATAR: '/users/avatar',
    ME: '/auth/me',
  },
} as const;
