import Document from '../models/document.model.js';
import { ApiError } from '../utils/apiResponse.js';
import { DOCUMENT_STATUS, DOCUMENT_TYPES } from '../constants/index.js';
import { uploadDocument, uploadImage, deleteFromCloudinary } from '../utils/cloudinary.js';
import config from '../config/index.js';

class DocumentService {
  /**
   * Upload a document
   */
  async uploadDocument(userId, file, documentType) {
    if (!Object.values(DOCUMENT_TYPES).includes(documentType)) {
      throw ApiError.badRequest('Invalid document type');
    }

    const existingDoc = await Document.findOne({
      userId,
      type: documentType,
      status: { $in: [DOCUMENT_STATUS.PENDING, DOCUMENT_STATUS.VERIFIED] },
    });

    if (existingDoc) {
      throw ApiError.conflict(
        `A ${documentType.replace('_', ' ')} document is already ${existingDoc.status}`
      );
    }

    // Upload to Cloudinary
    let cloudinaryResult;
    const isImage = file.mimetype.startsWith('image/');
    
    try {
      if (isImage) {
        cloudinaryResult = await uploadImage(file.buffer, {
          folder: `careconnect/documents/${userId}`,
          publicId: `${documentType}_${Date.now()}`,
        });
      } else {
        cloudinaryResult = await uploadDocument(file.buffer, {
          folder: `careconnect/documents/${userId}`,
          publicId: `${documentType}_${Date.now()}`,
        });
      }
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw ApiError.serverError('Failed to upload document to cloud storage');
    }

    // Create document record with Cloudinary URL
    const document = await Document.create({
      userId,
      type: documentType,
      fileName: file.originalname,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: cloudinaryResult.size || file.size,
      url: cloudinaryResult.url, // Cloudinary secure URL
      publicId: cloudinaryResult.publicId, // Cloudinary public ID for deletion
      status: DOCUMENT_STATUS.PENDING,
    });

    return document;
  }

  /**
   * Get user's documents
   */
  async getUserDocuments(userId) {
    return await Document.find({ userId }).sort({ createdAt: -1 });
  }

  /**
   * Get document by ID
   */
  async getDocumentById(documentId) {
    const document = await Document.findById(documentId);
    if (!document) {
      throw ApiError.notFound('Document not found');
    }
    return document;
  }

  /**
   * Delete a document
   */
  async deleteDocument(documentId, userId) {
    const document = await Document.findOne({ _id: documentId, userId });
    
    if (!document) {
      throw ApiError.notFound('Document not found');
    }

    if (document.status === DOCUMENT_STATUS.VERIFIED) {
      throw ApiError.badRequest('Cannot delete a verified document');
    }

    // Delete from Cloudinary if publicId exists
    if (document.publicId && config.cloudinary.enabled) {
      try {
        const resourceType = document.mimeType.startsWith('image/') ? 'image' : 'raw';
        await deleteFromCloudinary(document.publicId, resourceType);
      } catch (error) {
        console.error('Failed to delete from Cloudinary:', error);
        // Continue with database deletion even if Cloudinary deletion fails
      }
    }

    await document.deleteOne();

    return { message: 'Document deleted successfully' };
  }

  /**
   * Get all pending documents (Admin)
   */
  async getPendingDocuments(query = {}) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const [documents, total] = await Promise.all([
      Document.find({ status: DOCUMENT_STATUS.PENDING })
        .populate('userId', 'fullName email role')
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Document.countDocuments({ status: DOCUMENT_STATUS.PENDING }),
    ]);

    return {
      documents,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Verify a document (Admin)
   */
  async verifyDocument(documentId, adminId) {
    const document = await Document.findByIdAndUpdate(
      documentId,
      {
        $set: {
          status: DOCUMENT_STATUS.VERIFIED,
          verifiedAt: new Date(),
          verifiedBy: adminId,
        },
      },
      { new: true }
    );

    if (!document) {
      throw ApiError.notFound('Document not found');
    }

    return document;
  }

  /**
   * Reject a document (Admin)
   */
  async rejectDocument(documentId, adminId, rejectionReason) {
    if (!rejectionReason) {
      throw ApiError.badRequest('Rejection reason is required');
    }

    const document = await Document.findByIdAndUpdate(
      documentId,
      {
        $set: {
          status: DOCUMENT_STATUS.REJECTED,
          verifiedBy: adminId,
          rejectionReason,
        },
      },
      { new: true }
    );

    if (!document) {
      throw ApiError.notFound('Document not found');
    }

    return document;
  }
}

export default new DocumentService();
