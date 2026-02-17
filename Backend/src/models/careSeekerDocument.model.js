import mongoose from 'mongoose';

/**
 * CareSeekerDocument Model
 * Stores documents uploaded by care seekers
 * Collection: careseeker_documents (under careconnect database)
 */
const careSeekerDocumentSchema = new mongoose.Schema(
  {
    // Reference to care seeker profile
    careSeekerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CareSeeker',
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
        'medical_records',
        'insurance_card',
        'power_of_attorney',
        'care_plan',
        'physician_orders',
        'medication_list',
        'allergy_information',
        'emergency_contacts',
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

    // For which family member (if applicable)
    familyMemberName: { type: String },

    // File Information
    fileName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    fileType: { type: String },
    fileSize: { type: Number },
    thumbnailUrl: { type: String },

    // Document Details
    documentNumber: { type: String },
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
      ref: 'User'
    },
    verifiedAt: { type: Date },
    rejectionReason: { type: String },
    adminNotes: { type: String },

    // Sharing Settings
    sharedWithCaregivers: [{
      caregiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Caregiver' },
      sharedAt: { type: Date, default: Date.now },
      accessLevel: { 
        type: String, 
        enum: ['view', 'download'],
        default: 'view',
      },
    }],

    // Privacy
    isConfidential: { type: Boolean, default: true },

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
careSeekerDocumentSchema.index({ careSeekerId: 1, type: 1 });
careSeekerDocumentSchema.index({ status: 1 });
careSeekerDocumentSchema.index({ expiryDate: 1 });

// Virtual: Check if document is expired
careSeekerDocumentSchema.virtual('isExpired').get(function() {
  if (!this.expiryDate) return false;
  return this.expiryDate < new Date();
});

// Pre-save: Update status if expired
careSeekerDocumentSchema.pre('save', function(next) {
  if (this.expiryDate && this.expiryDate < new Date() && this.status !== 'expired') {
    this.status = 'expired';
  }
  next();
});

// Static: Find documents by care seeker
careSeekerDocumentSchema.statics.findByCareSeekerId = function(careSeekerId) {
  return this.find({ careSeekerId }).sort({ createdAt: -1 });
};

// Static: Find pending documents for admin review
careSeekerDocumentSchema.statics.findPendingReview = function() {
  return this.find({ status: { $in: ['pending', 'under_review'] } })
    .populate('careSeekerId')
    .populate('userId', 'fullName email')
    .sort({ createdAt: 1 });
};

const CareSeekerDocument = mongoose.model('CareSeekerDocument', careSeekerDocumentSchema);

export default CareSeekerDocument;
