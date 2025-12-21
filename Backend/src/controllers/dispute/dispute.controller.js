// ============================================
// DISPUTE CONTROLLER
// Handles dispute HTTP requests
// ============================================

import disputeService from '../../services/dispute.service.js';
import { ApiResponse, asyncHandler, ApiError } from '../../utils/apiResponse.js';
import { USER_ROLES } from '../../constants/index.js';

// ============================================
// USER ENDPOINTS
// ============================================

export const createDispute = asyncHandler(async (req, res) => {
  const { bookingId, category, subject, description } = req.body;
  if (!bookingId || !category || !subject || !description) {
    throw ApiError.badRequest('bookingId, category, subject, and description are required');
  }

  const dispute = await disputeService.createDispute(req.body, req.user._id, req.user.role);
  res.status(201).json(new ApiResponse(201, { dispute }, 'Dispute submitted'));
});

export const getUserDisputes = asyncHandler(async (req, res) => {
  const result = await disputeService.getUserDisputes(req.user._id, req.query);
  res.status(200).json(new ApiResponse(200, result, 'Disputes fetched'));
});

export const getDisputeById = asyncHandler(async (req, res) => {
  const isAdmin = req.user.role === USER_ROLES.ADMIN;
  const dispute = await disputeService.getDisputeById(req.params.disputeId, req.user._id, isAdmin);
  res.status(200).json(new ApiResponse(200, { dispute }, 'Dispute fetched'));
});

export const addMessage = asyncHandler(async (req, res) => {
  const { content } = req.body;
  if (!content) throw ApiError.badRequest('content is required');

  const dispute = await disputeService.addMessage(req.params.disputeId, req.user._id, req.user.role, content);
  res.status(200).json(new ApiResponse(200, { dispute }, 'Message added'));
});

export const addEvidence = asyncHandler(async (req, res) => {
  const { url, type, name } = req.body;
  if (!url) throw ApiError.badRequest('url is required');

  const dispute = await disputeService.addEvidence(req.params.disputeId, req.user._id, { url, type, name });
  res.status(200).json(new ApiResponse(200, { dispute }, 'Evidence added'));
});

// ============================================
// ADMIN ENDPOINTS
// ============================================

export const adminGetDisputes = asyncHandler(async (req, res) => {
  if (req.user.role !== USER_ROLES.ADMIN) throw ApiError.forbidden('Admin access required');
  const result = await disputeService.adminGetDisputes(req.query);
  res.status(200).json(new ApiResponse(200, result, 'Disputes fetched'));
});

export const adminUpdateStatus = asyncHandler(async (req, res) => {
  if (req.user.role !== USER_ROLES.ADMIN) throw ApiError.forbidden('Admin access required');
  const { status, message } = req.body;
  if (!status) throw ApiError.badRequest('status is required');

  const dispute = await disputeService.adminUpdateStatus(req.params.disputeId, req.user._id, status, message);
  res.status(200).json(new ApiResponse(200, { dispute }, 'Status updated'));
});

export const adminResolve = asyncHandler(async (req, res) => {
  if (req.user.role !== USER_ROLES.ADMIN) throw ApiError.forbidden('Admin access required');
  const { type, description, refundAmount } = req.body;
  if (!type) throw ApiError.badRequest('resolution type is required');

  const dispute = await disputeService.adminResolve(req.params.disputeId, req.user._id, { type, description, refundAmount });
  res.status(200).json(new ApiResponse(200, { dispute }, 'Dispute resolved'));
});

export const adminSendMessage = asyncHandler(async (req, res) => {
  if (req.user.role !== USER_ROLES.ADMIN) throw ApiError.forbidden('Admin access required');
  const { content, targetRole } = req.body;
  if (!content) throw ApiError.badRequest('content is required');

  const dispute = await disputeService.adminSendMessage(req.params.disputeId, req.user._id, content, targetRole);
  res.status(200).json(new ApiResponse(200, { dispute }, 'Message sent'));
});

export const adminAddNote = asyncHandler(async (req, res) => {
  if (req.user.role !== USER_ROLES.ADMIN) throw ApiError.forbidden('Admin access required');
  const { content } = req.body;
  if (!content) throw ApiError.badRequest('content is required');

  const dispute = await disputeService.adminAddNote(req.params.disputeId, req.user._id, content);
  res.status(200).json(new ApiResponse(200, { dispute }, 'Note added'));
});

export const getDisputeStats = asyncHandler(async (req, res) => {
  if (req.user.role !== USER_ROLES.ADMIN) throw ApiError.forbidden('Admin access required');
  const stats = await disputeService.getDisputeStats();
  res.status(200).json(new ApiResponse(200, { stats }, 'Stats fetched'));
});
