// ============================================
// NOTICE SERVICE
// Admin notice board — create, read, respond
// ============================================

import Notice from '../models/notice.model.js';
import NoticeView from '../models/noticeView.model.js';
import NoticeResponse from '../models/noticeResponse.model.js';
import User from '../models/user.model.js';
import notificationService from './notification.service.js';

class NoticeService {
  // ─── Admin: create notice ───────────────────────────────────────────────────

  async createNotice(adminId, data) {
    const notice = await Notice.create({
      title: data.title,
      content: data.content,
      type: data.type || 'normal',
      targetRoles: data.targetRoles || ['all'],
      targetUsers: data.targetUsers || [],
      allowResponse: data.allowResponse || false,
      attachments: data.attachments || [],
      expiryDate: data.expiryDate || null,
      createdBy: adminId,
    });

    // Push in-app notifications to matching users
    await this._notifyTargetUsers(notice);

    return notice;
  }

  // ─── Admin: list all notices ────────────────────────────────────────────────

  async adminListNotices({ page = 1, limit = 20, type, isActive } = {}) {
    const query = {};
    if (type) query.type = type;
    if (isActive !== undefined) query.isActive = isActive === 'true' || isActive === true;

    const skip = (page - 1) * limit;
    const [notices, total] = await Promise.all([
      Notice.find(query)
        .populate('createdBy', 'fullName avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Notice.countDocuments(query),
    ]);

    return { notices, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) } };
  }

  // ─── Admin: update notice ───────────────────────────────────────────────────

  async updateNotice(noticeId, data) {
    const notice = await Notice.findByIdAndUpdate(
      noticeId,
      { $set: data },
      { new: true, runValidators: true }
    ).populate('createdBy', 'fullName avatar');

    if (!notice) throw new Error('Notice not found');
    return notice;
  }

  // ─── Admin: delete / deactivate notice ─────────────────────────────────────

  async deleteNotice(noticeId) {
    const notice = await Notice.findByIdAndUpdate(
      noticeId,
      { isActive: false },
      { new: true }
    );
    if (!notice) throw new Error('Notice not found');
    return { success: true };
  }

  // ─── Admin: view count for a notice ────────────────────────────────────────

  async getNoticeViews(noticeId) {
    const [views, responses] = await Promise.all([
      NoticeView.find({ noticeId }).populate('userId', 'fullName avatar role').lean(),
      NoticeResponse.find({ noticeId }).populate('userId', 'fullName avatar role').lean(),
    ]);
    return { views, responses, viewCount: views.length, responseCount: responses.length };
  }

  // ─── User: list notices visible to them ────────────────────────────────────

  async getUserNotices(userId, userRole, { page = 1, limit = 20 } = {}) {
    const now = new Date();
    const query = {
      isActive: true,
      $and: [
        { $or: [{ expiryDate: null }, { expiryDate: { $gt: now } }] },
        {
          $or: [
            { targetRoles: 'all' },
            { targetRoles: userRole },
            { targetUsers: userId },
          ],
        },
      ],
    };

    const skip = (page - 1) * limit;
    const [notices, total] = await Promise.all([
      Notice.find(query)
        .populate('createdBy', 'fullName avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Notice.countDocuments(query),
    ]);

    // Attach read status per notice for this user
    const noticeIds = notices.map(n => n._id);
    const viewedIds = new Set(
      (await NoticeView.find({ noticeId: { $in: noticeIds }, userId }).select('noticeId').lean())
        .map(v => v.noticeId.toString())
    );

    const noticesWithRead = notices.map(n => ({
      ...n,
      isRead: viewedIds.has(n._id.toString()),
    }));

    return {
      notices: noticesWithRead,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
    };
  }

  // ─── User: mark notice as read ──────────────────────────────────────────────

  async markNoticeRead(noticeId, userId) {
    await NoticeView.updateOne(
      { noticeId, userId },
      { $setOnInsert: { noticeId, userId, seenAt: new Date() } },
      { upsert: true }
    );
    return { success: true };
  }

  // ─── User: respond to notice ────────────────────────────────────────────────

  async respondToNotice(noticeId, userId, message) {
    const notice = await Notice.findById(noticeId);
    if (!notice) throw new Error('Notice not found');
    if (!notice.allowResponse) throw new Error('Responses are not allowed for this notice');

    const response = await NoticeResponse.create({ noticeId, userId, message });
    return response;
  }

  // ─── Internal: notify target users on new notice ───────────────────────────

  async _notifyTargetUsers(notice) {
    try {
      let query = {};
      const roles = notice.targetRoles || [];
      if (!roles.includes('all')) {
        const roleMap = { caregiver: 'caregiver', careseeker: 'careseeker', admin: 'admin' };
        const mappedRoles = roles.map(r => roleMap[r]).filter(Boolean);
        if (mappedRoles.length > 0) query.role = { $in: mappedRoles };
      }
      if (notice.targetUsers?.length > 0) {
        query = { _id: { $in: notice.targetUsers } };
      }

      query.status = 'active';

      const users = await User.find(query).select('_id').lean();

      const notifPromises = users.map(user =>
        notificationService.createNotification({
          userId: user._id,
          type: 'new_notice',
          title: notice.title,
          message: notice.content.substring(0, 200) + (notice.content.length > 200 ? '…' : ''),
          priority: notice.type === 'urgent' ? 'urgent' : notice.type === 'warning' ? 'high' : 'normal',
          data: {
            referenceId: notice._id,
            referenceType: 'notice',
            actionUrl: '/notices',
            metadata: { noticeType: notice.type },
          },
          channels: { inApp: true, email: notice.type === 'urgent' },
        }).catch(() => null) // don't let one failure block others
      );

      await Promise.allSettled(notifPromises);
    } catch (err) {
      console.error('[NoticeService] Failed to notify users:', err.message);
    }
  }
}

export default new NoticeService();
