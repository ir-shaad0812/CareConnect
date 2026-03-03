// ============================================
// NOTICE RESPONSE MODEL
// User responses to notices that allow replies
// ============================================

import mongoose from 'mongoose';

const noticeResponseSchema = new mongoose.Schema({
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
  message: {
    type: String,
    required: true,
    maxlength: 1000,
  },
}, {
  timestamps: true,
});

noticeResponseSchema.index({ noticeId: 1 });
noticeResponseSchema.index({ userId: 1 });

const NoticeResponse = mongoose.model('NoticeResponse', noticeResponseSchema);
export default NoticeResponse;
