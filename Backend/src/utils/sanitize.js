// ============================================
// INPUT SANITIZATION UTILITIES
// Prevents XSS, injection attacks, and content abuse
// ============================================

/**
 * HTML entity map for escaping
 */
const HTML_ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

/**
 * Escape HTML entities to prevent XSS
 * @param {string} str - Input string
 * @returns {string} Escaped string
 */
export function escapeHtml(str) {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[&<>"'`=/]/g, char => HTML_ENTITIES[char]);
}

/**
 * Remove potentially dangerous HTML tags and attributes
 * Allows basic formatting while stripping scripts and event handlers
 * @param {string} content - HTML content
 * @returns {string} Sanitized content
 */
export function sanitizeHtml(content) {
  if (!content || typeof content !== 'string') return '';

  return content
    // Remove script tags and their content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove style tags
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    // Remove on* event handlers
    .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\son\w+\s*=\s*[^\s>]*/gi, '')
    // Remove javascript: URLs
    .replace(/javascript\s*:/gi, '')
    // Remove data: URLs (can contain scripts)
    .replace(/data\s*:[^,]*;base64/gi, 'data:blocked')
    // Remove vbscript
    .replace(/vbscript\s*:/gi, '')
    // Remove expression() - IE CSS expression
    .replace(/expression\s*\(/gi, '')
    // Escape remaining HTML
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Sanitize chat message content
 * Removes XSS vectors while preserving emoji and basic text formatting
 * @param {string} message - Chat message content
 * @param {Object} options - Sanitization options
 * @returns {string} Sanitized message
 */
export function sanitizeMessageContent(message, options = {}) {
  const { maxLength = 5000, allowUrls = true } = options;

  if (!message || typeof message !== 'string') return '';

  let sanitized = message
    // Trim whitespace
    .trim()
    // Limit length
    .slice(0, maxLength)
    // Remove null bytes
    .replace(/\0/g, '')
    // Normalize Unicode to prevent homograph attacks
    .normalize('NFC')
    // Remove control characters except newlines and tabs
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Escape HTML entities
    .replace(/[&<>"'`]/g, char => HTML_ENTITIES[char] || char);

  // Optionally block URLs
  if (!allowUrls) {
    sanitized = sanitized.replace(/(https?:\/\/[^\s]+)/gi, '[link removed]');
  }

  return sanitized;
}

/**
 * Validate and sanitize file name
 * @param {string} filename - Original file name
 * @returns {string} Sanitized file name
 */
export function sanitizeFileName(filename) {
  if (!filename || typeof filename !== 'string') return 'unnamed_file';

  return filename
    // Remove path traversal attempts
    .replace(/\.\./g, '')
    .replace(/[/\\]/g, '')
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove special characters except dots, hyphens, underscores
    .replace(/[^a-zA-Z0-9.\-_]/g, '_')
    // Limit length
    .slice(0, 255)
    // Ensure it doesn't start with a dot (hidden files)
    .replace(/^\./, '_');
}

/**
 * Validate MIME type for attachments
 * @param {string} mimeType - File MIME type
 * @param {Array} allowedTypes - List of allowed MIME types
 * @returns {boolean} Whether the type is allowed
 */
export function isAllowedMimeType(mimeType, allowedTypes = []) {
  if (!mimeType || typeof mimeType !== 'string') return false;

  const defaultAllowed = [
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    // Audio
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'audio/webm',
  ];

  const allowed = allowedTypes.length > 0 ? allowedTypes : defaultAllowed;
  return allowed.includes(mimeType.toLowerCase());
}

/**
 * Sanitize MongoDB query values to prevent injection
 * @param {*} value - Query value
 * @returns {*} Sanitized value
 */
export function sanitizeMongoValue(value) {
  if (value === null || value === undefined) return value;

  // Handle arrays
  if (Array.isArray(value)) {
    return value.map(sanitizeMongoValue);
  }

  // Handle objects - check for MongoDB operators
  if (typeof value === 'object') {
    const sanitized = {};
    for (const key of Object.keys(value)) {
      // Block MongoDB operators in user input
      if (key.startsWith('$')) {
        continue; // Skip MongoDB operators
      }
      sanitized[key] = sanitizeMongoValue(value[key]);
    }
    return sanitized;
  }

  // Handle strings
  if (typeof value === 'string') {
    // Remove null bytes and control characters
    return value.replace(/\0/g, '').replace(/[\x00-\x1F\x7F]/g, '');
  }

  return value;
}

/**
 * Sanitize search query for chat message search
 * @param {string} query - Search query
 * @returns {string} Sanitized query
 */
export function sanitizeChatSearchQuery(query) {
  if (!query || typeof query !== 'string') return '';

  return query
    .trim()
    .slice(0, 100) // Limit length
    .replace(/[\\^$*+?.()|[\]{}]/g, '\\$&') // Escape regex chars
    .replace(/[\x00-\x1F\x7F]/g, ''); // Remove control chars
}

/**
 * Validate conversation ID format
 * @param {string} id - Conversation ID
 * @returns {boolean} Whether ID is valid
 */
export function isValidObjectId(id) {
  if (!id || typeof id !== 'string') return false;
  return /^[a-f\d]{24}$/i.test(id);
}

/**
 * Content moderation - check for potentially harmful content
 * Returns flags for further review
 * @param {string} content - Message content
 * @returns {Object} Moderation flags
 */
export function moderateContent(content) {
  if (!content || typeof content !== 'string') {
    return { flagged: false, reasons: [] };
  }

  const reasons = [];
  const lowerContent = content.toLowerCase();

  // Check for excessive caps (shouting)
  const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
  if (capsRatio > 0.7 && content.length > 10) {
    reasons.push('excessive_caps');
  }

  // Check for repeated characters (spam)
  if (/(.)\1{5,}/i.test(content)) {
    reasons.push('repeated_chars');
  }

  // Check for potential phone numbers (privacy)
  if (/\b\d{10,}\b/.test(content) || /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/.test(content)) {
    reasons.push('phone_number');
  }

  // Check for email addresses
  if (/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(content)) {
    reasons.push('email_address');
  }

  return {
    flagged: reasons.length > 0,
    reasons,
    severity: reasons.length > 2 ? 'high' : reasons.length > 0 ? 'medium' : 'low',
  };
}

export default {
  escapeHtml,
  sanitizeHtml,
  sanitizeMessageContent,
  sanitizeFileName,
  isAllowedMimeType,
  sanitizeMongoValue,
  sanitizeChatSearchQuery,
  isValidObjectId,
  moderateContent,
};
