import mongoose from 'mongoose';
import { DOCUMENT_TYPES, DOCUMENT_STATUS } from '../constants/index.js';

const documentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: Object.values(DOCUMENT_TYPES),
      required: true,
    },
    fileName: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    url: { type: String, required: true },
    publicId: { type: String },
    status: {
      type: String,
      enum: Object.values(DOCUMENT_STATUS),
      default: DOCUMENT_STATUS.PENDING,
    },
    verifiedAt: { type: Date },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    rejectionReason: { type: String },
    expiryDate: { type: Date },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// ── Virtual: fileUrl (aliases `url`) so both field names work ──────────────────
documentSchema.virtual('fileUrl').get(function () {
  return this.url;
});

// ── Virtual: documentType (aliases `type`) for admin-page compatibility ────────
documentSchema.virtual('documentType').get(function () {
  return this.type;
});

// Indexes
documentSchema.index({ userId: 1, type: 1 });

// Get user's documents
documentSchema.statics.getUserDocuments = async function (userId) {
  return this.find({ userId }).sort({ createdAt: -1 });
};

// Check if user has verified document
documentSchema.statics.hasVerifiedDocument = async function (userId, type) {
  const doc = await this.findOne({
    userId,
    type,
    status: DOCUMENT_STATUS.VERIFIED,
    $or: [
      { expiryDate: { $exists: false } },
      { expiryDate: { $gt: new Date() } },
    ],
  });
  return !!doc;
};

const Document = mongoose.model('Document', documentSchema);

export default Document;
