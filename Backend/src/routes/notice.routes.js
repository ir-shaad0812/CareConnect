// ============================================
// NOTICE ROUTES
// ============================================

import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import {
  createNotice,
  adminListNotices,
  updateNotice,
  deleteNotice,
  getNoticeViews,
  getUserNotices,
  markNoticeRead,
  respondToNotice,
} from '../controllers/notice/notice.controller.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ─── User routes ─────────────────────────────────────────────────────────────
router.get('/', getUserNotices);
router.patch('/:noticeId/read', markNoticeRead);
router.post('/:noticeId/respond', respondToNotice);

// ─── Admin routes ────────────────────────────────────────────────────────────
router.post('/', authorize('admin'), createNotice);
router.get('/admin/all', authorize('admin'), adminListNotices);
router.patch('/:noticeId', authorize('admin'), updateNotice);
router.delete('/:noticeId', authorize('admin'), deleteNotice);
router.get('/:noticeId/views', authorize('admin'), getNoticeViews);

export default router;
