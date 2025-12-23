import Feedback, {
  FEEDBACK_STATUSES,
  FEEDBACK_TYPES,
} from '../../models/feedback.model.js';
import { ApiError, ApiResponse, asyncHandler } from '../../utils/apiResponse.js';
import { USER_ROLES } from '../../constants/index.js';
import { uploadImage } from '../../utils/cloudinary.js';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parsePagination = (query = {}) => {
  const page = toPositiveInt(query.page, DEFAULT_PAGE);
  const rawLimit = toPositiveInt(query.limit, DEFAULT_LIMIT);
  const limit = Math.min(rawLimit, MAX_LIMIT);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const buildFeedbackFilter = (query = {}, userId) => {
  const filter = {};

  if (userId) {
    filter.userId = userId;
  }

  if (query.type && FEEDBACK_TYPES.includes(query.type)) {
    filter.type = query.type;
  }

  if (query.status && FEEDBACK_STATUSES.includes(query.status)) {
    filter.status = query.status;
  }

  const search = String(query.search || '').trim();
  if (search) {
    const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { feedbackId: { $regex: safeSearch, $options: 'i' } },
      { title: { $regex: safeSearch, $options: 'i' } },
      { description: { $regex: safeSearch, $options: 'i' } },
    ];
  }

  return filter;
};

const getFeedbackStats = async () => {
  const [total, byStatusRaw] = await Promise.all([
    Feedback.countDocuments({}),
    Feedback.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const byStatus = FEEDBACK_STATUSES.reduce(
    (acc, status) => ({ ...acc, [status]: 0 }),
    {},
  );

  for (const item of byStatusRaw) {
    if (item?._id && typeof item.count === 'number') {
      byStatus[item._id] = item.count;
    }
  }

  return { total, byStatus };
};

export const createFeedback = asyncHandler(async (req, res) => {
  const { type, title, description, screenshotUrl } = req.body;

  if (!req.user?.isEmailVerified) {
    throw ApiError.forbidden('Please verify your email before submitting feedback');
  }

  const allowedRoles = [USER_ROLES.CAREGIVER, USER_ROLES.CARESEEKER, USER_ROLES.ADMIN];
  if (!allowedRoles.includes(req.user?.role)) {
    throw ApiError.forbidden('Only registered users can submit feedback');
  }

  if (!type || !FEEDBACK_TYPES.includes(type)) {
    throw ApiError.badRequest('A valid feedback type is required');
  }

  if (!title || String(title).trim().length < 3) {
    throw ApiError.badRequest('Feedback title must be at least 3 characters');
  }

  if (!description || String(description).trim().length < 10) {
    throw ApiError.badRequest('Feedback description must be at least 10 characters');
  }

  let screenshot = null;

  if (req.file) {
    try {
      const uploaded = await uploadImage(req.file.buffer, {
        folder: 'careconnect/feedback',
      });
      screenshot = {
        url: uploaded.url,
        publicId: uploaded.publicId,
      };
    } catch {
      throw ApiError.badRequest('Failed to upload screenshot');
    }
  } else if (typeof screenshotUrl === 'string' && screenshotUrl.trim()) {
    screenshot = {
      url: screenshotUrl.trim(),
      publicId: null,
    };
  }

  const feedback = await Feedback.create({
    userId: req.user._id,
    type,
    title: String(title).trim(),
    description: String(description).trim(),
    ...(screenshot ? { screenshot } : {}),
    status: FEEDBACK_STATUSES[0],
    auditLog: [
      {
        action: 'submitted',
        actorId: req.user._id,
        actorRole: req.user.role,
      },
    ],
  });

  const populated = await Feedback.findById(feedback._id).populate(
    'userId',
    'fullName email avatar role',
  );

  res
    .status(201)
    .json(new ApiResponse(201, { feedback: populated || feedback }, 'Feedback submitted successfully'));
});

export const getMyFeedback = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = buildFeedbackFilter(req.query, req.user._id);

  const [feedback, total] = await Promise.all([
    Feedback.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Feedback.countDocuments(filter),
  ]);

  res.status(200).json(
    new ApiResponse(200, {
      feedback,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    }, 'Feedback fetched successfully'),
  );
});

export const getFeedbackById = asyncHandler(async (req, res) => {
  const { feedbackId } = req.params;
  const feedback = await Feedback.findById(feedbackId)
    .populate('userId', 'fullName email avatar role')
    .populate('adminReview.updatedBy', 'fullName email role')
    .lean();

  if (!feedback) {
    throw ApiError.notFound('Feedback not found');
  }

  const isOwner = String(feedback.userId?._id || feedback.userId) === String(req.user._id);
  const isAdmin = req.user.role === 'admin';

  if (!isOwner && !isAdmin) {
    throw ApiError.forbidden('You are not allowed to view this feedback');
  }

  res.status(200).json(
    new ApiResponse(200, { feedback }, 'Feedback fetched successfully'),
  );
});

export const getAdminFeedback = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = buildFeedbackFilter(req.query);

  const [feedback, total, stats] = await Promise.all([
    Feedback.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'fullName email avatar role')
      .populate('adminReview.updatedBy', 'fullName email role')
      .lean(),
    Feedback.countDocuments(filter),
    getFeedbackStats(),
  ]);

  res.status(200).json(
    new ApiResponse(200, {
      feedback,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
      stats,
    }, 'Feedback moderation queue fetched successfully'),
  );
});

export const updateFeedbackStatus = asyncHandler(async (req, res) => {
  const { feedbackId } = req.params;
  const { status, note } = req.body;

  if (!status || !FEEDBACK_STATUSES.includes(status)) {
    throw ApiError.badRequest('A valid feedback status is required');
  }

  const feedback = await Feedback.findById(feedbackId);
  if (!feedback) {
    throw ApiError.notFound('Feedback not found');
  }

  feedback.status = status;
  feedback.adminReview = {
    updatedBy: req.user._id,
    updatedAt: new Date(),
    ...(typeof note === 'string' && note.trim() ? { note: note.trim() } : {}),
  };

  feedback.auditLog.push({
    action: 'status_updated',
    actorId: req.user._id,
    actorRole: req.user.role,
    ...(typeof note === 'string' && note.trim() ? { note: note.trim() } : {}),
  });

  await feedback.save();

  const populated = await Feedback.findById(feedback._id)
    .populate('userId', 'fullName email avatar role')
    .populate('adminReview.updatedBy', 'fullName email role');

  res.status(200).json(
    new ApiResponse(200, { feedback: populated || feedback }, 'Feedback status updated successfully'),
  );
});
