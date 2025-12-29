// ============================================
// NOTICE CONTROLLER
// ============================================

import { ApiResponse, asyncHandler, ApiError } from '../../utils/apiResponse.js';
import noticeService from '../../services/notice.service.js';

// ─── Admin ──────────────────────────────────────────────────────────────────

export const createNotice = asyncHandler(async (req, res) => {
  const notice = await noticeService.createNotice(req.user._id, req.body);
  res.status(201).json(new ApiResponse(201, { notice }, 'Notice created'));
});

export const adminListNotices = asyncHandler(async (req, res) => {
  const result = await noticeService.adminListNotices(req.query);
  res.json(new ApiResponse(200, result, 'Notices fetched'));
});

export const updateNotice = asyncHandler(async (req, res) => {
  const notice = await noticeService.updateNotice(req.params.noticeId, req.body);
  res.json(new ApiResponse(200, { notice }, 'Notice updated'));
});

export const deleteNotice = asyncHandler(async (req, res) => {
  await noticeService.deleteNotice(req.params.noticeId);
  res.json(new ApiResponse(200, null, 'Notice deactivated'));
});

export const getNoticeViews = asyncHandler(async (req, res) => {
  const data = await noticeService.getNoticeViews(req.params.noticeId);
  res.json(new ApiResponse(200, data, 'Notice views fetched'));
});

// ─── User ────────────────────────────────────────────────────────────────────

export const getUserNotices = asyncHandler(async (req, res) => {
  const result = await noticeService.getUserNotices(req.user._id, req.user.role, req.query);
  res.json(new ApiResponse(200, result, 'Notices fetched'));
});

export const markNoticeRead = asyncHandler(async (req, res) => {
  await noticeService.markNoticeRead(req.params.noticeId, req.user._id);
  res.json(new ApiResponse(200, null, 'Marked as read'));
});

export const respondToNotice = asyncHandler(async (req, res) => {
  const { message } = req.body;
  if (!message?.trim()) throw ApiError.badRequest('Response message is required');
  const response = await noticeService.respondToNotice(req.params.noticeId, req.user._id, message);
  res.status(201).json(new ApiResponse(201, { response }, 'Response submitted'));
});
