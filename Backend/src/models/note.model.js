// ============================================
// NOTE MODEL
// Collaborative care plan notes between caregivers and care seekers
// Supports private notes before booking, shared notes after payment
// ============================================

import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema({
  // Who created the note
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  // Role of the creator
  creatorRole: {
    type: String,
    enum: ['caregiver', 'careseeker'],
    required: true,
  },

  // The booking this note is associated with (optional for private pre-booking notes)
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
  },

  // The other party (caregiver or careseeker) — only set when shared
  sharedWith: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },

  // Note title
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },

  // Note content / description
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 5000,
  },

  // Tags for categorization (routine, medical, preferences, etc.)
  tags: [{
    type: String,
    enum: ['routine', 'medical', 'preferences', 'important', 'follow-up', 'general', 'dietary', 'emergency', 'behavioral'],
    default: 'general',
  }],

  // Legacy single tag field (kept for backward compat)
  tag: {
    type: String,
    enum: ['important', 'follow-up', 'medical', 'general', 'routine', 'preferences'],
    default: 'general',
  },

  // Visibility: who can see the note
  visibility: {
    type: String,
    enum: ['private', 'shared'],
    default: 'private',
  },

  // Whether the note has pending edit requests
  hasPendingEditRequest: {
    type: Boolean,
    default: false,
  },

  // Soft delete
  isDeleted: {
    type: Boolean,
    default: false,
  },

}, {
  timestamps: true,
});

// Indexes for efficient queries
noteSchema.index({ createdBy: 1, isDeleted: 1, createdAt: -1 });
noteSchema.index({ bookingId: 1, isDeleted: 1 });
noteSchema.index({ sharedWith: 1, visibility: 1, isDeleted: 1 });
noteSchema.index({ tag: 1 });
noteSchema.index({ tags: 1 });
noteSchema.index({ visibility: 1, createdBy: 1 });

const Note = mongoose.model('Note', noteSchema);

export default Note;
