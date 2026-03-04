// ============================================
// NOTICE VIEW MODEL
// Read-receipt tracking per user per notice
// ============================================

import mongoose from 'mongoose';

const noticeViewSchema = new mongoose.Schema({
  noticeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Notice',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  seenAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: false,
});

noticeViewSchema.index({ noticeId: 1, userId: 1 }, { unique: true });
noticeViewSchema.index({ userId: 1 });

const NoticeView = mongoose.model('NoticeView', noticeViewSchema);
export default NoticeView;
