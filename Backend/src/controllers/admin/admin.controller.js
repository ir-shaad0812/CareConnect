// ============================================
// ADMIN CONTROLLER
// Handles admin dashboard and management
// ============================================

import User from '../../models/user.model.js';
import Document from '../../models/document.model.js';
import Token from '../../models/token.model.js';
import Caregiver from '../../models/caregiver.model.js';
import CareSeeker from '../../models/careseeker.model.js';
import LocationLog from '../../models/locationLog.model.js';
import { eventBus } from '../../utils/eventBus.js';
import CaregiverDocument from '../../models/caregiverDocument.model.js';
import CareSeekerDocument from '../../models/careSeekerDocument.model.js';
import Booking from '../../models/booking.model.js';
import Dispute from '../../models/dispute.model.js';
import Review from '../../models/review.model.js';
import UserInteraction from '../../models/userInteraction.model.js';
import { ApiResponse, asyncHandler } from '../../utils/apiResponse.js';
import { USER_ROLES, USER_STATUS, DOCUMENT_STATUS } from '../../constants/index.js';
import { escapeRegExp } from '../../utils/security.utils.js';
import emailService from '../../services/email.service.js';
import locationService from '../../services/location.service.js';
import adminDashboardService from '../../services/adminDashboard.service.js';
import aiMatchService from '../../services/aiMatch.service.js';
import { invalidateCachedUser } from '../../utils/userCache.js';

const toFiniteNumber = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const normalizeCoordinatePair = (value) => {
  const lat = toFiniteNumber(value?.lat);
  const lng = toFiniteNumber(value?.lng);

  if (lat === null || lng === null) {
    return null;
  }

  return { lat, lng };
};

const normalizeGeoPoint = (value) => {
  if (!Array.isArray(value) || value.length < 2) {
    return null;
  }

  const lng = toFiniteNumber(value[0]);
  const lat = toFiniteNumber(value[1]);

  if (lat === null || lng === null) {
    return null;
  }

  return { lat, lng };
};

const parsePositiveInt = (value, fallback, max) => {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(parsed, max);
};

const ensureApprovedCaregiverProfile = async (userId) => {
  const now = new Date();

  await Caregiver.findOneAndUpdate(
    { userId },
    {
      $setOnInsert: {
        userId,
        languages: [],
        serviceTypes: [],
        skills: [],
      },
      $set: {
        searchable: true,
        verified: true,
        verifiedAt: now,
        lastActive: now,
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );
};

const resolveUserMapLocation = (user, profile, role) => {
  const proof = user?.locationProof || profile?.locationProof;

  const fromProof =
    normalizeCoordinatePair(proof?.selectedCoordinates) ||
    normalizeCoordinatePair(proof?.coordinates) ||
    normalizeCoordinatePair(proof?.gpsCoordinates);

  if (fromProof) {
    return {
      source: 'location_proof',
      coordinates: fromProof,
      accuracy: toFiniteNumber(proof?.accuracy),
      capturedAt: proof?.capturedAt || user?.updatedAt || null,
      address: proof?.address || user?.location?.address || null,
      city: proof?.city || user?.location?.city || profile?.careLocation?.city || null,
      state: proof?.state || user?.location?.state || profile?.careLocation?.state || null,
      country: proof?.country || user?.location?.country || profile?.careLocation?.country || null,
    };
  }

  if (role === USER_ROLES.CARESEEKER) {
    const careLocation = normalizeGeoPoint(profile?.careLocation?.coordinates?.coordinates);
    if (careLocation) {
      return {
        source: 'care_location',
        coordinates: careLocation,
        accuracy: null,
        capturedAt: user?.updatedAt || profile?.updatedAt || null,
        address: profile?.careLocation?.address || user?.location?.address || null,
        city: profile?.careLocation?.city || user?.location?.city || null,
        state: profile?.careLocation?.state || user?.location?.state || null,
        country: profile?.careLocation?.country || user?.location?.country || null,
      };
    }
  }

  const fromProfileLocation = normalizeGeoPoint(user?.location?.coordinates?.coordinates);
  if (fromProfileLocation) {
    return {
      source: 'profile_location',
      coordinates: fromProfileLocation,
      accuracy: null,
      capturedAt: user?.updatedAt || null,
      address: user?.location?.address || null,
      city: user?.location?.city || null,
      state: user?.location?.state || null,
      country: user?.location?.country || null,
    };
  }

  return null;
};

const toRecordCoordinates = (log) => {
  return normalizeCoordinatePair(log?.gpsCoordinates) || normalizeCoordinatePair(log?.manualCoordinates);
};

const ACTIVE_DISPUTE_STATUSES = ['open', 'investigating', 'awaiting_response', 'escalated'];
const LIVE_BOOKING_STATUSES = ['confirmed', 'active', 'in_progress', 'disputed'];

/**
 * Get dashboard statistics
 * GET /api/admin/dashboard/stats
 */
export const getDashboardStats = asyncHandler(async (req, res) => {
  const now = new Date();
  const oneWeekAgo = new Date(now); oneWeekAgo.setDate(now.getDate() - 7);
  const oneMonthAgo = new Date(now); oneMonthAgo.setMonth(now.getMonth() - 1);
  const prevMonthStart = new Date(now); prevMonthStart.setMonth(now.getMonth() - 2);

  const [
    totalUsers, totalCaregivers, totalCareseekers,
    pendingUsers, pendingApprovalUsers, activeUsers, suspendedUsers,
    pendingDocuments, verifiedDocuments, rejectedDocuments,
    newUsersThisWeek, newUsersThisMonth,
    bookingAgg, revenueAgg, prevRevenueAgg,
    activeBookings, pendingBookings, completedBookings,
  ] = await Promise.all([
    User.countDocuments({ role: { $ne: USER_ROLES.ADMIN } }),
    User.countDocuments({ role: USER_ROLES.CAREGIVER }),
    User.countDocuments({ role: USER_ROLES.CARESEEKER }),
    User.countDocuments({ status: USER_STATUS.PENDING }),
    User.countDocuments({ status: USER_STATUS.PENDING_APPROVAL }),
    User.countDocuments({ status: USER_STATUS.ACTIVE }),
    User.countDocuments({ status: USER_STATUS.SUSPENDED }),
    Document.countDocuments({ status: DOCUMENT_STATUS.PENDING }),
    Document.countDocuments({ status: DOCUMENT_STATUS.VERIFIED }),
    Document.countDocuments({ status: DOCUMENT_STATUS.REJECTED }),
    User.countDocuments({ createdAt: { $gte: oneWeekAgo }, role: { $ne: USER_ROLES.ADMIN } }),
    User.countDocuments({ createdAt: { $gte: oneMonthAgo }, role: { $ne: USER_ROLES.ADMIN } }),
    Booking.aggregate([
      { $group: { _id: null, total: { $sum: 1 }, thisMonth: { $sum: { $cond: [{ $gte: ['$createdAt', oneMonthAgo] }, 1, 0] } } } },
    ]),
    Booking.aggregate([
      { $match: { paymentStatus: { $in: ['fully_paid', 'partially_paid'] }, createdAt: { $gte: oneMonthAgo } } },
      { $group: { _id: null, total: { $sum: '$pricing.total' } } },
    ]),
    Booking.aggregate([
      { $match: { paymentStatus: { $in: ['fully_paid', 'partially_paid'] }, createdAt: { $gte: prevMonthStart, $lt: oneMonthAgo } } },
      { $group: { _id: null, total: { $sum: '$pricing.total' } } },
    ]),
    Booking.countDocuments({ status: 'active' }),
    Booking.countDocuments({ status: 'pending' }),
    Booking.countDocuments({ status: 'completed' }),
  ]);

  const totalBookings = bookingAgg[0]?.total || 0;
  const bookingsThisMonth = bookingAgg[0]?.thisMonth || 0;
  const revenueThisMonth = revenueAgg[0]?.total || 0;
  const revenuePrevMonth = prevRevenueAgg[0]?.total || 0;
  const revenueGrowth = revenuePrevMonth > 0
    ? Math.round(((revenueThisMonth - revenuePrevMonth) / revenuePrevMonth) * 100)
    : 0;

  res.status(200).json(
    new ApiResponse(200, {
      users: {
        total: totalUsers,
        caregivers: totalCaregivers,
        careseekers: totalCareseekers,
        pending: pendingUsers,
        pendingApproval: pendingApprovalUsers,
        active: activeUsers,
        suspended: suspendedUsers,
        newThisWeek: newUsersThisWeek,
        newThisMonth: newUsersThisMonth,
      },
      documents: {
        pending: pendingDocuments,
        verified: verifiedDocuments,
        rejected: rejectedDocuments,
      },
      bookings: {
        total: totalBookings,
        thisMonth: bookingsThisMonth,
        active: activeBookings,
        pending: pendingBookings,
        completed: completedBookings,
      },
      revenue: {
        thisMonth: revenueThisMonth,
        prevMonth: revenuePrevMonth,
        growthPercent: revenueGrowth,
      },
    }, req.t('admin', 'statsSuccess'))
  );
});

/**
 * Get live system stats for admin control center
 * GET /api/admin/system-stats
 */
export const getSystemStats = asyncHandler(async (req, res) => {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const onlineThreshold = new Date(now.getTime() - (5 * 60 * 1000));

  const [
    activeBookings,
    pendingApprovals,
    onlineCaregivers,
    activeDisputes,
    trackingSummaryResult,
    latestTrackingItems,
    latestDisputes,
  ] = await Promise.all([
    Booking.countDocuments({ status: { $in: LIVE_BOOKING_STATUSES } }),
    User.countDocuments({ status: USER_STATUS.PENDING_APPROVAL }),
    User.countDocuments({
      role: USER_ROLES.CAREGIVER,
      status: USER_STATUS.ACTIVE,
      notificationDevices: {
        $elemMatch: {
          lastSeenAt: { $gte: onlineThreshold },
        },
      },
    }),
    Dispute.countDocuments({
      isDeleted: false,
      status: { $in: ACTIVE_DISPUTE_STATUSES },
    }),
    Booking.aggregate([
      {
        $match: {
          status: { $in: [...LIVE_BOOKING_STATUSES, 'completed'] },
          trackingLogs: { $exists: true, $ne: [] },
        },
      },
      { $unwind: '$trackingLogs' },
      {
        $group: {
          _id: null,
          todayCheckIns: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ['$trackingLogs.date', startOfDay] },
                    { $lt: ['$trackingLogs.date', endOfDay] },
                    {
                      $or: [
                        { $ne: ['$trackingLogs.checkInTime', null] },
                        { $eq: ['$trackingLogs.status', 'SUBMITTED'] },
                      ],
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },
          pendingLogs: {
            $sum: {
              $cond: [{ $eq: ['$trackingLogs.status', 'PENDING'] }, 1, 0],
            },
          },
          flaggedLogs: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: ['$trackingLogs.status', 'FLAGGED'] },
                    { $eq: ['$trackingLogs.issueFlag', true] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          lateCheckIns: {
            $sum: {
              $cond: [{ $eq: ['$trackingLogs.lateSubmission', true] }, 1, 0],
            },
          },
          missedCheckIns: {
            $sum: {
              $cond: [{ $eq: ['$trackingLogs.missed', true] }, 1, 0],
            },
          },
        },
      },
    ]),
    Booking.aggregate([
      {
        $match: {
          status: { $in: [...LIVE_BOOKING_STATUSES, 'completed'] },
          trackingLogs: { $exists: true, $ne: [] },
        },
      },
      { $unwind: '$trackingLogs' },
      {
        $match: {
          $or: [
            { 'trackingLogs.status': 'FLAGGED' },
            { 'trackingLogs.status': 'PENDING' },
            { 'trackingLogs.missed': true },
            { 'trackingLogs.lateSubmission': true },
            { 'trackingLogs.issueFlag': true },
          ],
        },
      },
      {
        $project: {
          bookingId: '$_id',
          bookingNumber: '$bookingNumber',
          status: '$trackingLogs.status',
          issueFlag: '$trackingLogs.issueFlag',
          missed: '$trackingLogs.missed',
          lateSubmission: '$trackingLogs.lateSubmission',
          timestamp: {
            $ifNull: ['$trackingLogs.updatedAt', '$trackingLogs.date'],
          },
        },
      },
      { $sort: { timestamp: -1 } },
      { $limit: 4 },
    ]),
    Dispute.find({
      isDeleted: false,
      status: { $in: ACTIVE_DISPUTE_STATUSES },
    })
      .select('_id ticketNumber priority status subject bookingId createdAt')
      .populate('bookingId', 'bookingNumber')
      .sort({ createdAt: -1 })
      .limit(4)
      .lean(),
  ]);

  const trackingSummary = trackingSummaryResult[0] || {
    todayCheckIns: 0,
    pendingLogs: 0,
    flaggedLogs: 0,
    lateCheckIns: 0,
    missedCheckIns: 0,
  };

  const metrics = {
    activeBookings,
    todayCheckIns: trackingSummary.todayCheckIns || 0,
    missedCheckIns: trackingSummary.missedCheckIns || 0,
    lateCheckIns: trackingSummary.lateCheckIns || 0,
    pendingLogs: trackingSummary.pendingLogs || 0,
    flaggedLogs: trackingSummary.flaggedLogs || 0,
    activeDisputes,
    pendingApprovals,
    onlineCaregivers,
  };

  const baseLogs = Math.max(metrics.todayCheckIns, 1);
  const flaggedRateRaw = (metrics.flaggedLogs / baseLogs) * 100;
  const missedRateRaw = (metrics.missedCheckIns / baseLogs) * 100;
  const disputeLoadRaw = metrics.activeBookings > 0
    ? (metrics.activeDisputes / metrics.activeBookings) * 100
    : metrics.activeDisputes > 0 ? 100 : 0;

  const toPercent = (value) => Math.round(Math.max(0, Math.min(100, value)) * 10) / 10;

  const healthSignals = {
    flaggedRate: toPercent(flaggedRateRaw),
    missedRate: toPercent(missedRateRaw),
    disputeLoad: toPercent(disputeLoadRaw),
  };

  let healthScore = 100;
  healthScore -= Math.min(healthSignals.flaggedRate * 0.4, 22);
  healthScore -= Math.min(healthSignals.missedRate * 0.5, 28);
  healthScore -= Math.min(healthSignals.disputeLoad * 0.3, 22);
  if (metrics.pendingApprovals >= 10) {
    healthScore -= 10;
  } else if (metrics.pendingApprovals >= 4) {
    healthScore -= 5;
  }

  const normalizedScore = Math.max(0, Math.min(100, Math.round(healthScore)));
  const healthStatus = normalizedScore >= 80
    ? 'healthy'
    : normalizedScore >= 60
      ? 'warning'
      : 'critical';

  const resolveSeverity = (value, warningThreshold, criticalThreshold) => {
    if (value >= criticalThreshold) return 'critical';
    if (value >= warningThreshold) return 'high';
    return 'medium';
  };

  const alerts = [];

  if (metrics.flaggedLogs > 0) {
    alerts.push({
      id: 'tracking-flagged-logs',
      type: 'tracking',
      severity: resolveSeverity(metrics.flaggedLogs, 2, 6),
      title: 'Flagged Tracking Logs',
      message: `${metrics.flaggedLogs} logs require admin intervention.`,
      count: metrics.flaggedLogs,
      actionUrl: '/admin/tracking',
    });
  }

  if (metrics.activeDisputes > 0) {
    alerts.push({
      id: 'dispute-active-cases',
      type: 'dispute',
      severity: resolveSeverity(metrics.activeDisputes, 2, 6),
      title: 'Active Disputes',
      message: `${metrics.activeDisputes} unresolved dispute cases are in queue.`,
      count: metrics.activeDisputes,
      actionUrl: '/admin/disputes',
    });
  }

  if (metrics.pendingApprovals > 0) {
    alerts.push({
      id: 'approval-pending-users',
      type: 'approval',
      severity: resolveSeverity(metrics.pendingApprovals, 4, 10),
      title: 'Pending User Approvals',
      message: `${metrics.pendingApprovals} users are waiting for admin approval.`,
      count: metrics.pendingApprovals,
      actionUrl: '/admin/users?status=pending_approval',
    });
  }

  if (metrics.missedCheckIns > 0 || metrics.lateCheckIns > 0) {
    const operationalCount = metrics.missedCheckIns + metrics.lateCheckIns;
    alerts.push({
      id: 'operations-attendance-risk',
      type: 'operations',
      severity: resolveSeverity(operationalCount, 3, 8),
      title: 'Attendance Risks Detected',
      message: `${metrics.missedCheckIns} missed and ${metrics.lateCheckIns} late submissions logged.`,
      count: operationalCount,
      actionUrl: '/admin/tracking',
    });
  }

  const trackingFeed = latestTrackingItems.map((item) => {
    let severity = 'medium';
    if (item.missed || item.issueFlag || item.status === 'FLAGGED') {
      severity = 'critical';
    } else if (item.lateSubmission || item.status === 'PENDING') {
      severity = 'high';
    }

    const statusText = item.status === 'FLAGGED'
      ? 'Flagged log'
      : item.status === 'PENDING'
        ? 'Pending log'
        : item.missed
          ? 'Missed check-in'
          : item.lateSubmission
            ? 'Late submission'
            : 'Tracking event';

    return {
      id: `tracking-${String(item.bookingId)}-${new Date(item.timestamp).getTime()}`,
      type: 'tracking',
      severity,
      title: statusText,
      description: `Booking #${item.bookingNumber} needs tracking attention.`,
      bookingNumber: item.bookingNumber,
      actionUrl: '/admin/tracking',
      timestamp: item.timestamp,
    };
  });

  const disputeFeed = latestDisputes.map((dispute) => {
    const priority = dispute.priority || 'medium';
    const severity = priority === 'critical' || priority === 'high'
      ? 'critical'
      : priority === 'medium'
        ? 'high'
        : 'medium';

    return {
      id: `dispute-${String(dispute._id)}`,
      type: 'dispute',
      severity,
      title: `Dispute ${dispute.ticketNumber || ''}`.trim(),
      description: dispute.subject || 'New dispute requires review.',
      ticketNumber: dispute.ticketNumber,
      actionUrl: '/admin/disputes',
      timestamp: dispute.createdAt,
    };
  });

  const feed = [...trackingFeed, ...disputeFeed]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 6);

  const severityOrder = { critical: 3, high: 2, medium: 1 };
  const sortedAlerts = alerts
    .sort((a, b) => (severityOrder[b.severity] - severityOrder[a.severity]) || (b.count - a.count))
    .slice(0, 4);

  res.status(200).json(
    new ApiResponse(200, {
      metrics,
      health: {
        status: healthStatus,
        score: normalizedScore,
        signals: healthSignals,
      },
      alerts: sortedAlerts,
      feed,
      generatedAt: now.toISOString(),
    }, req.t('admin', 'statsSuccess'))
  );
});

/**
 * Get all users with filters (Admin)
 * GET /api/admin/users
 */
export const getAllUsers = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    role,
    status,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;

  const filter = { role: { $ne: USER_ROLES.ADMIN } };

  if (role) filter.role = role;
  if (status) filter.status = status;
  if (search) {
    // SECURITY: Escape regex to prevent ReDoS attacks
    const safeSearch = escapeRegExp(search.trim().slice(0, 100));
    filter.$or = [
      { fullName: { $regex: safeSearch, $options: 'i' } },
      { email: { $regex: safeSearch, $options: 'i' } },
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('-password')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit)),
    User.countDocuments(filter),
  ]);

  res.status(200).json(
    new ApiResponse(200, {
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    }, req.t('admin', 'usersFetched'))
  );
});

/**
 * Get user details by ID (Admin)
 * GET /api/admin/users/:userId
 */
export const getUserDetails = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.userId).select('-password');
  
  if (!user) {
    return res.status(404).json(
      new ApiResponse(404, null, req.t('user', 'userNotFound'))
    );
  }

  const documents = await Document.find({ userId: user._id });

  res.status(200).json(
    new ApiResponse(200, { user, documents }, req.t('user', 'profileFetched'))
  );
});

/**
 * Update user status (Admin)
 * PATCH /api/admin/users/:userId/status
 */
export const updateUserStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const validStatuses = Object.values(USER_STATUS);

  if (!validStatuses.includes(status)) {
    return res.status(400).json(
      new ApiResponse(400, null, req.t('common', 'badRequest'))
    );
  }

  const user = await User.findByIdAndUpdate(
    req.params.userId,
    { status },
    { new: true }
  ).select('-password');

  if (!user) {
    return res.status(404).json(
      new ApiResponse(404, null, req.t('user', 'userNotFound'))
    );
  }

  invalidateCachedUser(user._id);

  res.status(200).json(
    new ApiResponse(200, { user }, req.t('admin', 'userUpdated'))
  );
});

/**
 * Update user role (Admin)
 * PATCH /api/admin/users/:userId/role
 */
export const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  const validRoles = Object.values(USER_ROLES).filter(r => r !== USER_ROLES.ADMIN);

  if (!validRoles.includes(role)) {
    return res.status(400).json(
      new ApiResponse(400, null, req.t('common', 'badRequest'))
    );
  }

  const user = await User.findByIdAndUpdate(
    req.params.userId,
    { role },
    { new: true }
  ).select('-password');

  if (!user) {
    return res.status(404).json(
      new ApiResponse(404, null, req.t('user', 'userNotFound'))
    );
  }

  res.status(200).json(
    new ApiResponse(200, { user }, req.t('admin', 'userUpdated'))
  );
});

/**
 * Get all documents for verification (Admin)
 * GET /api/admin/documents
 */
export const getAllDocuments = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    status,
    type,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (type) filter.documentType = type;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [documents, total] = await Promise.all([
    Document.find(filter)
      .populate('userId', 'fullName email role')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit)),
    Document.countDocuments(filter),
  ]);

  res.status(200).json(
    new ApiResponse(200, {
      documents,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    }, req.t('admin', 'documentsFetched'))
  );
});

/**
 * Verify document (Admin)
 * PATCH /api/admin/documents/:documentId/verify
 */
export const verifyDocument = asyncHandler(async (req, res) => {
  const document = await Document.findByIdAndUpdate(
    req.params.documentId,
    {
      status: DOCUMENT_STATUS.VERIFIED,
      verifiedBy: req.user._id,
      verifiedAt: new Date(),
    },
    { new: true }
  ).populate('userId', 'fullName email');

  if (!document) {
    return res.status(404).json(
      new ApiResponse(404, null, req.t('document', 'notFound'))
    );
  }

  // Check if all user documents are verified, then update user status
  const userDocuments = await Document.find({ userId: document.userId._id });
  const allVerified = userDocuments.every(doc => doc.status === DOCUMENT_STATUS.VERIFIED);
  
  if (allVerified) {
    const verifiedUser = await User.findByIdAndUpdate(
      document.userId._id,
      { status: USER_STATUS.ACTIVE },
      { new: true }
    );

    if (verifiedUser?.role === USER_ROLES.CAREGIVER) {
      await ensureApprovedCaregiverProfile(verifiedUser._id);
      aiMatchService.invalidateCandidateCache();
    }
  }

  res.status(200).json(
    new ApiResponse(200, { document }, req.t('document', 'verifySuccess'))
  );
});

/**
 * Reject document (Admin)
 * PATCH /api/admin/documents/:documentId/reject
 */
export const rejectDocument = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const document = await Document.findByIdAndUpdate(
    req.params.documentId,
    {
      status: DOCUMENT_STATUS.REJECTED,
      rejectionReason: reason || 'Document rejected by admin',
      verifiedBy: req.user._id,
      verifiedAt: new Date(),
    },
    { new: true }
  ).populate('userId', 'fullName email');

  if (!document) {
    return res.status(404).json(
      new ApiResponse(404, null, req.t('document', 'notFound'))
    );
  }

  res.status(200).json(
    new ApiResponse(200, { document }, req.t('document', 'rejectSuccess'))
  );
});

/**
 * Get recent activities (Admin)
 * GET /api/admin/activities
 */
export const getRecentActivities = asyncHandler(async (req, res) => {
  const { limit = 20 } = req.query;

  // Get recent user registrations
  const recentUsers = await User.find({ role: { $ne: USER_ROLES.ADMIN } })
    .select('fullName email role status createdAt')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));

  // Get recent document submissions
  const recentDocuments = await Document.find()
    .populate('userId', 'fullName email')
    .select('documentType status createdAt userId')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));

  // Combine and sort activities
  const activities = [
    ...recentUsers.map(user => ({
      type: 'user_registration',
      user: { fullName: user.fullName, email: user.email },
      role: user.role,
      status: user.status,
      timestamp: user.createdAt,
    })),
    ...recentDocuments.map(doc => ({
      type: 'document_submission',
      user: doc.userId ? { fullName: doc.userId.fullName, email: doc.userId.email } : null,
      documentType: doc.documentType,
      status: doc.status,
      timestamp: doc.createdAt,
    })),
  ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, parseInt(limit));

  res.status(200).json(
    new ApiResponse(200, { activities }, req.t('admin', 'statsSuccess'))
  );
});

/**
 * Approve user (Admin)
 * Activates pending_approval users
 * POST /api/admin/users/:userId/approve
 */
export const approveUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.userId);
  
  if (!user) {
    return res.status(404).json(
      new ApiResponse(404, null, req.t('user', 'userNotFound'))
    );
  }

  if (user.status !== USER_STATUS.PENDING_APPROVAL) {
    return res.status(400).json(
      new ApiResponse(400, null, 'User is not pending approval')
    );
  }

  user.status = USER_STATUS.ACTIVE;
  await user.save();
  invalidateCachedUser(user._id);

  if (user.role === USER_ROLES.CAREGIVER) {
    await ensureApprovedCaregiverProfile(user._id);
    aiMatchService.invalidateCandidateCache();
  }

  // Real-time: notify the approved user and all admin observers
  const userJson = user.toJSON();
  eventBus.emitToUser(user._id.toString(), 'admin:user_approved', {
    status: USER_STATUS.ACTIVE,
    message: 'Your account has been approved! You can now access the platform.',
  });
  eventBus.emitToAdmins('admin:user_status_changed', {
    userId: user._id.toString(),
    status: USER_STATUS.ACTIVE,
    action: 'approve',
    user: userJson,
  });

  // Send approval email
  try {
    await emailService.sendApprovalEmail(user.email, user.fullName);
  } catch (emailError) {
    console.log('⚠️ Failed to send approval email:', emailError.message);
  }

  res.status(200).json(
    new ApiResponse(200, { user: userJson }, 'User approved successfully')
  );
});

/**
 * Reject user (Admin)
 * Rejects a pending_approval user and terminates all sessions
 * POST /api/admin/users/:userId/reject
 */
export const rejectUser = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const user = await User.findById(req.params.userId);

  if (!user) {
    return res.status(404).json(
      new ApiResponse(404, null, req.t('user', 'userNotFound'))
    );
  }

  if (user.role === USER_ROLES.ADMIN) {
    return res.status(403).json(
      new ApiResponse(403, null, 'Cannot reject admin users')
    );
  }

  user.status = USER_STATUS.REJECTED;
  await user.save();
  invalidateCachedUser(user._id);

  // Terminate all sessions
  await Token.deleteMany({ userId: user._id });

  // Real-time: notify the rejected user and all admin observers
  const rejectedUserJson = user.toJSON();
  eventBus.emitToUser(user._id.toString(), 'admin:user_rejected', {
    status: USER_STATUS.REJECTED,
    reason: reason || 'Your application did not meet our requirements.',
    message: 'Your account application has been rejected. Please contact support.',
  });
  eventBus.emitToAdmins('admin:user_status_changed', {
    userId: user._id.toString(),
    status: USER_STATUS.REJECTED,
    action: 'reject',
    reason,
    user: rejectedUserJson,
  });

  // Send rejection email
  try {
    await emailService.sendAccountRejectedEmail?.(user.email, user.fullName, reason || 'Your application did not meet our requirements.');
  } catch (emailError) {
    console.log('⚠️ Failed to send rejection email:', emailError.message);
  }

  res.status(200).json(
    new ApiResponse(200, { user: rejectedUserJson }, 'User rejected successfully')
  );
});

/**
 * Suspend user (Admin)
 * Suspends user and terminates all sessions
 * POST /api/admin/users/:userId/suspend
 */
export const suspendUser = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const user = await User.findById(req.params.userId);
  
  if (!user) {
    return res.status(404).json(
      new ApiResponse(404, null, req.t('user', 'userNotFound'))
    );
  }

  if (user.role === USER_ROLES.ADMIN) {
    return res.status(403).json(
      new ApiResponse(403, null, 'Cannot suspend admin users')
    );
  }

  // Update user status
  user.status = USER_STATUS.SUSPENDED;
  await user.save();
  invalidateCachedUser(user._id);

  // Terminate all sessions by deleting all refresh tokens
  await Token.deleteMany({ userId: user._id });

  // Real-time: force-disconnect the suspended user and notify all admins
  const suspendedUserJson = user.toJSON();
  eventBus.emitToUser(user._id.toString(), 'admin:account_suspended', {
    status: USER_STATUS.SUSPENDED,
    reason: reason || 'Your account has been suspended.',
    message: 'Your account has been suspended. You have been logged out.',
  });
  eventBus.emitToAdmins('admin:user_status_changed', {
    userId: user._id.toString(),
    status: USER_STATUS.SUSPENDED,
    action: 'suspend',
    reason,
    user: suspendedUserJson,
  });

  // Send suspension email
  try {
    await emailService.sendAccountSuspendedEmail(user.email, user.fullName, reason);
  } catch (emailError) {
    console.log('⚠️ Failed to send suspension email:', emailError.message);
  }

  res.status(200).json(
    new ApiResponse(200, { user: suspendedUserJson }, 'User suspended and all sessions terminated')
  );
});

/**
 * Delete user permanently (Admin)
 * Deletes user and all related data, terminates sessions
 * DELETE /api/admin/users/:userId
 */
export const deleteUser = asyncHandler(async (req, res) => {
  const { sendEmail = true } = req.body || {};
  const user = await User.findById(req.params.userId);
  
  if (!user) {
    return res.status(404).json(
      new ApiResponse(404, null, req.t('user', 'userNotFound'))
    );
  }

  if (user.role === USER_ROLES.ADMIN) {
    return res.status(403).json(
      new ApiResponse(403, null, 'Cannot delete admin users')
    );
  }

  const userEmail = user.email;
  const userFullName = user.fullName;
  const userRole = user.role;

  // 1. Delete all tokens (terminate all sessions immediately)
  await Token.deleteMany({ userId: user._id });
  invalidateCachedUser(user._id);
  console.log(`🔒 All sessions terminated for user: ${userEmail}`);

  // 2. Delete role-specific profile and documents
  if (userRole === USER_ROLES.CAREGIVER) {
    const caregiverProfiles = await Caregiver.find({
      $or: [{ userId: user._id }, { _id: user._id }],
    }).select('_id');

    if (caregiverProfiles.length > 0) {
      await CaregiverDocument.deleteMany({
        caregiverId: { $in: caregiverProfiles.map((p) => p._id) },
      });
    }

    await Caregiver.deleteMany({
      $or: [{ userId: user._id }, { _id: user._id }],
    });

    console.log(`📄 Caregiver profile and documents deleted for: ${userEmail}`);
  } else if (userRole === USER_ROLES.CARESEEKER) {
    const careSeekerProfile = await CareSeeker.findOne({ userId: user._id });
    if (careSeekerProfile) {
      // Delete care seeker documents
      await CareSeekerDocument.deleteMany({ careSeekerId: careSeekerProfile._id });
      // Delete care seeker profile
      await CareSeeker.deleteOne({ userId: user._id });
      console.log(`📄 CareSeeker profile and documents deleted for: ${userEmail}`);
    }
  }

  // 3. Delete general documents
  await Document.deleteMany({ userId: user._id });

  // 4. Delete the user
  await User.deleteOne({ _id: user._id });
  console.log(`🗑️ User permanently deleted: ${userEmail}`);

  // 5. Send deletion email
  if (sendEmail) {
    try {
      await emailService.sendAccountDeletedEmail(userEmail, userFullName);
    } catch (emailError) {
      console.log('⚠️ Failed to send deletion email:', emailError.message);
    }
  }

  res.status(200).json(
    new ApiResponse(200, null, 'User and all related data deleted permanently')
  );
});

/**
 * Get all caregivers with profiles (Admin)
 * GET /api/admin/caregivers
 */
export const getAllCaregivers = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    status,
    backgroundCheck,
    verified,
    featured,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;

  // First get users who are caregivers
  const userFilter = { role: USER_ROLES.CAREGIVER };
  if (status) userFilter.status = status;
  if (search) {
    const safeSearch = escapeRegExp(search.trim().slice(0, 100));
    userFilter.$or = [
      { fullName: { $regex: safeSearch, $options: 'i' } },
      { email: { $regex: safeSearch, $options: 'i' } },
    ];
  }

  const statusAlias = {
    pending: 'in_progress',
    completed: 'passed',
  };

  const normalizedBackgroundCheck = backgroundCheck
    ? (statusAlias[backgroundCheck] || backgroundCheck)
    : null;

  const profileFilter = {};
  if (typeof verified !== 'undefined') {
    profileFilter.verified = verified === 'true';
  }
  if (typeof featured !== 'undefined') {
    profileFilter.featured = featured === 'true';
  }
  if (normalizedBackgroundCheck) {
    profileFilter['backgroundCheck.status'] = normalizedBackgroundCheck;
  }

  if (Object.keys(profileFilter).length > 0) {
    const matchedProfiles = await Caregiver.find(profileFilter).select('userId');
    const matchedUserIds = matchedProfiles.map((p) => p.userId);
    userFilter._id = { $in: matchedUserIds };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const users = await User.find(userFilter)
    .select('-password')
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit));

  const total = await User.countDocuments(userFilter);

  // Get caregiver profiles
  const userIds = users.map(u => u._id);
  const profiles = await Caregiver.find({ userId: { $in: userIds } });
  
  // Merge user and profile data
  const caregivers = users.map(user => {
    const profile = profiles.find(p => p.userId.toString() === user._id.toString());
    return {
      ...user.toJSON(),
      profile: profile || null,
    };
  });

  res.status(200).json(
    new ApiResponse(200, {
      caregivers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    }, 'Caregivers fetched successfully')
  );
});

/**
 * Get all care seekers with profiles (Admin)
 * GET /api/admin/care-seekers
 */
export const getAllCareSeekers = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    status,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;

  const userFilter = { role: USER_ROLES.CARESEEKER };
  if (status) userFilter.status = status;
  if (search) {
    const safeSearch = escapeRegExp(search.trim().slice(0, 100));
    userFilter.$or = [
      { fullName: { $regex: safeSearch, $options: 'i' } },
      { email: { $regex: safeSearch, $options: 'i' } },
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const users = await User.find(userFilter)
    .select('-password')
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit));

  const total = await User.countDocuments(userFilter);

  // Get care seeker profiles
  const userIds = users.map(u => u._id);
  const profiles = await CareSeeker.find({ userId: { $in: userIds } });
  
  // Merge user and profile data
  const careSeekers = users.map(user => {
    const profile = profiles.find(p => p.userId.toString() === user._id.toString());
    return {
      ...user.toJSON(),
      profile: profile || null,
    };
  });

  res.status(200).json(
    new ApiResponse(200, {
      careSeekers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    }, 'Care seekers fetched successfully')
  );
});

/**
 * Get map locations for caregivers and care seekers (Admin)
 * GET /api/admin/map/locations
 */
export const getMapLocations = asyncHandler(async (req, res) => {
  const {
    verifiedOnly = 'false',
    includeInactive = 'true',
    limitPerRole = '1000',
    recordsLimit = '400',
  } = req.query;

  const enforceVerifiedOnly = verifiedOnly === 'true';
  const shouldIncludeInactive = includeInactive !== 'false';
  const perRoleLimit = parsePositiveInt(limitPerRole, 1000, 5000);
  const locationRecordsLimit = parsePositiveInt(recordsLimit, 400, 2000);

  const caregiverUserFilter = { role: USER_ROLES.CAREGIVER };
  const careSeekerUserFilter = { role: USER_ROLES.CARESEEKER };

  if (!shouldIncludeInactive) {
    caregiverUserFilter.status = USER_STATUS.ACTIVE;
    careSeekerUserFilter.status = USER_STATUS.ACTIVE;
  }

  const [caregiverUsers, careSeekerUsers] = await Promise.all([
    User.find(caregiverUserFilter)
      .select('fullName email phone role status profilePicture profileImage location locationProof createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .limit(perRoleLimit)
      .lean(),
    User.find(careSeekerUserFilter)
      .select('fullName email phone role status profilePicture profileImage location locationProof createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .limit(perRoleLimit)
      .lean(),
  ]);

  const caregiverUserIds = caregiverUsers.map((user) => user._id);
  const careSeekerUserIds = careSeekerUsers.map((user) => user._id);

  const [caregiverProfiles, careSeekerProfiles] = await Promise.all([
    Caregiver.find({ userId: { $in: caregiverUserIds } })
      .select('userId verified rating completionPercentage serviceTypes backgroundCheck')
      .lean(),
    CareSeeker.find({ userId: { $in: careSeekerUserIds } })
      .select('userId verified completionPercentage careNeeds careLocation')
      .lean(),
  ]);

  const caregiverProfileMap = new Map(
    caregiverProfiles.map((profile) => [profile.userId.toString(), profile])
  );
  const careSeekerProfileMap = new Map(
    careSeekerProfiles.map((profile) => [profile.userId.toString(), profile])
  );

  const caregivers = caregiverUsers
    .map((user) => {
      const userId = user._id.toString();
      const profile = caregiverProfileMap.get(userId) || null;
      const location = resolveUserMapLocation(user, profile, USER_ROLES.CAREGIVER);

      if (!location) {
        return null;
      }

      const isVerified = Boolean(profile?.verified || user?.locationProof?.verified);

      if (enforceVerifiedOnly && !isVerified) {
        return null;
      }

      return {
        userId,
        userType: 'caregiver',
        fullName: user.fullName,
        email: user.email,
        phone: user.phone || null,
        isActive: user.status === USER_STATUS.ACTIVE,
        isVerified,
        verificationStatus: user?.locationProof?.status || (isVerified ? 'verified' : 'pending'),
        rating: toFiniteNumber(profile?.rating),
        completionPercentage: toFiniteNumber(profile?.completionPercentage),
        serviceTypes: Array.isArray(profile?.serviceTypes) ? profile.serviceTypes : [],
        profileImage: user.profilePicture || user.profileImage || null,
        location,
      };
    })
    .filter(Boolean);

  const careSeekers = careSeekerUsers
    .map((user) => {
      const userId = user._id.toString();
      const profile = careSeekerProfileMap.get(userId) || null;
      const location = resolveUserMapLocation(user, profile, USER_ROLES.CARESEEKER);

      if (!location) {
        return null;
      }

      const isVerified = Boolean(profile?.verified || user?.locationProof?.verified);

      if (enforceVerifiedOnly && !isVerified) {
        return null;
      }

      return {
        userId,
        userType: 'careseeker',
        fullName: user.fullName,
        email: user.email,
        phone: user.phone || null,
        isActive: user.status === USER_STATUS.ACTIVE,
        isVerified,
        verificationStatus: user?.locationProof?.status || (isVerified ? 'verified' : 'pending'),
        rating: null,
        completionPercentage: toFiniteNumber(profile?.completionPercentage),
        serviceTypes: Array.isArray(profile?.careNeeds) ? profile.careNeeds : [],
        profileImage: user.profilePicture || user.profileImage || null,
        location,
      };
    })
    .filter(Boolean);

  const mapUserIds = [...caregivers, ...careSeekers].map((participant) => participant.userId);

  let records = [];
  if (mapUserIds.length > 0) {
    const logs = await LocationLog.find({
      userId: { $in: mapUserIds },
      eventType: { $in: ['submit', 'service_start', 'service_ping', 'service_end'] },
      $or: [
        { 'gpsCoordinates.lat': { $exists: true } },
        { 'manualCoordinates.lat': { $exists: true } },
      ],
    })
      .select('userId bookingId sessionId eventType source gpsCoordinates manualCoordinates gpsAccuracy capturedAt createdAt')
      .sort({ capturedAt: -1, createdAt: -1 })
      .limit(locationRecordsLimit)
      .lean();

    records = logs
      .map((log) => {
        const coordinates = toRecordCoordinates(log);

        if (!coordinates) {
          return null;
        }

        return {
          recordId: log._id.toString(),
          userId: log.userId.toString(),
          bookingId: log.bookingId ? log.bookingId.toString() : null,
          sessionId: log.sessionId || null,
          eventType: log.eventType,
          source: log.source || 'gps',
          accuracy: toFiniteNumber(log.gpsAccuracy),
          coordinates,
          capturedAt: log.capturedAt || log.createdAt,
        };
      })
      .filter(Boolean);
  }

  const latestRecordMap = new Map();
  records.forEach((record) => {
    if (!latestRecordMap.has(record.userId)) {
      latestRecordMap.set(record.userId, record);
    }
  });

  const attachLatestRecord = (participant) => ({
    ...participant,
    lastRecord: latestRecordMap.get(participant.userId) || null,
  });

  const caregiversWithRecords = caregivers.map(attachLatestRecord);
  const careSeekersWithRecords = careSeekers.map(attachLatestRecord);

  const summary = {
    totalUsers: caregiversWithRecords.length + careSeekersWithRecords.length,
    caregivers: caregiversWithRecords.length,
    careSeekers: careSeekersWithRecords.length,
    verifiedUsers:
      caregiversWithRecords.filter((user) => user.isVerified).length +
      careSeekersWithRecords.filter((user) => user.isVerified).length,
    activeUsers:
      caregiversWithRecords.filter((user) => user.isActive).length +
      careSeekersWithRecords.filter((user) => user.isActive).length,
    records: records.length,
  };

  res.status(200).json(
    new ApiResponse(
      200,
      {
        caregivers: caregiversWithRecords,
        careSeekers: careSeekersWithRecords,
        records,
        summary,
      },
      'Admin map locations fetched successfully'
    )
  );
});

/**
 * Get pending approval users (Admin)
 * GET /api/admin/users/pending-approval
 */
export const getPendingApprovalUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [users, total] = await Promise.all([
    User.find({ status: USER_STATUS.PENDING_APPROVAL })
      .select('-password')
      .sort({ createdAt: 1 }) // Oldest first
      .skip(skip)
      .limit(parseInt(limit)),
    User.countDocuments({ status: USER_STATUS.PENDING_APPROVAL }),
  ]);

  res.status(200).json(
    new ApiResponse(200, {
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    }, 'Pending approval users fetched successfully')
  );
});

/**
 * Toggle caregiver featured status (Admin)
 * PATCH /api/admin/caregivers/:userId/featured
 */
export const toggleCaregiverFeatured = asyncHandler(async (req, res) => {
  const { featured, featuredUntil } = req.body;
  
  const caregiver = await Caregiver.findOne({ userId: req.params.userId });
  
  if (!caregiver) {
    return res.status(404).json(
      new ApiResponse(404, null, 'Caregiver profile not found')
    );
  }

  caregiver.featured = featured;
  if (featuredUntil) {
    caregiver.featuredUntil = new Date(featuredUntil);
  }
  await caregiver.save();

  res.status(200).json(
    new ApiResponse(200, { caregiver }, 'Featured status updated')
  );
});

/**
 * Update caregiver background check (Admin)
 * PATCH /api/admin/caregivers/:userId/background-check
 */
export const updateBackgroundCheck = asyncHandler(async (req, res) => {
  const { status, notes } = req.body;

  const statusAlias = {
    pending: 'in_progress',
    completed: 'passed',
  };
  const normalizedStatus = statusAlias[status] || status;
  const allowedStatuses = ['not_started', 'in_progress', 'passed', 'failed', 'expired'];

  if (!allowedStatuses.includes(normalizedStatus)) {
    return res.status(400).json(
      new ApiResponse(
        400,
        null,
        `Invalid background check status: ${status}. Allowed values: ${allowedStatuses.join(', ')}`
      )
    );
  }
  
  const caregiver = await Caregiver.findOne({ userId: req.params.userId });
  
  if (!caregiver) {
    return res.status(404).json(
      new ApiResponse(404, null, 'Caregiver profile not found')
    );
  }

  caregiver.backgroundCheck = {
    ...caregiver.backgroundCheck,
    status: normalizedStatus,
    ...(notes !== undefined ? { notes } : {}),
    completedAt:
      normalizedStatus === 'passed' || normalizedStatus === 'failed'
        ? new Date()
        : null,
  };
  await caregiver.save();

  res.status(200).json(
    new ApiResponse(200, { caregiver }, 'Background check status updated')
  );
});

/**
 * Verify caregiver profile (Admin)
 * PATCH /api/admin/caregivers/:userId/verify
 */
export const verifyCaregiverProfile = asyncHandler(async (req, res) => {
  const { verified } = req.body;

  const caregiver = await Caregiver.findOne({ userId: req.params.userId });

  if (!caregiver) {
    return res.status(404).json(
      new ApiResponse(404, null, 'Caregiver profile not found')
    );
  }

  caregiver.verified = verified;
  caregiver.verifiedAt = verified ? new Date() : null;
  await caregiver.save();

  aiMatchService.invalidateCandidateCache();

  res.status(200).json(
    new ApiResponse(200, { caregiver }, `Caregiver ${verified ? 'verified' : 'unverified'} successfully`)
  );
});

// ============================================
// LOCATION PROOF MANAGEMENT (Care-seekers)
// ============================================

/**
 * Get users with location proof for verification (Admin)
 * GET /api/admin/location-proofs
 */
export const getLocationProofs = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    status,
    sortBy = 'locationProof.capturedAt',
    sortOrder = 'desc',
  } = req.query;

  const filter = {
    role: USER_ROLES.CARESEEKER,
    'locationProof.coordinates.lat': { $exists: true },
  };

  if (status) {
    filter['locationProof.verificationStatus'] = status;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('fullName email avatar locationProof createdAt status')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit)),
    User.countDocuments(filter),
  ]);

  const locationProofs = await Promise.all(
    users.map(async (u) => {
      const trust = await locationService.getTrustScoreForUser(u);

      return {
        userId: u._id,
        fullName: u.fullName,
        email: u.email,
        avatar: u.avatar,
        userStatus: u.status,
        userCreatedAt: u.createdAt,
        locationProof: u.locationProof,
        trust,
      };
    })
  );

  res.status(200).json(
    new ApiResponse(200, {
      locationProofs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    }, 'Location proofs fetched successfully')
  );
});

/**
 * Verify location proof (Admin)
 * PATCH /api/admin/location-proofs/:userId/verify
 */
export const verifyLocationProof = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.userId);

  if (!user) {
    return res.status(404).json(
      new ApiResponse(404, null, 'User not found')
    );
  }

  if (!user.locationProof?.coordinates?.lat) {
    return res.status(400).json(
      new ApiResponse(400, null, 'User does not have location proof')
    );
  }

  user.locationProof.verificationStatus = 'verified';
  user.locationProof.verifiedAt = new Date();
  user.locationProof.verifiedBy = req.user._id;
  await user.save();

  const trust = await locationService.logAdminDecision({
    userId: user._id,
    adminId: req.user._id,
    eventType: 'verify',
    notes: 'Location proof verified by admin',
  });

  res.status(200).json(
    new ApiResponse(200, {
      userId: user._id,
      fullName: user.fullName,
      locationProof: user.locationProof,
      trust,
    }, 'Location proof verified successfully')
  );
});

/**
 * Reject location proof (Admin)
 * PATCH /api/admin/location-proofs/:userId/reject
 */
export const rejectLocationProof = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const user = await User.findById(req.params.userId);

  if (!user) {
    return res.status(404).json(
      new ApiResponse(404, null, 'User not found')
    );
  }

  if (!user.locationProof?.coordinates?.lat) {
    return res.status(400).json(
      new ApiResponse(400, null, 'User does not have location proof')
    );
  }

  user.locationProof.verificationStatus = 'rejected';
  user.locationProof.rejectionReason = reason || 'Location proof rejected by admin';
  user.locationProof.verifiedAt = new Date();
  user.locationProof.verifiedBy = req.user._id;
  await user.save();

  const trust = await locationService.logAdminDecision({
    userId: user._id,
    adminId: req.user._id,
    eventType: 'reject',
    notes: reason || 'Location proof rejected by admin',
  });

  res.status(200).json(
    new ApiResponse(200, {
      userId: user._id,
      fullName: user.fullName,
      locationProof: user.locationProof,
      trust,
    }, 'Location proof rejected')
  );
});

// ============================================
// DASHBOARD ANALYTICS
// ============================================

/**
 * Country ISO-2 code lookup for common names returned by nominatim
 */
const COUNTRY_CODES = {
  'United States': 'US', 'United States of America': 'US',
  'United Kingdom': 'GB', 'Great Britain': 'GB',
  'Canada': 'CA', 'Australia': 'AU', 'Germany': 'DE',
  'India': 'IN', 'France': 'FR', 'Japan': 'JP',
  'Brazil': 'BR', 'Mexico': 'MX', 'Spain': 'ES',
  'Italy': 'IT', 'Netherlands': 'NL', 'South Korea': 'KR',
  'Nigeria': 'NG', 'South Africa': 'ZA', 'Kenya': 'KE',
  'Ghana': 'GH', 'Singapore': 'SG', 'New Zealand': 'NZ',
  'Sweden': 'SE', 'Norway': 'NO', 'Denmark': 'DK',
  'Finland': 'FI', 'Switzerland': 'CH', 'Austria': 'AT',
  'Poland': 'PL', 'Portugal': 'PT', 'Ireland': 'IE',
  'Nepal': 'NP', 'Pakistan': 'PK', 'Bangladesh': 'BD',
  'Sri Lanka': 'LK', 'Philippines': 'PH', 'Indonesia': 'ID',
  'Malaysia': 'MY', 'Thailand': 'TH', 'Vietnam': 'VN',
  'China': 'CN', 'Hong Kong': 'HK', 'Taiwan': 'TW',
  'United Arab Emirates': 'AE', 'Saudi Arabia': 'SA',
  'Qatar': 'QA', 'Kuwait': 'KW', 'Egypt': 'EG',
};

function getCountryCode(countryName) {
  if (!countryName) return 'XX';
  // Try exact match first
  if (COUNTRY_CODES[countryName]) return COUNTRY_CODES[countryName];
  // Try case-insensitive
  const lower = countryName.toLowerCase();
  for (const [name, code] of Object.entries(COUNTRY_CODES)) {
    if (name.toLowerCase() === lower) return code;
  }
  // Return first 2 uppercase chars as fallback
  return countryName.substring(0, 2).toUpperCase();
}

/**
 * Map UserInteraction action to a frontend page path
 */
const ACTION_TO_PAGE = {
  search_result: '/caregivers',
  profile_click: '/caregivers',
  viewed: '/profile',
  booked: '/bookings',
  contacted: '/messages',
  shortlisted: '/saved',
  reviewed: '/reviews',
};

/**
 * Get admin analytics data (proof of work, locations, caregiver visitors, top pages)
 * GET /api/admin/dashboard/analytics
 */
export const getAdminAnalytics = asyncHandler(async (req, res) => {
  const [
    recentBookings,
    caregiverVisitorStats,
    locationStats,
    interactionStats,
    bookingStats,
  ] = await Promise.all([
    // --- Proof of Work: recent completed bookings ---
    Booking.find({ status: 'completed' })
      .sort({ updatedAt: -1 })
      .limit(8)
      .populate('caregiverId', 'fullName avatar')
      .populate('careSeekerId', 'fullName')
      .lean(),

    // --- Caregiver Profile Visitors from UserInteraction ---
    UserInteraction.aggregate([
      { $match: { action: { $in: ['viewed', 'profile_click', 'search_result'] } } },
      {
        $group: {
          _id: '$caregiverId',
          totalVisits: {
            $sum: { $cond: [{ $in: ['$action', ['viewed', 'profile_click']] }, 1, 0] },
          },
          uniqueVisitors: { $addToSet: '$userId' },
          searches: {
            $sum: { $cond: [{ $eq: ['$action', 'search_result'] }, 1, 0] },
          },
        },
      },
      { $sort: { totalVisits: -1 } },
      { $limit: 5 },
    ]),

    // --- Locations from User locationProof (care seekers with location) ---
    User.aggregate([
      {
        $match: {
          role: USER_ROLES.CARESEEKER,
          'locationProof.country': { $exists: true, $nin: [null, ''] },
        },
      },
      {
        $group: {
          _id: '$locationProof.country',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]),

    // --- UserInteraction action breakdown for Top Pages ---
    UserInteraction.aggregate([
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 },
        },
      },
    ]),

    // --- Booking status breakdown ---
    Booking.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  // ── Proof of Work ────────────────────────────────────────────────────────
  const bookingIds = recentBookings.map((b) => b._id);
  const reviews = await Review.find({ bookingId: { $in: bookingIds } }).lean();
  const reviewByBooking = {};
  for (const r of reviews) {
    reviewByBooking[r.bookingId.toString()] = r;
  }

  const proofOfWork = recentBookings.map((booking) => {
    const review = reviewByBooking[booking._id.toString()];
    const totalHours = booking.pricing?.totalHours || 0;
    const hours = totalHours > 0 ? `${totalHours}h` : '—';

    const rawService = booking.serviceType || '';
    const service = rawService
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    return {
      caregiver: booking.caregiverId?.fullName || 'Unknown Caregiver',
      caregiverAvatar: booking.caregiverId?.avatar || null,
      client: booking.careSeekerId?.fullName || 'Client',
      service,
      hours,
      rating: review?.overallRating ?? null,
      verified: true,
      date: (booking.updatedAt || booking.createdAt || new Date()).toISOString(),
    };
  });

  // ── Caregiver Visitors ───────────────────────────────────────────────────
  // caregiverId in UserInteraction refs Caregiver collection
  // We need to resolve names via a second query for unmatched lookups
  const cgIds = caregiverVisitorStats.map((s) => s._id);
  const cgProfiles = await Caregiver.find({ _id: { $in: cgIds } })
    .select('userId')
    .lean();
  const cgUserIds = cgProfiles.map((p) => p.userId);
  const cgUsers = await User.find({ _id: { $in: cgUserIds } })
    .select('_id fullName avatar')
    .lean();

  const cgProfileMap = {};
  for (const p of cgProfiles) {
    cgProfileMap[p._id.toString()] = p.userId.toString();
  }
  const cgUserMap = {};
  for (const u of cgUsers) {
    cgUserMap[u._id.toString()] = u;
  }

  const caregiverVisitors = caregiverVisitorStats.map((cv, index) => {
    const visitorId = cv._id.toString();
    const userId = cgProfileMap[visitorId];
    const user = userId ? cgUserMap[userId] : null;
    return {
      id: visitorId, // unique identifier for React keys
      name: user?.fullName || 'Unknown Caregiver',
      avatar: user?.avatar || null,
      totalVisits: cv.totalVisits,
      unique: cv.uniqueVisitors?.length ?? 0,
      searches: cv.searches || 0,
      growth: 0,
    };
  });

  // ── Locations ────────────────────────────────────────────────────────────
  const totalLocationCount = locationStats.reduce((sum, l) => sum + l.count, 0);
  const locations = locationStats.map((l) => ({
    country: l._id,
    code: getCountryCode(l._id),
    visitors: l.count,
    percent: totalLocationCount > 0 ? Math.round((l.count / totalLocationCount) * 100) : 0,
  }));

  // ── Top Pages ────────────────────────────────────────────────────────────
  // Aggregate interaction counts by mapped page path
  const pageMap = {};
  for (const stat of interactionStats) {
    const page = ACTION_TO_PAGE[stat._id];
    if (page) {
      pageMap[page] = (pageMap[page] || 0) + stat.count;
    }
  }
  const topPages = Object.entries(pageMap)
    .map(([page, views]) => ({ page, views, change: 0 }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 6);

  // ── Booking Stats Summary ─────────────────────────────────────────────────
  const bookingStatusMap = {};
  for (const s of bookingStats) {
    bookingStatusMap[s._id] = s.count;
  }

  // ── Top Referrers (no tracking yet → zeros) ───────────────────────────────
  const topReferrers = [
    { source: 'Direct', count: 0, percent: 0 },
    { source: 'Google', count: 0, percent: 0 },
    { source: 'Facebook', count: 0, percent: 0 },
    { source: 'LinkedIn', count: 0, percent: 0 },
    { source: 'Twitter/X', count: 0, percent: 0 },
  ];

  res.status(200).json(
    new ApiResponse(200, {
      proofOfWork,
      caregiverVisitors,
      locations,
      topPages,
      topReferrers,
      bookingBreakdown: bookingStatusMap,
    }, 'Analytics fetched successfully')
  );
});

/**
 * Get full analytics bundle (time-series data)
 * GET /api/admin/analytics/full
 */
export const getFullAnalytics = asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const data = await adminDashboardService.getFullAnalytics(days);
  res.status(200).json(new ApiResponse(200, data, 'Full analytics fetched'));
});

/**
 * Get overview stats
 * GET /api/admin/analytics/overview
 */
export const getAnalyticsOverview = asyncHandler(async (req, res) => {
  const data = await adminDashboardService.getOverviewStats();
  res.status(200).json(new ApiResponse(200, data, 'Overview stats fetched'));
});

/**
 * Get booking analytics
 * GET /api/admin/analytics/bookings
 */
export const getAnalyticsBookings = asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const data = await adminDashboardService.getBookingAnalytics(days);
  res.status(200).json(new ApiResponse(200, data, 'Booking analytics fetched'));
});

/**
 * Get revenue insights
 * GET /api/admin/analytics/revenue
 */
export const getAnalyticsRevenue = asyncHandler(async (req, res) => {
  const months = parseInt(req.query.months) || 12;
  const data = await adminDashboardService.getRevenueInsights(months);
  res.status(200).json(new ApiResponse(200, data, 'Revenue insights fetched'));
});

/**
 * Get user growth
 * GET /api/admin/analytics/users
 */
export const getAnalyticsUsers = asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const data = await adminDashboardService.getUserGrowth(days);
  res.status(200).json(new ApiResponse(200, data, 'User growth fetched'));
});

/**
 * Get notes insights
 * GET /api/admin/analytics/notes
 */
export const getAnalyticsNotes = asyncHandler(async (req, res) => {
  const data = await adminDashboardService.getNotesInsights();
  res.status(200).json(new ApiResponse(200, data, 'Notes insights fetched'));
});

/**
 * Get location analytics
 * GET /api/admin/analytics/locations
 */
export const getAnalyticsLocations = asyncHandler(async (req, res) => {
  const data = await adminDashboardService.getLocationAnalytics();
  res.status(200).json(new ApiResponse(200, data, 'Location analytics fetched'));
});

// ─── Payment Management ────────────────────────────────────────────────────

import Transaction from '../../models/transaction.model.js';
import Notification from '../../models/notification.model.js';
import walletService from '../../services/wallet.service.js';
import ledgerService from '../../services/ledger.service.js';
import { emitWalletUpdate } from '../../config/socket.js';
import { LOCATION_PRICING, getPricingForCity } from '../../constants/pricing.constants.js';

export const getAllTransactions = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const skip = parseInt(req.query.skip) || 0;
  const status = req.query.status;
  const query = status ? { status } : {};

  const [transactions, total] = await Promise.all([
    Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name email role')
      .lean(),
    Transaction.countDocuments(query),
  ]);
  res.status(200).json(new ApiResponse(200, { transactions, total }, 'Transactions fetched'));
});

export const getPaymentStats = asyncHandler(async (req, res) => {
  const [totalRevenue, pending, completed, refunded] = await Promise.all([
    Transaction.aggregate([{ $match: { status: 'completed' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    Transaction.countDocuments({ status: 'pending' }),
    Transaction.countDocuments({ status: 'completed' }),
    Transaction.countDocuments({ status: 'refunded' }),
  ]);
  res.status(200).json(new ApiResponse(200, {
    totalRevenue: totalRevenue[0]?.total ?? 0,
    pending, completed, refunded,
  }, 'Payment stats fetched'));
});

export const releasePayment = asyncHandler(async (req, res) => {
  const { transactionId } = req.params;
  const { bookingId, slotId, caregiverId, amount, currency = 'NPR' } = req.body;

  if (!caregiverId || !amount) {
    return res.status(400).json(new ApiResponse(400, null, 'caregiverId and amount are required'));
  }

  const result = await walletService.adminReleasePayment({
    bookingId, slotId, caregiverId, amount, currency,
  });

  // Mark transaction as released
  await Transaction.findByIdAndUpdate(transactionId, { status: 'released', releasedAt: new Date(), releasedBy: req.user._id });

  // Notify caregiver via socket
  const io = req.app.get('io');
  if (io) {
    const updatedWallet = await ledgerService.getWallet(caregiverId);
    io.to(`user:${caregiverId}`).emit('wallet:updated', { wallet: updatedWallet, event: 'payment_released' });
    io.to(`user:${caregiverId}`).emit('notification', {
      type: 'payment_released',
      title: 'Payment Released',
      message: `Rs. ${amount} has been released to your wallet.`,
    });
  }

  res.status(200).json(new ApiResponse(200, result, 'Payment released successfully'));
});

export const adminRefund = asyncHandler(async (req, res) => {
  const { transactionId } = req.params;
  const { bookingId, slotId, careSeekerId, amount, currency = 'NPR', reason } = req.body;

  if (!careSeekerId || !amount) {
    return res.status(400).json(new ApiResponse(400, null, 'careSeekerId and amount are required'));
  }

  await walletService.adminIssueRefund({ bookingId, slotId, transactionId: transactionId, careSeekerId, amount, currency });
  await Transaction.findByIdAndUpdate(transactionId, { status: 'refunded', refundedAt: new Date(), refundReason: reason });

  const io = req.app.get('io');
  if (io) {
    const updatedWallet = await ledgerService.getWallet(careSeekerId);
    if (updatedWallet) {
      emitWalletUpdate(io, careSeekerId, {
        wallet: updatedWallet,
        event: 'refund_processed',
        bookingId,
        transactionId,
        amount,
      });
    }
  }

  await Notification.createNotification({
    userId: careSeekerId,
    type: 'refund_processed',
    title: 'Refund Processed',
    message: `Rs. ${amount} refund has been processed to your wallet.`,
    priority: 'normal',
    data: {
      referenceId: transactionId,
      referenceType: 'payment',
      actionUrl: '/dashboard/careseeker/wallet',
      metadata: {
        bookingId,
        amount,
        reason: reason || 'Manual admin refund',
      },
    },
    channels: { inApp: true, email: true, push: true },
  });

  res.status(200).json(new ApiResponse(200, null, 'Refund processed successfully'));
});

// ─── Wallet Management ─────────────────────────────────────────────────────

export const getAllWallets = asyncHandler(async (req, res) => {
  const { ownerType } = req.query;
  const data = await walletService.getAllWallets({ ownerType, limit: 50, skip: parseInt(req.query.skip) || 0 });
  res.status(200).json(new ApiResponse(200, data, 'Wallets fetched'));
});

export const getPlatformWallet = asyncHandler(async (req, res) => {
  const wallet = await walletService.getPlatformWallet();
  res.status(200).json(new ApiResponse(200, wallet, 'Platform wallet fetched'));
});

export const getUserWallet = asyncHandler(async (req, res) => {
  const wallet = await walletService.getWalletByUserId(req.params.userId);
  res.status(200).json(new ApiResponse(200, wallet, 'User wallet fetched'));
});

// ─── Recommendation Badge ──────────────────────────────────────────────────

export const toggleCaregiverRecommended = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const caregiver = await Caregiver.findOne({ userId });
  if (!caregiver) return res.status(404).json(new ApiResponse(404, null, 'Caregiver not found'));

  const isRecommended = !caregiver.isRecommended;
  caregiver.isRecommended = isRecommended;
  caregiver.recommendedAt = isRecommended ? new Date() : null;
  caregiver.recommendedBy = isRecommended ? req.user._id : null;
  await caregiver.save();

  // Notify caregiver
  const io = req.app.get('io');
  if (io && isRecommended) {
    io.to(`user:${userId}`).emit('notification', {
      type: 'recommended_badge',
      title: 'You\'ve been Recommended!',
      message: 'Admin has awarded you the "Recommended" badge. It\'s now visible on your profile.',
    });
  }

  res.status(200).json(new ApiResponse(200, { isRecommended }, `Caregiver ${isRecommended ? 'recommended' : 'unrecommended'} successfully`));
});

// ─── Pricing Config ────────────────────────────────────────────────────────

export const getPricingConfig = asyncHandler(async (req, res) => {
  const { city } = req.query;
  const data = city ? getPricingForCity(city) : LOCATION_PRICING;
  res.status(200).json(new ApiResponse(200, data, 'Pricing config fetched'));
});
