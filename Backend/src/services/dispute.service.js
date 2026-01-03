// ============================================
// DISPUTE SERVICE
// Business logic for dispute resolution system
// ============================================

import mongoose from 'mongoose';
import Dispute from '../models/dispute.model.js';
import Booking from '../models/booking.model.js';
import { ApiError } from '../utils/apiResponse.js';
import { escapeRegExp } from '../utils/security.utils.js';

class DisputeService {
  /**
   * Create a new dispute
   */
  async createDispute(data, userId, userRole) {
    const { bookingId, category, subject, description, evidence } = data;

    const booking = await Booking.findById(bookingId)
      .populate('careSeekerId', 'fullName email')
      .populate('caregiverId', 'fullName email');

    if (!booking) {
      throw ApiError.notFound('Booking not found');
    }

    const isCareSeeker = booking.careSeekerId._id.toString() === userId.toString();
    const isCaregiver = booking.caregiverId._id.toString() === userId.toString();

    if (!isCareSeeker && !isCaregiver) {
      throw ApiError.forbidden('You are not part of this booking');
    }

    // Check for existing open dispute on same booking
    const existingDispute = await Dispute.findOne({
      bookingId,
      filedBy: userId,
      status: { $in: ['open', 'investigating', 'awaiting_response'] },
    });

    if (existingDispute) {
      throw ApiError.conflict('You already have an open dispute for this booking');
    }

    const againstUser = isCareSeeker ? booking.caregiverId._id : booking.careSeekerId._id;

    const dispute = await Dispute.create({
      bookingId,
      filedBy: userId,
      filedByRole: userRole,
      againstUser,
      category,
      subject,
      description,
      evidence: evidence || [],
      priority: category === 'safety_concern' || category === 'misconduct' ? 'high' : 'medium',
    });

    return dispute.populate([
      { path: 'filedBy', select: 'fullName avatar role' },
      { path: 'againstUser', select: 'fullName avatar role' },
      { path: 'bookingId', select: 'bookingNumber serviceType status schedule pricing' },
    ]);
  }

  /**
   * Get disputes for a user
   */
  async getUserDisputes(userId, filters = {}) {
    const { status, page = 1, limit = 20 } = filters;

    const query = {
      $or: [{ filedBy: new mongoose.Types.ObjectId(userId) }, { againstUser: new mongoose.Types.ObjectId(userId) }],
      isDeleted: false,
    };

    if (status && status !== 'all') {
      query.status = status;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [disputes, total] = await Promise.all([
      Dispute.find(query)
        .populate('filedBy', 'fullName avatar role')
        .populate('againstUser', 'fullName avatar role')
        .populate('bookingId', 'bookingNumber serviceType status')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Dispute.countDocuments(query),
    ]);

    return {
      disputes,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
    };
  }

  /**
   * Get dispute by ID (user or admin)
   */
  async getDisputeById(disputeId, userId, isAdmin = false) {
    const query = { _id: disputeId, isDeleted: false };
    if (!isAdmin) {
      query.$or = [{ filedBy: userId }, { againstUser: userId }];
    }

    const dispute = await Dispute.findOne(query)
      .populate('filedBy', 'fullName avatar email role')
      .populate('againstUser', 'fullName avatar email role')
      .populate('bookingId', 'bookingNumber serviceType status schedule pricing payment careReports')
      .populate('assignedTo', 'fullName avatar')
      .populate('timeline.performedBy', 'fullName avatar role')
      .populate('messages.sender', 'fullName avatar role');

    if (!dispute) {
      throw ApiError.notFound('Dispute not found');
    }

    return dispute;
  }

  /**
   * Add a message to a dispute
   */
  async addMessage(disputeId, userId, userRole, content) {
    const dispute = await Dispute.findOne({
      _id: disputeId,
      isDeleted: false,
      $or: [{ filedBy: userId }, { againstUser: userId }],
    });

    if (!dispute) {
      throw ApiError.notFound('Dispute not found');
    }

    if (dispute.status === 'resolved' || dispute.status === 'dismissed') {
      throw ApiError.badRequest('Cannot add messages to a resolved dispute');
    }

    dispute.messages.push({
      sender: userId,
      senderRole: userRole,
      content,
    });

    dispute.timeline.push({
      action: 'message_sent',
      performedBy: userId,
      message: `Message sent by ${userRole}`,
    });

    await dispute.save();

    return dispute.populate([
      { path: 'messages.sender', select: 'fullName avatar role' },
    ]);
  }

  /**
   * Add evidence to a dispute
   */
  async addEvidence(disputeId, userId, evidenceData) {
    const dispute = await Dispute.findOne({
      _id: disputeId,
      isDeleted: false,
      $or: [{ filedBy: userId }, { againstUser: userId }],
    });

    if (!dispute) {
      throw ApiError.notFound('Dispute not found');
    }

    dispute.evidence.push({
      ...evidenceData,
      uploadedBy: userId,
    });

    dispute.timeline.push({
      action: 'evidence_added',
      performedBy: userId,
      message: 'New evidence uploaded',
    });

    await dispute.save();
    return dispute;
  }

  // ============================================
  // ADMIN METHODS
  // ============================================

  /**
   * Admin: Get all disputes with filters
   */
  async adminGetDisputes(filters = {}) {
    const { status, category, priority, search, page = 1, limit = 20 } = filters;

    const query = { isDeleted: false };

    if (status && status !== 'all') query.status = status;
    if (category && category !== 'all') query.category = category;
    if (priority && priority !== 'all') query.priority = priority;

    if (search) {
      const safeSearch = escapeRegExp(search.trim().slice(0, 100));
      query.$or = [
        { ticketNumber: { $regex: safeSearch, $options: 'i' } },
        { subject: { $regex: safeSearch, $options: 'i' } },
        { description: { $regex: safeSearch, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [disputes, total, statusCounts] = await Promise.all([
      Dispute.find(query)
        .populate('filedBy', 'fullName avatar role')
        .populate('againstUser', 'fullName avatar role')
        .populate('bookingId', 'bookingNumber serviceType status')
        .populate('assignedTo', 'fullName')
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Dispute.countDocuments(query),
      Dispute.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const counts = { open: 0, investigating: 0, awaiting_response: 0, resolved: 0, dismissed: 0, escalated: 0 };
    statusCounts.forEach(s => { counts[s._id] = s.count; });

    return {
      disputes,
      statusCounts: counts,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
    };
  }

  /**
   * Admin: Update dispute status
   */
  async adminUpdateStatus(disputeId, adminId, newStatus, message) {
    const dispute = await Dispute.findOne({ _id: disputeId, isDeleted: false });
    if (!dispute) throw ApiError.notFound('Dispute not found');

    dispute.status = newStatus;
    dispute.timeline.push({
      action: 'status_changed',
      performedBy: adminId,
      message: message || `Status changed to ${newStatus}`,
      metadata: { oldStatus: dispute.status, newStatus },
    });

    if (!dispute.assignedTo) {
      dispute.assignedTo = adminId;
    }

    await dispute.save();
    return dispute;
  }

  /**
   * Admin: Resolve a dispute
   */
  async adminResolve(disputeId, adminId, resolutionData) {
    const { type, description, refundAmount } = resolutionData;

    const dispute = await Dispute.findOne({ _id: disputeId, isDeleted: false });
    if (!dispute) throw ApiError.notFound('Dispute not found');

    dispute.status = 'resolved';
    dispute.resolution = {
      type,
      description,
      refundAmount: refundAmount || 0,
      resolvedBy: adminId,
      resolvedAt: new Date(),
    };

    dispute.timeline.push({
      action: 'resolved',
      performedBy: adminId,
      message: `Dispute resolved: ${type}${description ? ` - ${description}` : ''}`,
      metadata: { resolutionType: type, refundAmount },
    });

    await dispute.save();

    return dispute.populate([
      { path: 'filedBy', select: 'fullName avatar role' },
      { path: 'againstUser', select: 'fullName avatar role' },
      { path: 'resolution.resolvedBy', select: 'fullName' },
    ]);
  }

  /**
   * Admin: Send message to dispute parties
   */
  async adminSendMessage(disputeId, adminId, content, targetRole) {
    const dispute = await Dispute.findOne({ _id: disputeId, isDeleted: false });
    if (!dispute) throw ApiError.notFound('Dispute not found');

    dispute.messages.push({
      sender: adminId,
      senderRole: 'admin',
      content,
    });

    dispute.timeline.push({
      action: 'message_sent',
      performedBy: adminId,
      message: `Admin message sent${targetRole ? ` to ${targetRole}` : ' to both parties'}`,
    });

    await dispute.save();
    return dispute;
  }

  /**
   * Admin: Add internal note
   */
  async adminAddNote(disputeId, adminId, content) {
    const dispute = await Dispute.findOne({ _id: disputeId, isDeleted: false });
    if (!dispute) throw ApiError.notFound('Dispute not found');

    dispute.adminNotes.push({ content, addedBy: adminId });
    dispute.timeline.push({
      action: 'admin_note',
      performedBy: adminId,
      message: 'Internal note added',
    });

    await dispute.save();
    return dispute;
  }

  /**
   * Admin: Get dispute stats
   */
  async getDisputeStats() {
    const [statusCounts, categoryCounts, avgResolution] = await Promise.all([
      Dispute.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Dispute.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),
      Dispute.aggregate([
        { $match: { status: 'resolved', 'resolution.resolvedAt': { $exists: true } } },
        {
          $project: {
            resolutionTime: { $subtract: ['$resolution.resolvedAt', '$createdAt'] },
          },
        },
        { $group: { _id: null, avgTime: { $avg: '$resolutionTime' } } },
      ]),
    ]);

    return {
      statusCounts: Object.fromEntries(statusCounts.map(s => [s._id, s.count])),
      categoryCounts: Object.fromEntries(categoryCounts.map(c => [c._id, c.count])),
      avgResolutionTimeMs: avgResolution[0]?.avgTime || 0,
      total: statusCounts.reduce((sum, s) => sum + s.count, 0),
    };
  }
}

export default new DisputeService();
