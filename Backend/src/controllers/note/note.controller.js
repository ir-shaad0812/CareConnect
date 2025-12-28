// ============================================
// NOTE CONTROLLER
// Handles all note-related HTTP requests
// ============================================

import noteService from '../../services/note.service.js';
import { ApiResponse, asyncHandler, ApiError } from '../../utils/apiResponse.js';
import { USER_ROLES } from '../../constants/index.js';

/**
 * Create a new note (with or without booking)
 * POST /api/notes
 */
export const createNote = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const userRole = req.user.role;

  if (userRole === USER_ROLES.ADMIN) {
    throw ApiError.forbidden('Admins cannot create care notes');
  }

  const { title, content } = req.body;
  if (!title || !content) {
    throw ApiError.badRequest('title and content are required');
  }

  const note = await noteService.createNote(req.body, userId, userRole);

  res.status(201).json(
    new ApiResponse(201, { note }, 'Note created successfully')
  );
});

/**
 * Get all notes for the current user
 * GET /api/notes
 */
export const getNotes = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const userRole = req.user.role;
  const { tag, bookingId, search, visibility, page, limit } = req.query;

  const result = await noteService.getNotes(userId, userRole, {
    tag, bookingId, search, visibility, page, limit,
  });

  res.status(200).json(
    new ApiResponse(200, result, 'Notes fetched successfully')
  );
});

/**
 * Get a single note
 * GET /api/notes/:noteId
 */
export const getNoteById = asyncHandler(async (req, res) => {
  const { noteId } = req.params;
  const userId = req.user._id;

  const note = await noteService.getNoteById(noteId, userId);

  res.status(200).json(
    new ApiResponse(200, { note }, 'Note fetched successfully')
  );
});

/**
 * Update a note
 * PUT /api/notes/:noteId
 */
export const updateNote = asyncHandler(async (req, res) => {
  const { noteId } = req.params;
  const userId = req.user._id;

  const note = await noteService.updateNote(noteId, userId, req.body);

  res.status(200).json(
    new ApiResponse(200, { note }, 'Note updated successfully')
  );
});

/**
 * Delete a note
 * DELETE /api/notes/:noteId
 */
export const deleteNote = asyncHandler(async (req, res) => {
  const { noteId } = req.params;
  const userId = req.user._id;

  const result = await noteService.deleteNote(noteId, userId);

  res.status(200).json(
    new ApiResponse(200, result, 'Note deleted successfully')
  );
});

/**
 * Share a private note with a caregiver
 * PATCH /api/notes/:noteId/share
 */
export const shareNote = asyncHandler(async (req, res) => {
  const { noteId } = req.params;
  const userId = req.user._id;
  const { bookingId } = req.body;

  if (!bookingId) {
    throw ApiError.badRequest('bookingId is required');
  }

  const note = await noteService.shareNote(noteId, userId, bookingId);

  res.status(200).json(
    new ApiResponse(200, { note }, 'Note shared successfully')
  );
});

/**
 * Share multiple private notes
 * PATCH /api/notes/share-bulk
 */
export const shareMultipleNotes = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { noteIds, bookingId } = req.body;

  if (!noteIds || !Array.isArray(noteIds) || !bookingId) {
    throw ApiError.badRequest('noteIds (array) and bookingId are required');
  }

  const results = await noteService.shareMultipleNotes(noteIds, userId, bookingId);

  res.status(200).json(
    new ApiResponse(200, { results }, 'Notes sharing processed')
  );
});

/**
 * Get notes for a specific booking
 * GET /api/notes/booking/:bookingId
 */
export const getBookingNotes = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const userId = req.user._id;

  const notes = await noteService.getBookingNotes(bookingId, userId);

  res.status(200).json(
    new ApiResponse(200, { notes }, 'Booking notes fetched successfully')
  );
});

/**
 * Get note stats
 * GET /api/notes/stats
 */
export const getNoteStats = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const stats = await noteService.getNoteStats(userId);

  res.status(200).json(
    new ApiResponse(200, { stats }, 'Note stats fetched successfully')
  );
});

// ============================================
// EDIT REQUEST ENDPOINTS
// ============================================

/**
 * Create an edit request (caregiver)
 * POST /api/notes/edit-request
 */
export const createEditRequest = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { noteId, reason } = req.body;

  if (!noteId || !reason) {
    throw ApiError.badRequest('noteId and reason are required');
  }

  const editRequest = await noteService.createEditRequest(req.body, userId);

  res.status(201).json(
    new ApiResponse(201, { editRequest }, 'Edit request submitted')
  );
});

/**
 * Get edit requests
 * GET /api/notes/edit-requests
 */
export const getEditRequests = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { status, role, page, limit } = req.query;

  const result = await noteService.getEditRequests(userId, { status, role, page, limit });

  res.status(200).json(
    new ApiResponse(200, result, 'Edit requests fetched')
  );
});

/**
 * Approve an edit request (note owner)
 * PATCH /api/notes/edit-request/:requestId/approve
 */
export const approveEditRequest = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const userId = req.user._id;
  const { responseMessage } = req.body;

  const editRequest = await noteService.approveEditRequest(requestId, userId, responseMessage);

  res.status(200).json(
    new ApiResponse(200, { editRequest }, 'Edit request approved')
  );
});

/**
 * Reject an edit request (note owner)
 * PATCH /api/notes/edit-request/:requestId/reject
 */
export const rejectEditRequest = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const userId = req.user._id;
  const { responseMessage } = req.body;

  const editRequest = await noteService.rejectEditRequest(requestId, userId, responseMessage);

  res.status(200).json(
    new ApiResponse(200, { editRequest }, 'Edit request rejected')
  );
});

// ============================================
// ADMIN METHODS
// ============================================

/**
 * Admin: Get all notes
 * GET /api/admin/notes
 */
export const adminGetNotes = asyncHandler(async (req, res) => {
  if (req.user.role !== USER_ROLES.ADMIN) {
    throw ApiError.forbidden('Admin access required');
  }

  const { tag, bookingId, userId, search, page, limit } = req.query;

  const result = await noteService.adminGetNotes({
    tag, bookingId, userId, search, page, limit,
  });

  res.status(200).json(
    new ApiResponse(200, result, 'Notes fetched successfully')
  );
});

/**
 * Admin: Delete a note
 * DELETE /api/admin/notes/:noteId
 */
export const adminDeleteNote = asyncHandler(async (req, res) => {
  if (req.user.role !== USER_ROLES.ADMIN) {
    throw ApiError.forbidden('Admin access required');
  }

  const { noteId } = req.params;
  const result = await noteService.adminDeleteNote(noteId);

  res.status(200).json(
    new ApiResponse(200, result, 'Note deleted by admin')
  );
});
