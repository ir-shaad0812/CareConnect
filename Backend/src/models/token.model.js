import mongoose from 'mongoose';
import { TOKEN_TYPES } from '../constants/index.js';

const tokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    token: { type: String, required: true },
    type: {
      type: String,
      enum: Object.values(TOKEN_TYPES),
      required: true,
    },
    expiresAt: { type: Date, required: true },
    isUsed: { type: Boolean, default: false },
    userAgent: { type: String },
    ipAddress: { type: String },
  },
  { timestamps: true }
);

// Indexes
tokenSchema.index({ token: 1, type: 1 });
tokenSchema.index({ userId: 1, type: 1 });
tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Create verification token
tokenSchema.statics.createVerificationToken = async function (userId, hashedToken, expiresInHours = 24) {
  await this.deleteMany({ userId, type: TOKEN_TYPES.EMAIL_VERIFICATION });

  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

  return this.create({
    userId,
    token: hashedToken,
    type: TOKEN_TYPES.EMAIL_VERIFICATION,
    expiresAt,
  });
};

// Create password reset token
tokenSchema.statics.createPasswordResetToken = async function (userId, hashedToken, expiresInHours = 1) {
  await this.deleteMany({ userId, type: TOKEN_TYPES.PASSWORD_RESET });

  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

  return this.create({
    userId,
    token: hashedToken,
    type: TOKEN_TYPES.PASSWORD_RESET,
    expiresAt,
  });
};

// Create refresh token
tokenSchema.statics.createRefreshToken = async function (userId, hashedToken, userAgent, ipAddress) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  return this.create({
    userId,
    token: hashedToken,
    type: TOKEN_TYPES.REFRESH,
    expiresAt,
    userAgent,
    ipAddress,
  });
};

// Find valid token
tokenSchema.statics.findValidToken = async function (hashedToken, type) {
  return this.findOne({
    token: hashedToken,
    type,
    isUsed: false,
    expiresAt: { $gt: new Date() },
  });
};

// Mark token as used
tokenSchema.methods.markAsUsed = async function () {
  this.isUsed = true;
  return this.save();
};

const Token = mongoose.model('Token', tokenSchema);

export default Token;
