// ============================================
// EMAIL TEMPLATE ACCESSOR
// Provides a stable template API for integrations
// ============================================

import emailService from '../../services/email.service.js';

export const getVerificationEmailTemplate = (fullName, verificationUrl) => {
  return emailService.getVerificationEmailTemplate(fullName, verificationUrl);
};

export const getPasswordResetEmailTemplate = (fullName, resetUrl) => {
  return emailService.getPasswordResetEmailTemplate(fullName, resetUrl);
};

export const getWelcomeEmailTemplate = (fullName) => {
  return emailService.getWelcomeEmailTemplate(fullName);
};

export default {
  getVerificationEmailTemplate,
  getPasswordResetEmailTemplate,
  getWelcomeEmailTemplate,
};
