// ============================================
// CLOUDINARY INTEGRATION CONFIG
// Centralized runtime flags for Cloudinary
// ============================================

import config from '../../config/index.js';

export const cloudinaryConfig = {
  enabled: config.cloudinary.enabled,
  cloudName: config.cloudinary.cloudName,
  apiKey: config.cloudinary.apiKey,
};

export default cloudinaryConfig;
