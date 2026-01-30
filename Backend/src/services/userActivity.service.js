// ============================================
// USER ACTIVITY SERVICE
// Service for logging and querying user activities
// ============================================

import UserActivity from '../models/userActivity.model.js';
import mongoose from 'mongoose';

class UserActivityService {
  /**
   * Log a user activity
   */
  async log(data) {
    return UserActivity.log(data);
  }

  /**
   * Log authentication activity
   */
  async logAuth(userId, action, metadata = {}) {
    return this.log({
      userId,
      category: 'auth',
      action,
      userRole: metadata.userRole,
      metadata: {
        userAgent: metadata.userAgent,
        ip: metadata.ip,
        browser: metadata.browser,
        os: metadata.os,
        device: metadata.device,
        city: metadata.city,
        country: metadata.country,
        success: metadata.success ?? true,
        errorMessage: metadata.errorMessage,
      },
      sessionId: metadata.sessionId,
      status: metadata.success === false ? 'failed' : 'success',
    });
  }

  /**
   * Log booking activity
   */
  async logBooking(userId, action, bookingId, metadata = {}) {
    return this.log({
      userId,
      category: 'booking',
      action,
      relatedEntity: {
        type: 'booking',
        id: bookingId,
      },
      userRole: metadata.userRole,
      metadata: {
        description: metadata.description,
        previousValue: metadata.previousValue,
        newValue: metadata.newValue,
        amount: metadata.amount,
        targetUserId: metadata.targetUserId,
      },
      sessionId: metadata.sessionId,
      status: metadata.status || 'success',
    });
  }

  /**
   * Log message activity
   */
  async logMessage(userId, action, conversationId, metadata = {}) {
    return this.log({
      userId,
      category: 'message',
      action,
      relatedEntity: {
        type: 'conversation',
        id: conversationId,
      },
      userRole: metadata.userRole,
      metadata: {
        targetUserId: metadata.targetUserId,
        description: metadata.description,
      },
      sessionId: metadata.sessionId,
    });
  }

  /**
   * Log note activity
   */
  async logNote(userId, action, noteId, metadata = {}) {
    return this.log({
      userId,
      category: 'note',
      action,
      relatedEntity: {
        type: 'note',
        id: noteId,
      },
      userRole: metadata.userRole,
      metadata: {
        description: metadata.description,
        previousValue: metadata.previousValue,
        newValue: metadata.newValue,
        targetUserId: metadata.targetUserId,
      },
      sessionId: metadata.sessionId,
    });
  }

  /**
   * Log document activity
   */
  async logDocument(userId, action, documentId, metadata = {}) {
    return this.log({
      userId,
      category: 'document',
      action,
      relatedEntity: {
        type: 'document',
        id: documentId,
      },
      userRole: metadata.userRole,
      metadata: {
        description: metadata.description,
      },
      sessionId: metadata.sessionId,
    });
  }

  /**
   * Log payment activity
   */
  async logPayment(userId, action, paymentId, metadata = {}) {
    return this.log({
      userId,
      category: 'payment',
      action,
      relatedEntity: {
        type: 'payment',
        id: paymentId,
      },
      userRole: metadata.userRole,
      metadata: {
        amount: metadata.amount,
        description: metadata.description,
        success: metadata.success,
        errorMessage: metadata.errorMessage,
      },
      sessionId: metadata.sessionId,
      status: metadata.success === false ? 'failed' : 'success',
    });
  }

  /**
   * Log job activity
   */
  async logJob(userId, action, jobId, metadata = {}) {
    return this.log({
      userId,
      category: 'job',
      action,
      relatedEntity: {
        type: 'job',
        id: jobId,
      },
      userRole: metadata.userRole,
      metadata: {
        description: metadata.description,
      },
      sessionId: metadata.sessionId,
    });
  }

  /**
   * Log dispute activity
   */
  async logDispute(userId, action, disputeId, metadata = {}) {
    return this.log({
      userId,
      category: 'dispute',
      action,
      relatedEntity: {
        type: 'dispute',
        id: disputeId,
      },
      userRole: metadata.userRole,
      metadata: {
        description: metadata.description,
        previousValue: metadata.previousValue,
        newValue: metadata.newValue,
      },
      sessionId: metadata.sessionId,
    });
  }

  /**
   * Log review activity
   */
  async logReview(userId, action, reviewId, metadata = {}) {
    return this.log({
      userId,
      category: 'review',
      action,
      relatedEntity: {
        type: 'review',
        id: reviewId,
      },
      userRole: metadata.userRole,
      metadata: {
        targetUserId: metadata.targetUserId,
        description: metadata.description,
      },
      sessionId: metadata.sessionId,
    });
  }

  // ============================================
  // ADMIN QUERY METHODS
  // ============================================

  /**
   * Get recent activities for admin dashboard
   */
  async getRecentActivities(limit = 50, filters = {}) {
    return UserActivity.getRecentWithUsers(limit, filters);
  }

  /**
   * Get platform-wide activity statistics
   */
  async getPlatformStats(days = 7) {
    return UserActivity.getPlatformStats(days);
  }

  /**
   * Get user activity summary
   */
  async getUserActivitySummary(userId, days = 30) {
    return UserActivity.getUserSummary(userId, days);
  }

  /**
   * Get activity timeline for admin (with pagination)
   */
  async getActivityTimeline(options = {}) {
    const {
      page = 1,
      limit = 50,
      category,
      action,
      userRole,
      userId,
      startDate,
      endDate,
      search,
    } = options;

    const match = {};

    if (category && category !== 'all') match.category = category;
    if (action && action !== 'all') match.action = action;
    if (userRole && userRole !== 'all') match.userRole = userRole;
    if (userId) match.userId = new mongoose.Types.ObjectId(userId);
    
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = new Date(startDate);
      if (endDate) match.createdAt.$lte = new Date(endDate);
    }

    const pipeline = [
      { $match: match },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
          pipeline: [{ $project: { fullName: 1, email: 1, avatar: 1, role: 1 } }],
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    ];

    // Add search filter if provided
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { 'user.fullName': { $regex: search, $options: 'i' } },
            { 'user.email': { $regex: search, $options: 'i' } },
            { action: { $regex: search, $options: 'i' } },
            { 'metadata.description': { $regex: search, $options: 'i' } },
          ],
        },
      });
    }

    // Get total count
    const countPipeline = [...pipeline, { $count: 'total' }];
    const [countResult] = await UserActivity.aggregate(countPipeline);
    const total = countResult?.total || 0;

    // Apply pagination
    pipeline.push({ $skip: (page - 1) * limit });
    pipeline.push({ $limit: limit });

    const activities = await UserActivity.aggregate(pipeline);

    return {
      activities,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    };
  }

  /**
   * Get activity statistics by category
   */
  async getCategoryStats(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [byCategory, byAction, byRole, dailyTrend] = await Promise.all([
      UserActivity.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]),
      UserActivity.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { category: '$category', action: '$action' },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]),
      UserActivity.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: '$userRole',
            count: { $sum: 1 },
          },
        },
      ]),
      UserActivity.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
            uniqueUsers: { $addToSet: '$userId' },
          },
        },
        {
          $project: {
            _id: 1,
            count: 1,
            uniqueUsers: { $size: '$uniqueUsers' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    return { byCategory, byAction, byRole, dailyTrend };
  }

  /**
   * Get login analytics
   */
  async getLoginAnalytics(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [dailyLogins, loginsByRole, loginsByDevice, loginsByLocation] = await Promise.all([
      UserActivity.aggregate([
        { $match: { category: 'auth', action: 'login', createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            total: { $sum: 1 },
            successful: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
            failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
            uniqueUsers: { $addToSet: '$userId' },
          },
        },
        {
          $project: {
            _id: 1,
            total: 1,
            successful: 1,
            failed: 1,
            uniqueUsers: { $size: '$uniqueUsers' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      UserActivity.aggregate([
        { $match: { category: 'auth', action: 'login', status: 'success', createdAt: { $gte: startDate } } },
        { $group: { _id: '$userRole', count: { $sum: 1 } } },
      ]),
      UserActivity.aggregate([
        { $match: { category: 'auth', action: 'login', createdAt: { $gte: startDate } } },
        { $group: { _id: '$metadata.device', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      UserActivity.aggregate([
        { $match: { category: 'auth', action: 'login', 'metadata.city': { $exists: true }, createdAt: { $gte: startDate } } },
        { $group: { _id: { city: '$metadata.city', country: '$metadata.country' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
    ]);

    return { dailyLogins, loginsByRole, loginsByDevice, loginsByLocation };
  }

  /**
   * Get user engagement metrics
   */
  async getUserEngagement(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [
      mostActiveUsers,
      engagementByCategory,
      hourlyActivity,
      sessionDurations,
    ] = await Promise.all([
      // Most active users
      UserActivity.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: '$userId', activityCount: { $sum: 1 }, categories: { $addToSet: '$category' } } },
        { $sort: { activityCount: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user',
            pipeline: [{ $project: { fullName: 1, email: 1, avatar: 1, role: 1 } }],
          },
        },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      ]),
      // Engagement by category
      UserActivity.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: '$category',
            totalActions: { $sum: 1 },
            uniqueUsers: { $addToSet: '$userId' },
          },
        },
        {
          $project: {
            _id: 1,
            totalActions: 1,
            uniqueUsers: { $size: '$uniqueUsers' },
            avgActionsPerUser: { $divide: ['$totalActions', { $size: '$uniqueUsers' }] },
          },
        },
        { $sort: { totalActions: -1 } },
      ]),
      // Hourly activity pattern
      UserActivity.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: { $hour: '$createdAt' }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      // Average session durations (from auth logs)
      UserActivity.aggregate([
        {
          $match: {
            category: 'auth',
            action: { $in: ['login', 'logout'] },
            createdAt: { $gte: startDate },
          },
        },
        { $sort: { userId: 1, sessionId: 1, createdAt: 1 } },
        {
          $group: {
            _id: { userId: '$userId', sessionId: '$sessionId' },
            actions: { $push: { action: '$action', time: '$createdAt' } },
          },
        },
        { $limit: 1000 }, // Limit for performance
      ]),
    ]);

    // Calculate average session duration from session pairs
    let totalDuration = 0;
    let sessionCount = 0;
    for (const session of sessionDurations) {
      const login = session.actions.find(a => a.action === 'login');
      const logout = session.actions.find(a => a.action === 'logout');
      if (login && logout) {
        totalDuration += (new Date(logout.time) - new Date(login.time)) / 1000 / 60; // in minutes
        sessionCount++;
      }
    }
    const avgSessionDuration = sessionCount > 0 ? Math.round(totalDuration / sessionCount) : 0;

    return {
      mostActiveUsers,
      engagementByCategory,
      hourlyActivity,
      avgSessionDuration,
    };
  }
}

export default new UserActivityService();
