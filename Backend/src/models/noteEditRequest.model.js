// ============================================
// NOTE EDIT REQUEST MODEL
// Caregivers can request edits to notes they can view
// Families (care-seekers) approve or reject
// ============================================

import mongoose from 'mongoose';

const noteEditRequestSchema = new mongoose.Schema({
  // The note being requested to edit
  noteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Note',
    required: true,
  },

  // Who is requesting the edit (caregiver)
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  // Note owner who will approve/reject (careseeker)
  requestedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  // The booking this is related to
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
  },

  // Proposed changes
  proposedTitle: {
    type: String,
    trim: true,
    maxlength: 200,
  },

  proposedContent: {
    type: String,
    trim: true,
    maxlength: 5000,
  },

  proposedTag: {
    type: String,
    enum: ['important', 'follow-up', 'medical', 'general'],
  },

  // Reason for the edit request
  reason: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000,
  },

  // Status of the request
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },

  // Response from the note owner
  responseMessage: {
    type: String,
    trim: true,
    maxlength: 500,
  },

  respondedAt: {
    type: Date,
  },

}, {
  timestamps: true,
});

noteEditRequestSchema.index({ noteId: 1, status: 1 });
noteEditRequestSchema.index({ requestedBy: 1, status: 1, createdAt: -1 });
noteEditRequestSchema.index({ requestedTo: 1, status: 1, createdAt: -1 });
noteEditRequestSchema.index({ bookingId: 1 });

const NoteEditRequest = mongoose.model('NoteEditRequest', noteEditRequestSchema);

export default NoteEditRequest;
