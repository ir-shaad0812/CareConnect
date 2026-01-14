// ============================================
// NOTE SERVICE
// Business logic for the collaborative notes system
// Supports private notes, sharing after payment, edit requests
// ============================================

import mongoose from 'mongoose';
import Note from '../models/note.model.js';
import NoteEditRequest from '../models/noteEditRequest.model.js';
import Booking from '../models/booking.model.js';
import { ApiError } from '../utils/apiResponse.js';
import { eventBus, SYSTEM_EVENTS } from '../utils/eventBus.js';

const STARTED_BOOKING_STATUSES = ['active', 'in_progress', 'completed'];
const NOTE_ALLOWED_PAYMENT_STATUSES = ['partially_paid', 'fully_paid'];

class NoteService {
  toIdString(value) {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (value._id) return value._id.toString();
    return value.toString();
  }

  emitNoteEventToParticipants(event, note, extra = {}) {
    if (!note) return;

    const createdById = this.toIdString(note.createdBy);
    const sharedWithId = this.toIdString(note.sharedWith);
    const noteId = this.toIdString(note._id);
    const bookingId = this.toIdString(note.bookingId);

    const payload = {
      noteId,
      bookingId,
      visibility: note.visibility,
      createdBy: createdById,
      sharedWith: sharedWithId,
      ...extra,
    };

    if (createdById) {
      eventBus.emitToUser(createdById, event, payload);
    }
    if (sharedWithId && sharedWithId !== createdById) {
      eventBus.emitToUser(sharedWithId, event, payload);
    }
  }

  emitEditRequestEvent(event, editRequest, extra = {}) {
    if (!editRequest) return;

    const requestedById = this.toIdString(editRequest.requestedBy);
    const requestedToId = this.toIdString(editRequest.requestedTo);
    const payload = {
      editRequestId: this.toIdString(editRequest._id),
      noteId: this.toIdString(editRequest.noteId),
      bookingId: this.toIdString(editRequest.bookingId),
      status: editRequest.status,
      requestedBy: requestedById,
      requestedTo: requestedToId,
      ...extra,
    };

    if (requestedById) {
      eventBus.emitToUser(requestedById, event, payload);
    }
    if (requestedToId && requestedToId !== requestedById) {
      eventBus.emitToUser(requestedToId, event, payload);
    }
  }

  // ============================================
  // PRIVATE NOTES (before booking)
  // ============================================

  /**
   * Create a private note (no booking required)
   * Families can create private notes before any booking
   */
  async createPrivateNote(noteData, userId, userRole) {
    const { title, content, tags, tag, visibility } = noteData;

    const note = await Note.create({
      createdBy: userId,
      creatorRole: userRole,
      title,
      content,
      tags: tags || (tag ? [tag] : ['general']),
      tag: tag || (tags && tags[0]) || 'general',
      visibility: 'private',
    });

    const populatedNote = await note.populate([
      { path: 'createdBy', select: 'fullName avatar role' },
    ]);

    this.emitNoteEventToParticipants(SYSTEM_EVENTS.NOTE_CREATED, populatedNote);

    return populatedNote;
  }

  /**
   * Create a note linked to a booking
    * Only allowed once booking has started and payment is done
   */
  async createNote(noteData, userId, userRole) {
    const { bookingId, title, content, tags, tag, visibility } = noteData;

    // If no bookingId, create a private note
    if (!bookingId) {
      return this.createPrivateNote(noteData, userId, userRole);
    }

    // Verify booking exists and user is part of it
    const booking = await Booking.findById(bookingId)
      .populate('careSeekerId', 'fullName')
      .populate('caregiverId', 'fullName');

    if (!booking) {
      throw ApiError.notFound('Booking not found');
    }

    const isCareSeeker = booking.careSeekerId._id.toString() === userId.toString();
    const isCaregiver = booking.caregiverId._id.toString() === userId.toString();

    if (!isCareSeeker && !isCaregiver) {
      throw ApiError.forbidden('You are not part of this booking');
    }

    // For shared notes: verify booking status allows notes
    const effectiveVisibility = visibility || 'shared';
    if (effectiveVisibility === 'shared') {
      if (!STARTED_BOOKING_STATUSES.includes(booking.status)) {
        throw ApiError.badRequest('Shared notes can only be added after a booking has started');
      }

      if (!NOTE_ALLOWED_PAYMENT_STATUSES.includes(booking.paymentStatus)) {
        throw ApiError.badRequest('Shared notes can only be added after payment has been made');
      }
    }

    // Determine the shared-with party
    const sharedWith = effectiveVisibility === 'shared'
      ? (isCareSeeker ? booking.caregiverId._id : booking.careSeekerId._id)
      : undefined;

    const note = await Note.create({
      createdBy: userId,
      creatorRole: isCareSeeker ? 'careseeker' : 'caregiver',
      bookingId,
      sharedWith,
      title,
      content,
      tags: tags || (tag ? [tag] : ['general']),
      tag: tag || (tags && tags[0]) || 'general',
      visibility: effectiveVisibility,
    });

    const populatedNote = await note.populate([
      { path: 'createdBy', select: 'fullName avatar role' },
      { path: 'sharedWith', select: 'fullName avatar role' },
      { path: 'bookingId', select: 'bookingNumber serviceType status schedule' },
    ]);

    this.emitNoteEventToParticipants(SYSTEM_EVENTS.NOTE_CREATED, populatedNote);

    return populatedNote;
  }

  /**
    * Share a private note with a caregiver (after booking has started + paid)
   */
  async shareNote(noteId, userId, bookingId) {
    const note = await Note.findOne({
      _id: noteId,
      createdBy: userId,
      visibility: 'private',
      isDeleted: false,
    });

    if (!note) {
      throw ApiError.notFound('Note not found or already shared');
    }

    const booking = await Booking.findById(bookingId)
      .populate('careSeekerId', 'fullName')
      .populate('caregiverId', 'fullName');

    if (!booking) {
      throw ApiError.notFound('Booking not found');
    }

    // Verify user is the care seeker
    if (booking.careSeekerId._id.toString() !== userId.toString()) {
      throw ApiError.forbidden('Only the care seeker can share notes');
    }

    // Verify booking has started and is paid
    if (!STARTED_BOOKING_STATUSES.includes(booking.status)) {
      throw ApiError.badRequest('Booking must be started before sharing notes');
    }

    if (!NOTE_ALLOWED_PAYMENT_STATUSES.includes(booking.paymentStatus)) {
      throw ApiError.badRequest('Payment must be completed before sharing notes');
    }

    note.visibility = 'shared';
    note.bookingId = bookingId;
    note.sharedWith = booking.caregiverId._id;
    await note.save();

    const populatedNote = await note.populate([
      { path: 'createdBy', select: 'fullName avatar role' },
      { path: 'sharedWith', select: 'fullName avatar role' },
      { path: 'bookingId', select: 'bookingNumber serviceType status schedule' },
    ]);

    this.emitNoteEventToParticipants(SYSTEM_EVENTS.NOTE_SHARED, populatedNote);

    return populatedNote;
  }

  /**
   * Bulk share multiple notes with a caregiver
   */
  async shareMultipleNotes(noteIds, userId, bookingId) {
    const results = [];
    for (const noteId of noteIds) {
      try {
        const note = await this.shareNote(noteId, userId, bookingId);
        results.push({ noteId, success: true, note });
      } catch (err) {
        results.push({ noteId, success: false, error: err.message });
      }
    }
    return results;
  }

  /**
   * Get notes for the current user
   * Includes notes created by user AND notes shared with user
   */
  async getNotes(userId, userRole, filters = {}) {
    const { tag, bookingId, search, visibility, page = 1, limit = 20 } = filters;

    const query = {
      isDeleted: false,
      $or: [
        { createdBy: new mongoose.Types.ObjectId(userId) },
        { sharedWith: new mongoose.Types.ObjectId(userId), visibility: 'shared' },
      ],
    };

    if (tag && tag !== 'all') {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { tag },
          { tags: tag },
        ],
      });
    }

    if (visibility && visibility !== 'all') {
      query.visibility = visibility;
    }

    if (bookingId) {
      query.bookingId = new mongoose.Types.ObjectId(bookingId);
    }

    if (search) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { content: { $regex: search, $options: 'i' } },
        ],
      });
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [notes, total] = await Promise.all([
      Note.find(query)
        .populate('createdBy', 'fullName avatar role')
        .populate('sharedWith', 'fullName avatar role')
        .populate('bookingId', 'bookingNumber serviceType status schedule careSeekerId caregiverId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Note.countDocuments(query),
    ]);

    return {
      notes,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    };
  }

  /**
   * Get a single note by ID
   */
  async getNoteById(noteId, userId) {
    const note = await Note.findOne({
      _id: noteId,
      isDeleted: false,
      $or: [
        { createdBy: userId },
        { sharedWith: userId, visibility: 'shared' },
      ],
    })
      .populate('createdBy', 'fullName avatar role')
      .populate('sharedWith', 'fullName avatar role')
      .populate('bookingId', 'bookingNumber serviceType status schedule');

    if (!note) {
      throw ApiError.notFound('Note not found');
    }

    return note;
  }

  /**
   * Update a note (only creator can update)
   */
  async updateNote(noteId, userId, updateData) {
    const note = await Note.findOne({
      _id: noteId,
      createdBy: userId,
      isDeleted: false,
    });

    if (!note) {
      throw ApiError.notFound('Note not found or you do not have permission to edit');
    }

    const allowedUpdates = ['title', 'content', 'tag', 'tags', 'visibility'];
    allowedUpdates.forEach(field => {
      if (updateData[field] !== undefined) {
        note[field] = updateData[field];
      }
    });

    // Sync tag and tags
    if (updateData.tag && !updateData.tags) {
      note.tags = [updateData.tag];
    }
    if (updateData.tags && !updateData.tag) {
      note.tag = updateData.tags[0] || 'general';
    }

    await note.save();

    const populatedNote = await note.populate([
      { path: 'createdBy', select: 'fullName avatar role' },
      { path: 'sharedWith', select: 'fullName avatar role' },
      { path: 'bookingId', select: 'bookingNumber serviceType status schedule' },
    ]);

    this.emitNoteEventToParticipants(SYSTEM_EVENTS.NOTE_UPDATED, populatedNote);

    return populatedNote;
  }

  /**
   * Delete a note (soft delete, only creator can delete)
   */
  async deleteNote(noteId, userId) {
    const note = await Note.findOne({
      _id: noteId,
      createdBy: userId,
      isDeleted: false,
    });

    if (!note) {
      throw ApiError.notFound('Note not found or you do not have permission to delete');
    }

    note.isDeleted = true;
    await note.save();

    this.emitNoteEventToParticipants(SYSTEM_EVENTS.NOTE_DELETED, note, {
      deleted: true,
    });

    return { message: 'Note deleted successfully' };
  }

  /**
   * Get notes for a specific booking
   */
  async getBookingNotes(bookingId, userId) {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      throw ApiError.notFound('Booking not found');
    }

    const isCareSeeker = booking.careSeekerId.toString() === userId.toString();
    const isCaregiver = booking.caregiverId.toString() === userId.toString();

    if (!isCareSeeker && !isCaregiver) {
      throw ApiError.forbidden('You are not part of this booking');
    }

    return Note.find({
      bookingId,
      isDeleted: false,
      $or: [
        { createdBy: userId },
        { sharedWith: userId, visibility: 'shared' },
      ],
    })
      .populate('createdBy', 'fullName avatar role')
      .populate('sharedWith', 'fullName avatar role')
      .sort({ createdAt: -1 })
      .lean();
  }

  // ============================================
  // EDIT REQUEST FLOW
  // ============================================

  /**
   * Caregiver submits an edit request for a note
   */
  async createEditRequest(editData, userId) {
    const { noteId, proposedTitle, proposedContent, proposedTag, reason } = editData;

    const note = await Note.findOne({
      _id: noteId,
      sharedWith: userId,
      visibility: 'shared',
      isDeleted: false,
    }).populate('createdBy', 'fullName');

    if (!note) {
      throw ApiError.notFound('Note not found or not shared with you');
    }

    // Check no pending request already exists
    const existingRequest = await NoteEditRequest.findOne({
      noteId,
      requestedBy: userId,
      status: 'pending',
    });

    if (existingRequest) {
      throw ApiError.conflict('You already have a pending edit request for this note');
    }

    const editRequest = await NoteEditRequest.create({
      noteId,
      requestedBy: userId,
      requestedTo: note.createdBy._id,
      bookingId: note.bookingId,
      proposedTitle,
      proposedContent,
      proposedTag,
      reason,
    });

    // Mark note as having a pending edit request
    note.hasPendingEditRequest = true;
    await note.save();

    const populatedRequest = await editRequest.populate([
      { path: 'requestedBy', select: 'fullName avatar role' },
      { path: 'requestedTo', select: 'fullName avatar role' },
      { path: 'noteId', select: 'title content tag' },
    ]);

    this.emitEditRequestEvent(
      SYSTEM_EVENTS.NOTE_EDIT_REQUEST_CREATED,
      populatedRequest,
    );

    return populatedRequest;
  }

  /**
   * Get edit requests for a user (as requester or as note owner)
   */
  async getEditRequests(userId, filters = {}) {
    const { status, role, page = 1, limit = 20 } = filters;

    const query = {};

    if (role === 'requester') {
      query.requestedBy = new mongoose.Types.ObjectId(userId);
    } else if (role === 'owner') {
      query.requestedTo = new mongoose.Types.ObjectId(userId);
    } else {
      query.$or = [
        { requestedBy: new mongoose.Types.ObjectId(userId) },
        { requestedTo: new mongoose.Types.ObjectId(userId) },
      ];
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [requests, total] = await Promise.all([
      NoteEditRequest.find(query)
        .populate('requestedBy', 'fullName avatar role')
        .populate('requestedTo', 'fullName avatar role')
        .populate('noteId', 'title content tag tags visibility')
        .populate('bookingId', 'bookingNumber serviceType')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      NoteEditRequest.countDocuments(query),
    ]);

    return {
      editRequests: requests,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    };
  }

  /**
   * Approve an edit request (note owner only)
   * Applies the proposed changes to the note
   */
  async approveEditRequest(requestId, userId, responseMessage) {
    const editRequest = await NoteEditRequest.findOne({
      _id: requestId,
      requestedTo: userId,
      status: 'pending',
    });

    if (!editRequest) {
      throw ApiError.notFound('Edit request not found or you cannot approve it');
    }

    // Apply changes to the note
    const note = await Note.findById(editRequest.noteId);
    if (!note) {
      throw ApiError.notFound('Note no longer exists');
    }

    if (editRequest.proposedTitle) note.title = editRequest.proposedTitle;
    if (editRequest.proposedContent) note.content = editRequest.proposedContent;
    if (editRequest.proposedTag) {
      note.tag = editRequest.proposedTag;
      note.tags = [editRequest.proposedTag];
    }
    note.hasPendingEditRequest = false;
    await note.save();

    // Update the request
    editRequest.status = 'approved';
    editRequest.responseMessage = responseMessage || 'Edit approved';
    editRequest.respondedAt = new Date();
    await editRequest.save();

    const populatedRequest = await editRequest.populate([
      { path: 'requestedBy', select: 'fullName avatar role' },
      { path: 'noteId', select: 'title content tag' },
    ]);

    this.emitEditRequestEvent(
      SYSTEM_EVENTS.NOTE_EDIT_REQUEST_APPROVED,
      populatedRequest,
      {
        responseMessage: editRequest.responseMessage,
      },
    );
    this.emitNoteEventToParticipants(SYSTEM_EVENTS.NOTE_UPDATED, note, {
      reason: 'edit_request_approved',
      editRequestId: this.toIdString(editRequest._id),
    });

    return populatedRequest;
  }

  /**
   * Reject an edit request (note owner only)
   */
  async rejectEditRequest(requestId, userId, responseMessage) {
    const editRequest = await NoteEditRequest.findOne({
      _id: requestId,
      requestedTo: userId,
      status: 'pending',
    });

    if (!editRequest) {
      throw ApiError.notFound('Edit request not found or you cannot reject it');
    }

    editRequest.status = 'rejected';
    editRequest.responseMessage = responseMessage || 'Edit rejected';
    editRequest.respondedAt = new Date();
    await editRequest.save();

    // Update note pending flag
    const pendingCount = await NoteEditRequest.countDocuments({
      noteId: editRequest.noteId,
      status: 'pending',
    });
    let note = null;
    if (pendingCount === 0) {
      note = await Note.findByIdAndUpdate(editRequest.noteId, { hasPendingEditRequest: false }, { new: true });
    }

    const populatedRequest = await editRequest.populate([
      { path: 'requestedBy', select: 'fullName avatar role' },
      { path: 'noteId', select: 'title content tag' },
    ]);

    this.emitEditRequestEvent(
      SYSTEM_EVENTS.NOTE_EDIT_REQUEST_REJECTED,
      populatedRequest,
      {
        responseMessage: editRequest.responseMessage,
      },
    );

    if (note) {
      this.emitNoteEventToParticipants(SYSTEM_EVENTS.NOTE_UPDATED, note, {
        reason: 'edit_request_rejected',
        editRequestId: this.toIdString(editRequest._id),
      });
    }

    return populatedRequest;
  }

  // ============================================
  // STATS
  // ============================================

  /**
   * Get note stats for a user
   */
  async getNoteStats(userId) {
    const uid = new mongoose.Types.ObjectId(userId);
    const [totalNotes, tagCounts, visibilityCounts, editRequestCounts] = await Promise.all([
      Note.countDocuments({
        isDeleted: false,
        $or: [{ createdBy: uid }, { sharedWith: uid, visibility: 'shared' }],
      }),
      Note.aggregate([
        {
          $match: {
            isDeleted: false,
            $or: [{ createdBy: uid }, { sharedWith: uid, visibility: 'shared' }],
          },
        },
        { $group: { _id: '$tag', count: { $sum: 1 } } },
      ]),
      Note.aggregate([
        {
          $match: {
            isDeleted: false,
            $or: [{ createdBy: uid }, { sharedWith: uid, visibility: 'shared' }],
          },
        },
        { $group: { _id: '$visibility', count: { $sum: 1 } } },
      ]),
      NoteEditRequest.aggregate([
        {
          $match: {
            $or: [{ requestedBy: uid }, { requestedTo: uid }],
          },
        },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const tags = { important: 0, 'follow-up': 0, medical: 0, general: 0, routine: 0, preferences: 0 };
    tagCounts.forEach(t => { if (tags[t._id] !== undefined) tags[t._id] = t.count; });

    const visibility = { private: 0, shared: 0 };
    visibilityCounts.forEach(v => { if (visibility[v._id] !== undefined) visibility[v._id] = v.count; });

    const editRequests = { pending: 0, approved: 0, rejected: 0 };
    editRequestCounts.forEach(e => { if (editRequests[e._id] !== undefined) editRequests[e._id] = e.count; });

    return { totalNotes, tags, visibility, editRequests };
  }

  // ============================================
  // ADMIN METHODS
  // ============================================

  /**
   * Admin: Get all notes with filters
   */
  async adminGetNotes(filters = {}) {
    const { tag, bookingId, userId, search, page = 1, limit = 20 } = filters;

    const query = { isDeleted: false };

    if (tag && tag !== 'all') {
      query.$or = [{ tag }, { tags: tag }];
    }
    if (bookingId) {
      query.bookingId = new mongoose.Types.ObjectId(bookingId);
    }
    if (userId) {
      const uid = new mongoose.Types.ObjectId(userId);
      query.$and = query.$and || [];
      query.$and.push({ $or: [{ createdBy: uid }, { sharedWith: uid }] });
    }
    if (search) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { content: { $regex: search, $options: 'i' } },
        ],
      });
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [notes, total] = await Promise.all([
      Note.find(query)
        .populate('createdBy', 'fullName avatar role')
        .populate('sharedWith', 'fullName avatar role')
        .populate('bookingId', 'bookingNumber serviceType status schedule')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Note.countDocuments(query),
    ]);

    return {
      notes,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    };
  }

  /**
   * Admin: Delete any note
   */
  async adminDeleteNote(noteId) {
    const note = await Note.findById(noteId);
    if (!note) {
      throw ApiError.notFound('Note not found');
    }

    note.isDeleted = true;
    await note.save();

    return { message: 'Note deleted by admin' };
  }
}

export default new NoteService();
