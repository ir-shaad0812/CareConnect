import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import config from '../config/index.js';
import { ApiError } from './apiResponse.js';

// Cloudinary configuration
if (config.cloudinary.enabled) {
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
  });
}

/**
 * Upload file buffer to Cloudinary
 * @param {Buffer} fileBuffer - File buffer from multer
 * @param {Object} options - Upload options
 * @param {string} options.folder - Cloudinary folder name
 * @param {string} options.resourceType - Resource type (image, raw, video, auto)
 * @param {string} options.publicId - Custom public ID (optional)
 * @param {Array} options.allowedFormats - Allowed file formats (optional)
 * @returns {Promise<Object>} Cloudinary upload result
 */
export const uploadToCloudinary = async (fileBuffer, options = {}) => {
  if (!config.cloudinary.enabled) {
    throw ApiError.serverError('Cloudinary is not configured');
  }

  const {
    folder = 'careconnect',
    resourceType = 'auto',
    publicId,
    allowedFormats,
    transformation,
  } = options;

  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder,
      resource_type: resourceType,
      allowed_formats: allowedFormats,
      transformation,
    };

    if (publicId) {
      uploadOptions.public_id = publicId;
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          reject(ApiError.serverError('Failed to upload file to Cloudinary'));
        } else {
          resolve(result);
        }
      }
    );

    // Convert buffer to stream and pipe to cloudinary
    const readableStream = new Readable();
    readableStream.push(fileBuffer);
    readableStream.push(null);
    readableStream.pipe(uploadStream);
  });
};

/**
 * Upload image with optimizations
 * @param {Buffer} fileBuffer - Image buffer
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result with secure_url and public_id
 */
export const uploadImage = async (fileBuffer, options = {}) => {
  const result = await uploadToCloudinary(fileBuffer, {
    resourceType: 'image',
    folder: options.folder || 'careconnect/images',
    allowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: options.transformation || [
      { quality: 'auto', fetch_format: 'auto' },
    ],
    publicId: options.publicId,
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
    format: result.format,
    size: result.bytes,
  };
};

/**
 * Upload avatar with specific transformations
 * @param {Buffer} fileBuffer - Avatar image buffer
 * @param {string} userId - User ID for public_id
 * @returns {Promise<Object>} Upload result
 */
export const uploadAvatar = async (fileBuffer, userId) => {
  const result = await uploadToCloudinary(fileBuffer, {
    resourceType: 'image',
    folder: 'careconnect/avatars',
    publicId: `avatar_${userId}_${Date.now()}`,
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      { width: 500, height: 500, crop: 'fill', gravity: 'face' },
      { quality: 'auto', fetch_format: 'auto' },
    ],
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
    format: result.format,
    size: result.bytes,
  };
};

/**
 * Upload document (PDF, DOCX, etc.)
 * @param {Buffer} fileBuffer - Document buffer
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result
 */
export const uploadDocument = async (fileBuffer, options = {}) => {
  const result = await uploadToCloudinary(fileBuffer, {
    resourceType: 'raw',
    folder: options.folder || 'careconnect/documents',
    allowedFormats: ['pdf', 'doc', 'docx', 'txt'],
    publicId: options.publicId,
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    format: result.format,
    size: result.bytes,
  };
};

/**
 * Upload chat attachment (image or document)
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} mimeType - File MIME type
 * @param {string} conversationId - Conversation ID for folder organization
 * @returns {Promise<Object>} Upload result
 */
export const uploadChatAttachment = async (fileBuffer, mimeType, conversationId) => {
  const isImage = mimeType.startsWith('image/');
  
  const result = await uploadToCloudinary(fileBuffer, {
    resourceType: isImage ? 'image' : 'raw',
    folder: `careconnect/chat/${conversationId}`,
    allowedFormats: isImage 
      ? ['jpg', 'jpeg', 'png', 'gif', 'webp']
      : ['pdf', 'doc', 'docx', 'txt'],
    transformation: isImage ? [
      { quality: 'auto', fetch_format: 'auto' },
    ] : undefined,
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    format: result.format,
    size: result.bytes,
    resourceType: isImage ? 'image' : 'document',
  };
};

/**
 * Delete file from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @param {string} resourceType - Resource type (image, raw, video)
 * @returns {Promise<Object>} Deletion result
 */
export const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  if (!config.cloudinary.enabled) {
    throw ApiError.serverError('Cloudinary is not configured');
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
    return result;
  } catch (error) {
    console.error('Cloudinary deletion error:', error);
    throw ApiError.serverError('Failed to delete file from Cloudinary');
  }
};

/**
 * Delete multiple files from Cloudinary
 * @param {Array<string>} publicIds - Array of public IDs
 * @param {string} resourceType - Resource type
 * @returns {Promise<Object>} Deletion result
 */
export const deleteMultipleFromCloudinary = async (publicIds, resourceType = 'image') => {
  if (!config.cloudinary.enabled) {
    throw ApiError.serverError('Cloudinary is not configured');
  }

  try {
    const result = await cloudinary.api.delete_resources(publicIds, {
      resource_type: resourceType,
    });
    return result;
  } catch (error) {
    console.error('Cloudinary bulk deletion error:', error);
    throw ApiError.serverError('Failed to delete files from Cloudinary');
  }
};

/**
 * Get Cloudinary resource details
 * @param {string} publicId - Cloudinary public ID
 * @param {string} resourceType - Resource type
 * @returns {Promise<Object>} Resource details
 */
export const getCloudinaryResource = async (publicId, resourceType = 'image') => {
  if (!config.cloudinary.enabled) {
    throw ApiError.serverError('Cloudinary is not configured');
  }

  try {
    const result = await cloudinary.api.resource(publicId, {
      resource_type: resourceType,
    });
    return result;
  } catch (error) {
    console.error('Cloudinary resource fetch error:', error);
    throw ApiError.serverError('Failed to fetch resource from Cloudinary');
  }
};

export default {
  uploadToCloudinary,
  uploadImage,
  uploadAvatar,
  uploadDocument,
  uploadChatAttachment,
  deleteFromCloudinary,
  deleteMultipleFromCloudinary,
  getCloudinaryResource,
};
