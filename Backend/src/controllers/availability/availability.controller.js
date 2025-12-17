// ============================================
// AVAILABILITY CONTROLLER
// API handlers for caregiver availability management
// ============================================

import availabilityService from '../../services/availability.service.js';
import User from '../../models/user.model.js';
import Caregiver from '../../models/caregiver.model.js';
import { USER_ROLES } from '../../constants/index.js';

/**
 * Wrapper for async route handlers
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Get caregiver's availability for a date range (Public)
 * GET /api/availability/caregivers/:caregiverId
 */
export const getCaregiverAvailability = asyncHandler(async (req, res) => {
  const { caregiverId } = req.params;
  const { startDate, endDate } = req.query;

  // Resolve caregiver user ID if a Caregiver document ID is provided
  let caregiverUserId = caregiverId;
  const caregiver = await Caregiver.findById(caregiverId);
  if (caregiver) {
    caregiverUserId = caregiver.userId;
  }

  const start = startDate ? new Date(startDate) : new Date();
  const end = endDate ? new Date(endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const availability = await availabilityService.getCaregiverAvailability(
    caregiverUserId,
    start,
    end
  );

  res.json({
    success: true,
    data: { availability },
  });
});

/**
 * Get available time slots for a specific date (Public)
 * GET /api/availability/caregivers/:caregiverId/slots
 */
export const getAvailableSlots = asyncHandler(async (req, res) => {
  const { caregiverId } = req.params;
  const { date, duration } = req.query;

  if (!date) {
    return res.status(400).json({
      success: false,
      message: 'Date is required',
    });
  }

  // Resolve caregiver user ID
  let caregiverUserId = caregiverId;
  const caregiver = await Caregiver.findById(caregiverId);
  if (caregiver) {
    caregiverUserId = caregiver.userId;
  }

  const slots = await availabilityService.generateTimeSlots(
    caregiverUserId,
    new Date(date),
    parseInt(duration) || 60
  );

  res.json({
    success: true,
    data: { slots, date },
  });
});

/**
 * Get own availability (Caregiver)
 * GET /api/availability/me
 */
export const getMyAvailability = asyncHandler(async (req, res) => {
  if (req.user.role !== USER_ROLES.CAREGIVER) {
    return res.status(403).json({
      success: false,
      message: 'Only caregivers can access their availability',
    });
  }

  const startDate = new Date();
  const endDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 days

  const availability = await availabilityService.getCaregiverAvailability(
    req.user._id,
    startDate,
    endDate
  );

  res.json({
    success: true,
    data: { availability },
  });
});

/**
 * Get own calendar view (Caregiver)
 * GET /api/availability/me/calendar
 */
export const getMyCalendar = asyncHandler(async (req, res) => {
  if (req.user.role !== USER_ROLES.CAREGIVER) {
    return res.status(403).json({
      success: false,
      message: 'Only caregivers can access their calendar',
    });
  }

  const { year, month } = req.query;
  const y = parseInt(year) || new Date().getFullYear();
  const m = parseInt(month) || new Date().getMonth() + 1;

  const calendar = await availabilityService.getMonthCalendar(req.user._id, y, m);

  res.json({
    success: true,
    data: { calendar },
  });
});

/**
 * Update weekly schedule (Caregiver)
 * PUT /api/availability/me/weekly-schedule
 */
export const updateWeeklySchedule = asyncHandler(async (req, res) => {
  if (req.user.role !== USER_ROLES.CAREGIVER) {
    return res.status(403).json({
      success: false,
      message: 'Only caregivers can update their availability',
    });
  }

  const { days, hours } = req.body;

  // Validate days
  const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  if (days && !days.every(d => validDays.includes(d))) {
    return res.status(400).json({
      success: false,
      message: 'Invalid day(s) provided',
    });
  }

  // Validate hours format
  if (hours) {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (hours.start && !timeRegex.test(hours.start)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid start time format. Use HH:MM (e.g., 09:00)',
      });
    }
    if (hours.end && !timeRegex.test(hours.end)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid end time format. Use HH:MM (e.g., 18:00)',
      });
    }
  }

  const updatedSchedule = await availabilityService.updateWeeklySchedule(
    req.user._id,
    days,
    hours
  );

  // Emit socket event if io is available
  const io = req.app.get('io');
  if (io) {
    io.to(`caregiver_availability_${req.user._id}`).emit('availability_updated', {
      caregiverId: req.user._id,
      changes: { type: 'weekly_schedule_updated', days, hours },
      timestamp: new Date(),
    });
  }

  res.json({
    success: true,
    message: 'Weekly schedule updated successfully',
    data: { availability: updatedSchedule },
  });
});

/**
 * Update blocked dates (Caregiver)
 * PUT /api/availability/me/blocked-dates
 */
export const updateBlockedDates = asyncHandler(async (req, res) => {
  if (req.user.role !== USER_ROLES.CAREGIVER) {
    return res.status(403).json({
      success: false,
      message: 'Only caregivers can update their blocked dates',
    });
  }

  const { blockedDates } = req.body;

  if (!Array.isArray(blockedDates)) {
    return res.status(400).json({
      success: false,
      message: 'blockedDates must be an array',
    });
  }

  const updatedDates = await availabilityService.updateBlockedDates(
    req.user._id,
    blockedDates,
    'set'
  );

  // Emit socket event
  const io = req.app.get('io');
  if (io) {
    io.to(`caregiver_availability_${req.user._id}`).emit('availability_updated', {
      caregiverId: req.user._id,
      changes: { type: 'blocked_dates_updated', blockedDates: updatedDates },
      timestamp: new Date(),
    });
  }

  res.json({
    success: true,
    message: 'Blocked dates updated successfully',
    data: { blockedDates: updatedDates },
  });
});

/**
 * Add a single blocked date (Caregiver)
 * POST /api/availability/me/blocked-dates
 */
export const addBlockedDate = asyncHandler(async (req, res) => {
  if (req.user.role !== USER_ROLES.CAREGIVER) {
    return res.status(403).json({
      success: false,
      message: 'Only caregivers can update their blocked dates',
    });
  }

  const { date } = req.body;

  if (!date) {
    return res.status(400).json({
      success: false,
      message: 'Date is required',
    });
  }

  const updatedDates = await availabilityService.addBlockedDate(req.user._id, date);

  // Emit socket event
  const io = req.app.get('io');
  if (io) {
    io.to(`caregiver_availability_${req.user._id}`).emit('availability_updated', {
      caregiverId: req.user._id,
      changes: { type: 'date_blocked', date },
      timestamp: new Date(),
    });
  }

  res.json({
    success: true,
    message: 'Date blocked successfully',
    data: { blockedDates: updatedDates },
  });
});

/**
 * Remove a single blocked date (Caregiver)
 * DELETE /api/availability/me/blocked-dates/:date
 */
export const removeBlockedDate = asyncHandler(async (req, res) => {
  if (req.user.role !== USER_ROLES.CAREGIVER) {
    return res.status(403).json({
      success: false,
      message: 'Only caregivers can update their blocked dates',
    });
  }

  const { date } = req.params;

  const updatedDates = await availabilityService.removeBlockedDate(req.user._id, date);

  // Emit socket event
  const io = req.app.get('io');
  if (io) {
    io.to(`caregiver_availability_${req.user._id}`).emit('availability_updated', {
      caregiverId: req.user._id,
      changes: { type: 'date_unblocked', date },
      timestamp: new Date(),
    });
  }

  res.json({
    success: true,
    message: 'Date unblocked successfully',
    data: { blockedDates: updatedDates },
  });
});

export default {
  getCaregiverAvailability,
  getAvailableSlots,
  getMyAvailability,
  getMyCalendar,
  updateWeeklySchedule,
  updateBlockedDates,
  addBlockedDate,
  removeBlockedDate,
};
