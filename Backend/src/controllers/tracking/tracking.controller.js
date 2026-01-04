import bookingService from '../../services/booking.service.js';
import { ApiResponse, asyncHandler, ApiError } from '../../utils/apiResponse.js';
import { USER_ROLES } from '../../constants/index.js';
import { uploadImage } from '../../integrations/cloudinary/cloudinary.service.js';

export const checkInTracking = asyncHandler(async (req, res) => {
  const { bookingId, date, location, notes, verifiedBy } = req.body || {};

  if (!bookingId) {
    throw ApiError.badRequest('bookingId is required');
  }

  if (req.user.role !== USER_ROLES.CAREGIVER) {
    throw ApiError.forbidden('Only caregivers can check in tracking');
  }

  const result = await bookingService.checkInTracking(bookingId, req.user._id, {
    date,
    location,
    notes,
    verifiedBy,
  });

  res
    .status(200)
    .json(new ApiResponse(200, result, 'Tracking check-in recorded successfully'));
});

export const checkOutTracking = asyncHandler(async (req, res) => {
  const { bookingId, date, location, notes, verifiedBy } = req.body || {};

  if (!bookingId) {
    throw ApiError.badRequest('bookingId is required');
  }

  if (req.user.role !== USER_ROLES.CAREGIVER) {
    throw ApiError.forbidden('Only caregivers can check out tracking');
  }

  const result = await bookingService.checkOutTracking(bookingId, req.user._id, {
    date,
    location,
    notes,
    verifiedBy,
  });

  res
    .status(200)
    .json(new ApiResponse(200, result, 'Tracking check-out recorded successfully'));
});

export const submitTrackingLog = asyncHandler(async (req, res) => {
  const { bookingId, date, tasksCompleted, notes, issues, issueFlag, images } = req.body || {};

  if (!bookingId) {
    throw ApiError.badRequest('bookingId is required');
  }

  if (req.user.role !== USER_ROLES.CAREGIVER) {
    throw ApiError.forbidden('Only caregivers can submit tracking logs');
  }

  const normalizedIssueFlag =
    issueFlag === true ||
    issueFlag === 'true' ||
    issueFlag === 1 ||
    issueFlag === '1';

  const imageUrls = [];

  const bodyImages = Array.isArray(images)
    ? images
    : typeof images === 'string' && images.trim().length > 0
      ? [images]
      : [];

  imageUrls.push(
    ...bodyImages
      .filter((value) => typeof value === 'string' && value.trim().length > 0)
      .map((value) => value.trim())
  );

  if (Array.isArray(req.files) && req.files.length > 0) {
    const uploaded = await Promise.all(
      req.files.map((file, index) =>
        uploadImage(file.buffer, {
          folder: `careconnect/tracking/${bookingId}`,
          publicId: `tracking_${bookingId}_${Date.now()}_${index}`,
        }),
      ),
    );

    imageUrls.push(...uploaded.map((result) => result.url));
  }

  const result = await bookingService.submitTrackingLog(bookingId, req.user._id, {
    date,
    tasksCompleted,
    notes,
    issues,
    issueFlag: normalizedIssueFlag,
    images: [...new Set(imageUrls)],
  });

  res
    .status(200)
    .json(new ApiResponse(200, result, 'Daily tracking log submitted successfully'));
});

export const getTrackingLogs = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  if (!bookingId) {
    throw ApiError.badRequest('bookingId is required');
  }

  const result = await bookingService.getTrackingLogs(
    bookingId,
    req.user._id,
    req.user.role
  );

  res.status(200).json(new ApiResponse(200, result, 'Tracking logs fetched successfully'));
});

export const reviewTrackingLog = asyncHandler(async (req, res) => {
  const { bookingId, date } = req.params;
  const { action, approved, comment } = req.body || {};

  if (!bookingId || !date) {
    throw ApiError.badRequest('bookingId and date are required');
  }

  if (req.user.role !== USER_ROLES.CARESEEKER) {
    throw ApiError.forbidden('Only care seekers can review tracking logs');
  }

  const resolvedAction =
    action ||
    (approved === true ? 'approve' : approved === false ? 'flag' : undefined);

  if (!resolvedAction) {
    throw ApiError.badRequest('action is required (approve|flag)');
  }

  const result = await bookingService.reviewTrackingLog(
    bookingId,
    date,
    req.user._id,
    resolvedAction,
    comment || ''
  );

  res.status(200).json(new ApiResponse(200, result, 'Tracking review saved successfully'));
});

export const adminUpdateTrackingLog = asyncHandler(async (req, res) => {
  const { bookingId, date } = req.params;
  const { action, note } = req.body || {};

  if (!bookingId || !date) {
    throw ApiError.badRequest('bookingId and date are required');
  }

  if (!action) {
    throw ApiError.badRequest('action is required (override|penalize|dispute)');
  }

  const result = await bookingService.adminUpdateTrackingLog(
    bookingId,
    date,
    req.user._id,
    action,
    note || ''
  );

  res.status(200).json(new ApiResponse(200, result, 'Tracking admin action completed'));
});

export const getAdminTrackingOverview = asyncHandler(async (req, res) => {
  const result = await bookingService.getAdminTrackingOverview(req.query || {});
  res
    .status(200)
    .json(new ApiResponse(200, result, 'Admin tracking overview fetched successfully'));
});

export const sendTrackingReminder = asyncHandler(async (req, res) => {
  const { bookingId, date } = req.params;
  const { message } = req.body || {};

  if (!bookingId || !date) {
    throw ApiError.badRequest('bookingId and date are required');
  }

  const result = await bookingService.sendTrackingReminder(
    bookingId,
    date,
    req.user._id,
    {
      source: 'admin',
      message,
    },
  );

  res
    .status(200)
    .json(new ApiResponse(200, result, 'Tracking reminder sent successfully'));
});
