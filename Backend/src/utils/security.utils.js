/**
 * Security Utilities
 * Helpers for preventing common security vulnerabilities
 */

/**
 * Escape special regex characters to prevent ReDoS attacks
 * @param {string} string - User input string
 * @returns {string} Escaped string safe for use in regex
 */
export function escapeRegExp(string) {
  // Escape all special regex characters: \ ^ $ * + ? . ( ) [ ] { } |
  return string.replace(/[\\^$*+?.()|[\]{}]/g, '\\$&');
}

/**
 * Create a safe case-insensitive regex pattern from user input
 * @param {string} userInput - Untrusted user input
 * @returns {RegExp} Safe regex object
 */
export function createSafeRegex(userInput) {
  if (!userInput || typeof userInput !== 'string') {
    return /.^/; // Never matches anything
  }
  
  const escapedInput = escapeRegExp(userInput.trim());
  
  // Limit length to prevent memory exhaustion
  if (escapedInput.length > 100) {
    return new RegExp(escapedInput.substring(0, 100), 'i');
  }
  
  return new RegExp(escapedInput, 'i');
}

/**
 * Sanitize search query for MongoDB regex operations
 * @param {string} search - Search string from user
 * @returns {string} Sanitized search string
 */
export function sanitizeSearchQuery(search) {
  if (!search || typeof search !== 'string') {
    return '';
  }
  
  // Remove potentially dangerous characters
  return search
    .trim()
    .slice(0, 100) // Limit length
    .replace(/[\\^$*+?.()|[\]{}]/g, '\\$&'); // Escape regex chars
}

/**
 * Validate and sanitize email for regex search
 * @param {string} email - Email string to search
 * @returns {string} Safe email pattern
 */
export function sanitizeEmailSearch(email) {
  if (!email || typeof email !== 'string') {
    return '';
  }
  
  // Basic email validation before regex
  const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailPattern.test(email)) {
    // If not a valid email format, escape for partial matching
    return escapeRegExp(email.trim().slice(0, 50));
  }
  
  return escapeRegExp(email.trim());
}
