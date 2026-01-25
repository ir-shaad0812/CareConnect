// ============================================
// TASK SERVICE
// Auto-generate and manage tasks for users
// ============================================

import Task from '../models/task.model.js';
import Booking from '../models/booking.model.js';

class TaskService {
  // ─── Create a task ──────────────────────────────────────────────────────────

  async createTask(data) {
    // Avoid duplicates: one pending task of same type+entity per user
    if (data.linkedEntityId) {
      const existing = await Task.findOne({
        userId: data.userId,
        type: data.type,
        linkedEntityId: data.linkedEntityId,
        status: { $in: ['pending', 'in_progress'] },
      });
      if (existing) return existing;
    }

    return Task.create(data);
  }

  // ─── Get today's tasks for a user ──────────────────────────────────────────

  async getTodayTasks(userId) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const tasks = await Task.find({
      userId,
      status: { $in: ['pending', 'in_progress'] },
      $or: [
        { dueDate: { $gte: startOfDay, $lte: endOfDay } },
        { dueDate: null }, // tasks with no deadline also surface today
      ],
    })
      .sort({ priority: 1, dueDate: 1 })
      .lean();

    return tasks;
  }

  // ─── Get upcoming tasks (next 7 days) ──────────────────────────────────────

  async getUpcomingTasks(userId) {
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Fetch tasks + upcoming booking sessions
    const [tasks, bookings] = await Promise.all([
      Task.find({
        userId,
        status: { $in: ['pending', 'in_progress'] },
        dueDate: { $gte: now, $lte: in7Days },
      })
        .sort({ dueDate: 1 })
        .lean(),

      Booking.find({
        $or: [{ careSeekerId: userId }, { caregiverId: userId }],
        status: { $in: ['confirmed', 'in_progress'] },
        'schedule.startDate': { $gte: now, $lte: in7Days },
      })
        .populate('careSeekerId', 'fullName avatar')
        .populate('caregiverId', 'fullName avatar')
        .select('bookingNumber schedule serviceType status careSeekerId caregiverId')
        .lean(),
    ]);

    // Normalise bookings into schedule-entry shape
    const scheduleEntries = bookings.map(b => ({
      _id: b._id,
      type: 'schedule_upcoming',
      title: `${b.serviceType?.replace(/_/g, ' ')} Session`,
      startDate: b.schedule?.startDate,
      startTime: b.schedule?.startTime,
      endTime: b.schedule?.endTime,
      bookingNumber: b.bookingNumber,
      status: b.status,
      actionUrl: `/dashboard/bookings/${b._id}`,
      participants: {
        caregiver: b.caregiverId,
        careseeker: b.careSeekerId,
      },
    }));

    return { tasks, schedule: scheduleEntries };
  }

  // ─── Get all pending/in-progress tasks for user ─────────────────────────────

  async getUserTasks(userId, { page = 1, limit = 20, status, type } = {}) {
    const query = { userId };
    if (status) query.status = status;
    else query.status = { $in: ['pending', 'in_progress'] };
    if (type) query.type = type;

    const skip = (page - 1) * limit;
    const [tasks, total] = await Promise.all([
      Task.find(query).sort({ priority: 1, dueDate: 1 }).skip(skip).limit(Number(limit)).lean(),
      Task.countDocuments(query),
    ]);

    return { tasks, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) } };
  }

  // ─── Complete a task ────────────────────────────────────────────────────────

  async completeTask(taskId, userId) {
    const task = await Task.findOne({ _id: taskId, userId });
    if (!task) throw new Error('Task not found');
    await task.complete();
    return task;
  }

  // ─── Dismiss a task ─────────────────────────────────────────────────────────

  async dismissTask(taskId, userId) {
    const task = await Task.findOne({ _id: taskId, userId });
    if (!task) throw new Error('Task not found');
    await task.dismiss();
    return task;
  }

  // ─── Auto-generate payment_due task ─────────────────────────────────────────

  async createPaymentDueTask(userId, bookingId, amountDue, deadline) {
    return this.createTask({
      userId,
      type: 'payment_due',
      title: 'Payment Due',
      description: `You have an outstanding payment of NPR ${amountDue?.toLocaleString() || ''} due.`,
      priority: 'high',
      dueDate: deadline,
      actionUrl: `/booking/${bookingId}/payment`,
      linkedEntityId: bookingId,
      linkedEntityType: 'booking',
    });
  }

  // ─── Auto-generate review_pending task ─────────────────────────────────────

  async createReviewPendingTask(userId, bookingId) {
    return this.createTask({
      userId,
      type: 'review_pending',
      title: 'Leave a Review',
      description: 'Share your experience with your recent care session.',
      priority: 'low',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      actionUrl: `/dashboard/bookings/${bookingId}`,
      linkedEntityId: bookingId,
      linkedEntityType: 'booking',
    });
  }

  // ─── Auto-resolve tasks when booking/payment changes ────────────────────────

  async resolvePaymentTask(bookingId) {
    await Task.updateMany(
      { linkedEntityId: bookingId, type: 'payment_due', status: { $in: ['pending', 'in_progress'] } },
      { $set: { status: 'completed', completedAt: new Date() } }
    );
  }

  async resolveBookingTask(bookingId, type = 'booking_action') {
    await Task.updateMany(
      { linkedEntityId: bookingId, type, status: { $in: ['pending', 'in_progress'] } },
      { $set: { status: 'completed', completedAt: new Date() } }
    );
  }
}

export default new TaskService();
