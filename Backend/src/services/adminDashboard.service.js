// ============================================
// ADMIN DASHBOARD SERVICE
// Real time-series analytics for admin dashboard
// No dummy/mock data — all from MongoDB aggregations
// ============================================

import mongoose from 'mongoose';
import User from '../models/user.model.js';
import Booking from '../models/booking.model.js';
import Review from '../models/review.model.js';
import Note from '../models/note.model.js';
import Dispute from '../models/dispute.model.js';
import Transaction from '../models/transaction.model.js';
import { USER_ROLES } from '../constants/index.js';

class AdminDashboardService {
  /**
   * Overview stats — single numbers for the stat cards
   */
  async getOverviewStats() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now); thirtyDaysAgo.setDate(now.getDate() - 30);
    const sixtyDaysAgo = new Date(now); sixtyDaysAgo.setDate(now.getDate() - 60);

    const [
      totalUsers, activeCaregivers, activeFamilies, totalBookings,
      completedBookings, cancelledBookings,
      revenueResult, prevRevenueResult,
      newUsersThisMonth, newUsersPrevMonth,
    ] = await Promise.all([
      User.countDocuments({ role: { $ne: USER_ROLES.ADMIN } }),
      User.countDocuments({ role: USER_ROLES.CAREGIVER, status: 'active' }),
      User.countDocuments({ role: USER_ROLES.CARESEEKER, status: 'active' }),
      Booking.countDocuments(),
      Booking.countDocuments({ status: 'completed' }),
      Booking.countDocuments({ status: 'cancelled' }),
      Booking.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$pricing.total' } } },
      ]),
      Booking.aggregate([
        { $match: { status: 'completed', updatedAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } } },
        { $group: { _id: null, total: { $sum: '$pricing.total' } } },
      ]),
      User.countDocuments({ createdAt: { $gte: thirtyDaysAgo }, role: { $ne: USER_ROLES.ADMIN } }),
      User.countDocuments({ createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo }, role: { $ne: USER_ROLES.ADMIN } }),
    ]);

    const revenue = revenueResult[0]?.total || 0;
    const prevRevenue = prevRevenueResult[0]?.total || 0;
    const revenueChange = prevRevenue > 0 ? Math.round(((revenue - prevRevenue) / prevRevenue) * 100) : 0;
    const userChange = newUsersPrevMonth > 0 ? Math.round(((newUsersThisMonth - newUsersPrevMonth) / newUsersPrevMonth) * 100) : 0;
    const completionRate = totalBookings > 0 ? Math.round((completedBookings / totalBookings) * 100) : 0;
    const cancellationRate = totalBookings > 0 ? Math.round((cancelledBookings / totalBookings) * 100) : 0;

    return {
      totalUsers, activeCaregivers, activeFamilies, totalBookings,
      completedBookings, cancelledBookings, revenue,
      revenueChange, userChange, completionRate, cancellationRate,
      newUsersThisMonth,
    };
  }

  /**
   * User growth time-series — new users per day for last N days
   */
  async getUserGrowth(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const result = await User.aggregate([
      { $match: { createdAt: { $gte: startDate }, role: { $ne: USER_ROLES.ADMIN } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          total: { $sum: 1 },
          caregivers: { $sum: { $cond: [{ $eq: ['$role', USER_ROLES.CAREGIVER] }, 1, 0] } },
          careseekers: { $sum: { $cond: [{ $eq: ['$role', USER_ROLES.CARESEEKER] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Fill in missing days with 0
    const data = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0];
      const found = result.find(r => r._id === key);
      data.push({
        date: key,
        label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        total: found?.total || 0,
        caregivers: found?.caregivers || 0,
        careseekers: found?.careseekers || 0,
      });
    }

    return data;
  }

  /**
   * Booking analytics time-series — bookings per day
   */
  async getBookingAnalytics(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const result = await Booking.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          confirmed: { $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const data = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0];
      const found = result.find(r => r._id === key);
      data.push({
        date: key,
        label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        total: found?.total || 0,
        completed: found?.completed || 0,
        cancelled: found?.cancelled || 0,
        confirmed: found?.confirmed || 0,
      });
    }

    return data;
  }

  /**
   * Revenue time-series — monthly earnings
   */
  async getRevenueInsights(months = 12) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const result = await Booking.aggregate([
      { $match: { status: 'completed', createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          revenue: { $sum: '$pricing.total' },
          bookings: { $sum: 1 },
          platformFee: { $sum: { $ifNull: ['$pricing.platformFee', 0] } },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const data = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const found = result.find(r => r._id.year === year && r._id.month === month);
      data.push({
        label: monthNames[month - 1],
        revenue: found?.revenue || 0,
        bookings: found?.bookings || 0,
        platformFee: found?.platformFee || 0,
      });
    }

    // Top earning caregivers
    const topEarners = await Booking.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: '$caregiverId', totalEarnings: { $sum: '$pricing.total' }, bookings: { $sum: 1 } } },
      { $sort: { totalEarnings: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
          pipeline: [{ $project: { fullName: 1, avatar: 1, email: 1 } }],
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    ]);

    return { monthly: data, topEarners };
  }

  /**
   * Notes insights — notes engagement metrics
   */
  async getNotesInsights() {
    const [totalNotes, notesByTag, notesByVisibility, notesPerBooking] = await Promise.all([
      Note.countDocuments({ isDeleted: false }),
      Note.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: '$tag', count: { $sum: 1 } } },
      ]),
      Note.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: '$visibility', count: { $sum: 1 } } },
      ]),
      Note.aggregate([
        { $match: { isDeleted: false, bookingId: { $exists: true, $ne: null } } },
        { $group: { _id: '$bookingId', count: { $sum: 1 } } },
        { $group: { _id: null, avg: { $avg: '$count' }, total: { $sum: 1 } } },
      ]),
    ]);

    // Most active note creators
    const activeCreators = await Note.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: '$createdBy', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
          pipeline: [{ $project: { fullName: 1, avatar: 1, role: 1 } }],
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    ]);

    return {
      totalNotes,
      tags: Object.fromEntries(notesByTag.map(t => [t._id, t.count])),
      visibility: Object.fromEntries(notesByVisibility.map(v => [v._id, v.count])),
      avgNotesPerBooking: notesPerBooking[0]?.avg || 0,
      bookingsWithNotes: notesPerBooking[0]?.total || 0,
      activeCreators,
    };
  }

  /**
   * Location analytics — users by location
   */
  async getLocationAnalytics() {
    const [byCity, byCountry] = await Promise.all([
      User.aggregate([
        { $match: { 'locationProof.city': { $exists: true, $ne: null, $ne: '' } } },
        { $group: { _id: '$locationProof.city', count: { $sum: 1 }, state: { $first: '$locationProof.state' } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      User.aggregate([
        { $match: { 'locationProof.country': { $exists: true, $ne: null, $ne: '' } } },
        { $group: { _id: '$locationProof.country', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
    ]);

    return { byCity, byCountry };
  }

  /**
   * Full analytics bundle — single call to get everything
   */
  async getFullAnalytics(days = 30) {
    const [overview, userGrowth, bookingAnalytics, revenueInsights, notesInsights, locationAnalytics] =
      await Promise.all([
        this.getOverviewStats(),
        this.getUserGrowth(days),
        this.getBookingAnalytics(days),
        this.getRevenueInsights(12),
        this.getNotesInsights(),
        this.getLocationAnalytics(),
      ]);

    return { overview, userGrowth, bookingAnalytics, revenueInsights, notesInsights, locationAnalytics };
  }
}

export default new AdminDashboardService();
