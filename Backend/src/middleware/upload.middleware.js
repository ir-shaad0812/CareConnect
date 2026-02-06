import multer from 'multer';
import { ApiError } from '../utils/apiResponse.js';

const allowedMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
];

const chatAllowedMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

const reviewAllowedMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-m4v',
];

const trackingAllowedMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

const feedbackAllowedMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

const maxFileSize = 5 * 1024 * 1024; // 5MB
const chatMaxFileSize = 10 * 1024 * 1024; // 10MB for chat
const reviewMaxFileSize = 25 * 1024 * 1024; // 25MB for short review videos
const reviewMaxFiles = 6; // multiple images + optional short video
const trackingMaxFileSize = 8 * 1024 * 1024; // 8MB per proof image
const trackingMaxFiles = 6;
const feedbackMaxFileSize = 8 * 1024 * 1024; // 8MB screenshot

// Use memory storage for Cloudinary uploads
// Files are stored in memory as Buffer objects
const storage = multer.memoryStorage();
const chatStorage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'Invalid file type. Allowed: JPEG, PNG, GIF, WebP, PDF'), false);
  }
};

const chatFileFilter = (req, file, cb) => {
  if (chatAllowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'Invalid file type for chat'), false);
  }
};

const reviewFileFilter = (req, file, cb) => {
  if (reviewAllowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new ApiError(
        400,
        'Invalid review media type. Allowed: JPEG, PNG, GIF, WebP, MP4, WebM, MOV',
      ),
      false,
    );
  }
};

const trackingFileFilter = (req, file, cb) => {
  if (trackingAllowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new ApiError(
        400,
        'Invalid tracking image type. Allowed: JPEG, PNG, GIF, WebP',
      ),
      false,
    );
  }
};

const feedbackFileFilter = (req, file, cb) => {
  if (feedbackAllowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new ApiError(
        400,
        'Invalid feedback screenshot type. Allowed: JPEG, PNG, GIF, WebP',
      ),
      false,
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: maxFileSize },
});

// Chat upload middleware
export const uploadMiddleware = multer({
  storage: chatStorage,
  fileFilter: chatFileFilter,
  limits: { fileSize: chatMaxFileSize },
});

export const uploadReviewMedia = multer({
  storage,
  fileFilter: reviewFileFilter,
  limits: {
    fileSize: reviewMaxFileSize,
    files: reviewMaxFiles,
  },
}).array('media', reviewMaxFiles);

export const uploadTrackingImages = multer({
  storage,
  fileFilter: trackingFileFilter,
  limits: {
    fileSize: trackingMaxFileSize,
    files: trackingMaxFiles,
  },
}).array('images', trackingMaxFiles);

export const uploadFeedbackScreenshot = multer({
  storage,
  fileFilter: feedbackFileFilter,
  limits: {
    fileSize: feedbackMaxFileSize,
    files: 1,
  },
}).single('screenshot');

export const uploadSingleDocument = upload.single('document');
export const uploadMultipleDocuments = upload.array('documents', 5);
export const uploadAvatar = upload.single('avatar');

/**
 * Multi-file upload for the /register/complete endpoint.
 * Accepts up to 5 files under the field name "documents".
 * document_types are sent as a parallel array "documentTypes".
 */
export const uploadRegistrationDocuments = upload.array('documents', 5);

export const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(ApiError.badRequest('File size exceeds the allowed limit'));
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return next(ApiError.badRequest('Too many files uploaded'));
    }
    return next(ApiError.badRequest(err.message));
  }
  next(err);
};
