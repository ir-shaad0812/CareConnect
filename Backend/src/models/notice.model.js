// ============================================
// NOTICE MODEL
// Admin communication board for broadcasting
// notices to users by role or specific targets
// ============================================

import mongoose from 'mongoose';

const noticeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },

  content: {
    type: String,
    required: true,
    maxlength: 5000,
  },

  type: {
    type: String,
    enum: ['info', 'normal', 'urgent', 'warning', 'announcement'],
    default: 'normal',
  },

  // Who can see this notice
  targetRoles: [{
    type: String,
    enum: ['caregiver', 'careseeker', 'admin', 'all'],
  }],

  // Specific users to target (empty = all users matching targetRoles)
  targetUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],

  // Whether recipients can respond
  allowResponse: {
    type: Boolean,
    default: false,
  },

  // Attachments (file URLs, e.g. from Cloudinary)
  attachments: [{
    name: String,
    url: String,
    type: String, // mime type
  }],

  expiryDate: {
    type: Date,
  },

  isActive: {
    type: Boolean,
    default: true,
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

noticeSchema.index({ targetRoles: 1, isActive: 1, createdAt: -1 });
noticeSchema.index({ expiryDate: 1 }, { expireAfterSeconds: 0, sparse: true });

const Notice = mongoose.model('Notice', noticeSchema);
export default Notice;
