// ============================================
// NOTE ROUTES
// Full collaborative notes system with edit requests
// ============================================

import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { USER_ROLES } from '../constants/index.js';
import {
  createNote,
  getNotes,
  getNoteById,
  updateNote,
  deleteNote,
  getBookingNotes,
  getNoteStats,
  shareNote,
  shareMultipleNotes,
  createEditRequest,
  getEditRequests,
  approveEditRequest,
  rejectEditRequest,
} from '../controllers/note/note.controller.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// User routes (caregiver + careseeker)
router.post('/', authorize(USER_ROLES.CAREGIVER, USER_ROLES.CARESEEKER), createNote);
router.get('/', authorize(USER_ROLES.CAREGIVER, USER_ROLES.CARESEEKER), getNotes);
router.get('/stats', authorize(USER_ROLES.CAREGIVER, USER_ROLES.CARESEEKER), getNoteStats);

// Sharing
router.patch('/share-bulk', authorize(USER_ROLES.CARESEEKER), shareMultipleNotes);
router.patch('/:noteId/share', authorize(USER_ROLES.CARESEEKER), shareNote);

// Edit requests
router.post('/edit-request', authorize(USER_ROLES.CAREGIVER, USER_ROLES.CARESEEKER), createEditRequest);
router.get('/edit-requests', authorize(USER_ROLES.CAREGIVER, USER_ROLES.CARESEEKER), getEditRequests);
router.patch('/edit-request/:requestId/approve', authorize(USER_ROLES.CARESEEKER), approveEditRequest);
router.patch('/edit-request/:requestId/reject', authorize(USER_ROLES.CARESEEKER), rejectEditRequest);

// Booking notes
router.get('/booking/:bookingId', authorize(USER_ROLES.CAREGIVER, USER_ROLES.CARESEEKER), getBookingNotes);

// Single note CRUD
router.get('/:noteId', authorize(USER_ROLES.CAREGIVER, USER_ROLES.CARESEEKER), getNoteById);
router.put('/:noteId', authorize(USER_ROLES.CAREGIVER, USER_ROLES.CARESEEKER), updateNote);
router.delete('/:noteId', authorize(USER_ROLES.CAREGIVER, USER_ROLES.CARESEEKER), deleteNote);

export default router;
