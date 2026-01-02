// ============================================
// DASHBOARD SERVICE
// Real-time analytics for caregiver & careseeker dashboards
// Replaces all hardcoded dashboard data
// ============================================

import mongoose from 'mongoose';
import Booking from '../models/booking.model.js';
import Review from '../models/review.model.js';
import Conversation from '../models/conversation.model.js';
import Notification from '../models/notification.model.js';
import Job from '../models/job.model.js';
import JobApplication from '../models/jobApplication.model.js';
import { dashboardCache } from '../utils/cache.js';

class DashboardService {
  // ============================================
  // CAREGIVER DASHBOARD
  // ============================================

  /**
   * Get caregiver earnings data (monthly breakdown)
   */
  async getCaregiverEarnings(userId) {
    const cacheKey = `cg:earnings:${userId}`;
    const cached = dashboardCache.get(cacheKey);
    if (cached) return cached;

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const earnings = await Booking.aggregate([
      {
        $match: {
          caregiverId: new mongoose.Types.ObjectId(userId),
          status: 'completed',
          $or: [
            { completedAt: { $gte: sixMonthsAgo } },
            { completedAt: null, updatedAt: { $gte: sixMonthsAgo } },
          ],
        },
      },
      {
        $addFields: {
          effectiveDate: { $ifNull: ['$completedAt', '$updatedAt'] },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$effectiveDate' },
            month: { $month: '$effectiveDate' },
          },
          earnings: { $sum: '$pricing.total' },
          bookings: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Fill in all 6 months even if no data
    const result = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const found = earnings.find(e => e._id.year === year && e._id.month === month);
      result.push({
        month: monthNames[month - 1],
        earnings: found ? found.earnings : 0,
        bookings: found ? found.bookings : 0,
      });
    }

    dashboardCache.set(cacheKey, result, 120); // 2 min cache
    return result;
  }

  /**
   * Get caregiver bookings by service type distribution
   */
  async getCaregiverBookingsByType(userId) {
    const cacheKey = `cg:bytype:${userId}`;
    const cached = dashboardCache.get(cacheKey);
    if (cached) return cached;

    const distribution = await Booking.aggregate([
      {
        $match: {
          caregiverId: new mongoose.Types.ObjectId(userId),
          status: { $in: ['confirmed', 'in_progress', 'completed'] },
        },
      },
      {
        $group: {
          _id: '$serviceType',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const total = distribution.reduce((sum, d) => sum + d.count, 0);

    const typeLabels = {
      elderly_care: 'Elderly Care',
      child_care: 'Child Care',
      special_needs: 'Special Needs',
      disability_care: 'Disability Care',
      post_surgery: 'Post Surgery',
      companionship: 'Companionship',
      respite_care: 'Respite Care',
      palliative_care: 'Palliative Care',
    };

    const colors = ['#4461F2', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

    const result = distribution.map((d, i) => ({
      type: typeLabels[d._id] || d._id,
      count: d.count,
      percentage: total > 0 ? Math.round((d.count / total) * 100) : 0,
      color: colors[i % colors.length],
    }));

    dashboardCache.set(cacheKey, result, 120);
    return result;
  }

  /**
   * Get caregiver weekly activity (hours worked per day this week)
   */
  async getCaregiverWeeklyActivity(userId) {
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const bookings = await Booking.find({
      caregiverId: new mongoose.Types.ObjectId(userId),
      status: { $in: ['in_progress', 'completed'] },
      'schedule.startDate': { $gte: startOfWeek },
    })
      .select('schedule.startDate pricing.totalHours durationHours')
      .lean();

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyData = days.map(day => ({ day, hours: 0 }));

    bookings.forEach(b => {
      if (b.schedule?.startDate) {
        const dayIdx = new Date(b.schedule.startDate).getDay();
        const hours = b.pricing?.totalHours || b.durationHours || 0;
        weeklyData[dayIdx].hours += hours;
      }
    });

    return weeklyData;
  }

  /**
   * Get recent activity for caregiver
   */
  async getCaregiverRecentActivity(userId, limit = 10) {
    const notifications = await Notification.find({
      userId: new mongoose.Types.ObjectId(userId),
    })
      .select('type title message createdAt read data')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return notifications.map(n => ({
      _id: n._id,
      type: n.type,
      title: n.title,
      message: n.message,
      time: n.createdAt,
      isRead: n.read,
      data: n.data,
    }));
  }

  /**
   * Get recent conversations for caregiver messaging panel
   */
  async getCaregiverConversations(userId, limit = 5) {
    const conversations = await Conversation.find({
      participants: new mongoose.Types.ObjectId(userId),
      status: { $ne: 'deleted' },
    })
      .select('participants lastMessage unreadCount updatedAt')
      .populate('participants', 'fullName firstName lastName avatar role')
      .populate('lastMessage', 'content createdAt sender')
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean();

    return conversations.map(c => {
      const otherParticipant = c.participants.find(
        p => p._id.toString() !== userId.toString()
      );
      return {
        _id: c._id,
        participant: otherParticipant,
        lastMessage: c.lastMessage,
        unreadCount: c.unreadCount?.[userId] || 0,
        updatedAt: c.updatedAt,
      };
    });
  }

  /**
   * Get available jobs for caregiver
   */
  async getCaregiverAvailableJobs(userId, limit = 5) {
    // Get jobs user hasn't applied to yet
    const appliedJobIds = await JobApplication.distinct('job', {
      applicant: new mongoose.Types.ObjectId(userId),
    });

    const jobs = await Job.find({
      _id: { $nin: appliedJobIds },
      status: 'active',
    })
      .select('title description budget location serviceType schedule postedBy status createdAt requirements tags')
      .populate('postedBy', 'fullName firstName lastName avatar')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return jobs;
  }

  // ============================================
  // CARESEEKER DASHBOARD
  // ============================================

  /**
   * Get careseeker spending data (monthly)
   */
  async getCareseekerSpending(userId) {
    const cacheKey = `cs:spending:${userId}`;
    const cached = dashboardCache.get(cacheKey);
    if (cached) return cached;

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const spending = await Booking.aggregate([
      {
        $match: {
          careSeekerId: new mongoose.Types.ObjectId(userId),
          status: { $in: ['completed', 'in_progress'] },
          createdAt: { $gte: twelveMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          spending: { $sum: '$pricing.total' },
          bookings: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const result = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const found = spending.find(e => e._id.year === year && e._id.month === month);
      result.push({
        month: monthNames[month - 1],
        spending: found ? found.spending : 0,
        bookings: found ? found.bookings : 0,
      });
    }

    dashboardCache.set(cacheKey, result, 120);
    return result;
  }

  /**
   * Get careseeker service distribution
   */
  async getCareseekerServiceDistribution(userId) {
    const distribution = await Booking.aggregate([
      {
        $match: {
          careSeekerId: new mongoose.Types.ObjectId(userId),
          status: { $in: ['confirmed', 'in_progress', 'completed'] },
        },
      },
      {
        $group: {
          _id: '$serviceType',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const typeLabels = {
      elderly_care: 'Elderly Care',
      child_care: 'Child Care',
      special_needs: 'Special Needs',
      disability_care: 'Disability Care',
      post_surgery: 'Post Surgery',
      companionship: 'Companionship',
      respite_care: 'Respite Care',
      palliative_care: 'Palliative Care',
    };

    const colors = ['#4461F2', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

    return distribution.map((d, i) => ({
      type: typeLabels[d._id] || d._id,
      count: d.count,
      color: colors[i % colors.length],
    }));
  }

  /**
   * Get careseeker recent activity
   */
  async getCareseekerRecentActivity(userId, limit = 10) {
    const notifications = await Notification.find({
      userId: new mongoose.Types.ObjectId(userId),
    })
      .select('type title message createdAt read data')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return notifications.map(n => ({
      _id: n._id,
      type: n.type,
      title: n.title,
      message: n.message,
      time: n.createdAt,
      isRead: n.read,
      data: n.data,
    }));
  }

  /**
   * Get careseeker booking stats
   */
  async getCareseekerStats(userId) {
    const cacheKey = `cs:stats:${userId}`;
    const cached = dashboardCache.get(cacheKey);
    if (cached) return cached;

    const [
      totalBookings,
      activeBookings,
      completedBookings,
      totalSpent,
      pendingPayments,
    ] = await Promise.all([
      Booking.countDocuments({ careSeekerId: new mongoose.Types.ObjectId(userId) }),
      Booking.countDocuments({
        careSeekerId: new mongoose.Types.ObjectId(userId),
        status: { $in: ['confirmed', 'in_progress'] },
      }),
      Booking.countDocuments({
        careSeekerId: new mongoose.Types.ObjectId(userId),
        status: 'completed',
      }),
      Booking.aggregate([
        {
          $match: {
            careSeekerId: new mongoose.Types.ObjectId(userId),
            paymentStatus: { $in: ['partially_paid', 'fully_paid'] },
          },
        },
        { $group: { _id: null, total: { $sum: '$amountPaid' } } },
      ]),
      Booking.aggregate([
        {
          $match: {
            careSeekerId: new mongoose.Types.ObjectId(userId),
            paymentStatus: { $in: ['unpaid', 'payment_pending', 'partially_paid'] },
          },
        },
        { $group: { _id: null, total: { $sum: '$amountDue' } } },
      ]),
    ]);

    const statsResult = {
      totalBookings,
      activeBookings,
      completedBookings,
      totalSpent: totalSpent[0]?.total || 0,
      pendingPayments: pendingPayments[0]?.total || 0,
    };

    dashboardCache.set(cacheKey, statsResult, 90); // 90 sec cache
    return statsResult;
  }

  // ============================================
  // CAREGIVER STATS (enhanced)
  // ============================================

  /**
   * Get full caregiver dashboard stats
   */
  async getCaregiverFullStats(userId) {
    const cacheKey = `cg:stats:${userId}`;
    const cached = dashboardCache.get(cacheKey);
    if (cached) return cached;

    const [
      totalBookings,
      activeBookings,
      completedBookings,
      totalEarnings,
      pendingPayments,
      totalReviews,
      avgRating,
    ] = await Promise.all([
      Booking.countDocuments({ caregiverId: new mongoose.Types.ObjectId(userId) }),
      Booking.countDocuments({
        caregiverId: new mongoose.Types.ObjectId(userId),
        status: { $in: ['confirmed', 'in_progress'] },
      }),
      Booking.countDocuments({
        caregiverId: new mongoose.Types.ObjectId(userId),
        status: 'completed',
      }),
      Booking.aggregate([
        {
          $match: {
            caregiverId: new mongoose.Types.ObjectId(userId),
            status: 'completed',
          },
        },
        { $group: { _id: null, total: { $sum: '$pricing.total' } } },
      ]),
      Booking.aggregate([
        {
          $match: {
            caregiverId: new mongoose.Types.ObjectId(userId),
            paymentStatus: { $in: ['unpaid', 'payment_pending', 'partially_paid'] },
          },
        },
        { $group: { _id: null, total: { $sum: '$amountDue' } } },
      ]),
      Review.countDocuments({
        revieweeId: new mongoose.Types.ObjectId(userId),
      }),
      Review.aggregate([
        { $match: { revieweeId: new mongoose.Types.ObjectId(userId) } },
        { $group: { _id: null, avg: { $avg: '$overallRating' } } },
      ]),
    ]);

    const completionRate = totalBookings > 0
      ? Math.round((completedBookings / totalBookings) * 100)
      : 0;

    const cgStatsResult = {
      totalBookings,
      activeBookings,
      completedBookings,
      completionRate,
      totalEarnings: totalEarnings[0]?.total || 0,
      pendingPayments: pendingPayments[0]?.total || 0,
      totalReviews,
      avgRating: avgRating[0]?.avg ? Math.round(avgRating[0].avg * 10) / 10 : 0,
    };

    dashboardCache.set(cacheKey, cgStatsResult, 90);
    return cgStatsResult;
  }
}

export default new DashboardService();
