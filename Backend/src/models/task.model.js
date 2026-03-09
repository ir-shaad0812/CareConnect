// ============================================
// TASK MODEL
// Auto-generated tasks from bookings, payments,
// schedules, notes — displayed in the Task Center
// ============================================

import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },

  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 300,
  },

  description: {
    type: String,
    maxlength: 1000,
  },

  // What generated this task
  type: {
    type: String,
    enum: [
      'payment_due',          // Partial/unpaid booking needing payment
      'booking_action',       // Caregiver needs to accept/reject booking
      'check_in',             // Time to check-in for a session
      'check_out',            // Time to check-out from a session
      'profile_incomplete',   // User needs to complete their profile
      'document_upload',      // Document upload required
      'review_pending',       // Leave a review for completed booking
      'schedule_upcoming',    // Upcoming booked session
      'note_action',          // Note edit request pending
      'general',              // Manual/admin-created task
    ],
    required: true,
  },

  priority: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'medium',
  },

  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'dismissed'],
    default: 'pending',
    index: true,
  },

  dueDate: {
    type: Date,
    index: true,
  },

  // Deep-link to the relevant page
  actionUrl: {
    type: String,
  },

  // Related entity (booking, payment, note, etc.)
  linkedEntityId: {
    type: mongoose.Schema.Types.ObjectId,
  },

  linkedEntityType: {
    type: String,
    enum: ['booking', 'payment', 'note', 'document', 'review', 'profile'],
  },

  completedAt: Date,
  dismissedAt: Date,
}, {
  timestamps: true,
});

taskSchema.index({ userId: 1, status: 1, dueDate: 1 });
taskSchema.index({ userId: 1, type: 1 });

// Mark completed
taskSchema.methods.complete = async function () {
  this.status = 'completed';
  this.completedAt = new Date();
  return this.save();
};

// Dismiss
taskSchema.methods.dismiss = async function () {
  this.status = 'dismissed';
  this.dismissedAt = new Date();
  return this.save();
};

const Task = mongoose.model('Task', taskSchema);
export default Task;
