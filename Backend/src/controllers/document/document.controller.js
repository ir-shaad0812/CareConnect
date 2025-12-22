import documentService from '../../services/document.service.js';
import { ApiResponse, ApiError, asyncHandler } from '../../utils/apiResponse.js';

/**
 * Upload a document
 * POST /api/documents
 */
export const uploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw ApiError.badRequest(req.t('document', 'uploadFailed'));
  }

  const { type } = req.body;
  const document = await documentService.uploadDocument(
    req.user._id,
    req.file,
    type
  );

  res.status(201).json(
    new ApiResponse(201, { document }, req.t('document', 'uploadSuccess'))
  );
});

/**
 * Get user's documents
 * GET /api/documents
 */
export const getUserDocuments = asyncHandler(async (req, res) => {
  const documents = await documentService.getUserDocuments(req.user._id);

  res.status(200).json(
    new ApiResponse(200, { documents }, req.t('document', 'fetchSuccess'))
  );
});

/**
 * Get document by ID
 * GET /api/documents/:documentId
 */
export const getDocumentById = asyncHandler(async (req, res) => {
  const document = await documentService.getDocumentById(req.params.documentId);

  res.status(200).json(
    new ApiResponse(200, { document }, req.t('document', 'fetchSuccess'))
  );
});

/**
 * Delete a document
 * DELETE /api/documents/:documentId
 */
export const deleteDocument = asyncHandler(async (req, res) => {
  const result = await documentService.deleteDocument(
    req.params.documentId,
    req.user._id
  );

  res.status(200).json(new ApiResponse(200, null, req.t('document', 'deleteSuccess')));
});

/**
 * Get pending documents (Admin)
 * GET /api/documents/admin/pending
 */
export const getPendingDocuments = asyncHandler(async (req, res) => {
  const result = await documentService.getPendingDocuments(req.query);

  res.status(200).json(
    new ApiResponse(200, result, req.t('admin', 'documentsFetched'))
  );
});

/**
 * Verify a document (Admin)
 * PATCH /api/documents/:documentId/verify
 */
export const verifyDocument = asyncHandler(async (req, res) => {
  const document = await documentService.verifyDocument(
    req.params.documentId,
    req.user._id
  );

  res.status(200).json(
    new ApiResponse(200, { document }, req.t('document', 'verifySuccess'))
  );
});

/**
 * Reject a document (Admin)
 * PATCH /api/documents/:documentId/reject
 */
export const rejectDocument = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const document = await documentService.rejectDocument(
    req.params.documentId,
    req.user._id,
    reason
  );

  res.status(200).json(
    new ApiResponse(200, { document }, req.t('document', 'rejectSuccess'))
  );
});
