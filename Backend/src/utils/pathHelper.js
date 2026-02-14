/**
 * Path Helper Utilities for ESM
 * Provides __dirname and __filename equivalents for ES Modules
 */

import { fileURLToPath } from 'url';
import path from 'path';

/**
 * Get __dirname equivalent in ESM
 * @param {string} importMetaUrl - import.meta.url from the calling module
 * @returns {string} Directory path
 */
export const getDirname = (importMetaUrl) => {
  const __filename = fileURLToPath(importMetaUrl);
  return path.dirname(__filename);
};

/**
 * Get __filename equivalent in ESM
 * @param {string} importMetaUrl - import.meta.url from the calling module
 * @returns {string} File path
 */
export const getFilename = (importMetaUrl) => {
  return fileURLToPath(importMetaUrl);
};

/**
 * Get project root directory
 * Assumes this file is in src/utils/
 * @returns {string} Project root path
 */
export const getProjectRoot = () => {
  const __dirname = getDirname(import.meta.url);
  return path.resolve(__dirname, '../../');
};

export default {
  getDirname,
  getFilename,
  getProjectRoot,
};
