// ============================================
// EMAIL INTEGRATION SERVICE
// Compatibility wrapper around existing email service
// ============================================

import emailService from '../../services/email.service.js';

export const sendEmail = (to, subject, html, text = null) => {
  return emailService.sendEmail(to, subject, html, text);
};

export const sendVerificationEmail = (email, fullName, verificationToken) => {
  return emailService.sendVerificationEmail(email, fullName, verificationToken);
};

export const sendPasswordResetEmail = (email, fullName, resetToken) => {
  return emailService.sendPasswordResetEmail(email, fullName, resetToken);
};

export const sendWelcomeEmail = (email, fullName) => {
  return emailService.sendWelcomeEmail(email, fullName);
};

export default emailService;
