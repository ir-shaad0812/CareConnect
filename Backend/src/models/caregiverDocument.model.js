import mongoose from 'mongoose';

/**
 * CaregiverDocument Model
 * Stores documents uploaded by caregivers
 * Collection: caregiver_documents (under careconnect database)
 */
const caregiverDocumentSchema = new mongoose.Schema(
  {
    // Reference to caregiver profile
    caregiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Caregiver',
      required: true,
      index: true,
    },

    // Reference to base user (for quick access)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Document Information
    type: {
      type: String,
      enum: [
        'id_proof',
        'address_proof',
        'certification',
        'background_check',
        'medical_certificate',
        'driving_license',
        'professional_license',
        'training_certificate',
        'reference_letter',
        'resume',
        'photo_id',
        'work_permit',
        'insurance',
        'other',
      ],
      required: true,
    },

    name: {
      type: String,
      required: true,
      maxlength: [200, 'Document name cannot exceed 200 characters'],
    },

    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },

    // File Information
    fileName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    fileType: { type: String }, // mime type
    fileSize: { type: Number }, // in bytes
    thumbnailUrl: { type: String },

    // Document Details
    documentNumber: { type: String }, // ID number, license number, etc.
    issuedBy: { type: String },
    issueDate: { type: Date },
    expiryDate: { type: Date },

    // Verification
    status: {
      type: String,
      enum: ['pending', 'under_review', 'verified', 'rejected', 'expired'],
      default: 'pending',
    },
    verifiedBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User' // Admin who verified
    },
    verifiedAt: { type: Date },
    rejectionReason: { type: String },
    adminNotes: { type: String },

    // Visibility
    isPublic: { type: Boolean, default: false }, // Show to care seekers?
    isRequired: { type: Boolean, default: false },

    // Version Control
    version: { type: Number, default: 1 },
    previousVersions: [{
      fileUrl: { type: String },
      uploadedAt: { type: Date },
      status: { type: String },
    }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
caregiverDocumentSchema.index({ caregiverId: 1, type: 1 });
caregiverDocumentSchema.index({ status: 1 });
caregiverDocumentSchema.index({ expiryDate: 1 });

// Virtual: Check if document is expired
caregiverDocumentSchema.virtual('isExpired').get(function() {
  if (!this.expiryDate) return false;
  return this.expiryDate < new Date();
});

// Virtual: Check if document expires soon (within 30 days)
caregiverDocumentSchema.virtual('expiresSoon').get(function() {
  if (!this.expiryDate) return false;
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  return this.expiryDate < thirtyDaysFromNow && this.expiryDate > new Date();
});

// Pre-save: Update status if expired
caregiverDocumentSchema.pre('save', function(next) {
  if (this.expiryDate && this.expiryDate < new Date() && this.status !== 'expired') {
    this.status = 'expired';
  }
  next();
});

// Static: Find documents by caregiver
caregiverDocumentSchema.statics.findByCaregiverId = function(caregiverId) {
  return this.find({ caregiverId }).sort({ createdAt: -1 });
};

// Static: Find pending documents for admin review
caregiverDocumentSchema.statics.findPendingReview = function() {
  return this.find({ status: { $in: ['pending', 'under_review'] } })
    .populate('caregiverId')
    .populate('userId', 'fullName email')
    .sort({ createdAt: 1 });
};

// Static: Find expiring documents
caregiverDocumentSchema.statics.findExpiring = function(daysAhead = 30) {
  const futureDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
  return this.find({
    expiryDate: { $lte: futureDate, $gt: new Date() },
    status: 'verified',
  }).populate('caregiverId').populate('userId', 'fullName email');
};

const CaregiverDocument = mongoose.model('CaregiverDocument', caregiverDocumentSchema);

export default CaregiverDocument;
