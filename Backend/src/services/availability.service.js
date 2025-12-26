// ============================================
// AVAILABILITY SERVICE
// Core service for caregiver availability management and conflict detection
// ============================================

import mongoose from 'mongoose';
import Booking from '../models/booking.model.js';
import Caregiver from '../models/caregiver.model.js';
import User from '../models/user.model.js';
import { SLOT_BLOCKING_STATUSES } from '../constants/booking.constants.js';

const normalizeDayName = (day) => String(day || '').trim().toLowerCase();
const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const toDateOnly = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

class AvailabilityService {
  _toMinutes(time) {
    if (typeof time !== 'string' || !/^\d{2}:\d{2}$/.test(time)) {
      return null;
    }

    const [hours, minutes] = time.split(':').map(Number);
    if (
      !Number.isInteger(hours) ||
      !Number.isInteger(minutes) ||
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59
    ) {
      return null;
    }

    return hours * 60 + minutes;
  }

  _buildWeeklySchedule(caregiverDoc, userDoc = null) {
    const sourceAvailability = caregiverDoc?.availability || userDoc?.availability || {};

    return {
      days: (sourceAvailability.days || []).map(normalizeDayName),
      hours: {
        start: sourceAvailability.hours?.start || '09:00',
        end: sourceAvailability.hours?.end || '18:00',
      },
    };
  }

  _resolveCalendarOverrides(caregiverDoc, targetDate) {
    if (!caregiverDoc?.calendar?.length) return null;

    const dateKey = toDateOnly(targetDate).toISOString().split('T')[0];
    return caregiverDoc.calendar.find((entry) => {
      const entryKey = toDateOnly(entry.date).toISOString().split('T')[0];
      return entryKey === dateKey;
    });
  }

  _validateWithinAvailabilityWindow(schedule, weeklySchedule, caregiverDoc) {
    const { startDate, endDate, startTime, endTime } = schedule;

    const start = toDateOnly(startDate);
    const end = toDateOnly(endDate || startDate);

    if (end < start) {
      return {
        available: false,
        status: 'CARE_GIVER_UNAVAILABLE',
        reason: 'End date cannot be earlier than start date',
      };
    }

    const requestedStart = this._toMinutes(startTime);
    const requestedEnd = this._toMinutes(endTime);

    if (requestedStart === null || requestedEnd === null || requestedStart >= requestedEnd) {
      return {
        available: false,
        status: 'CARE_GIVER_UNAVAILABLE',
        reason: 'Invalid requested time range',
      };
    }

    const workDays = Array.isArray(weeklySchedule?.days) ? weeklySchedule.days : [];
    if (workDays.length === 0) {
      return {
        available: false,
        status: 'CARE_GIVER_UNAVAILABLE',
        reason: 'Caregiver has not configured working days',
      };
    }

    const workStart = this._toMinutes(weeklySchedule.hours?.start || '09:00');
    const workEnd = this._toMinutes(weeklySchedule.hours?.end || '18:00');
    if (workStart === null || workEnd === null || workStart >= workEnd) {
      return {
        available: false,
        status: 'CARE_GIVER_UNAVAILABLE',
        reason: 'Caregiver availability hours are invalid',
      };
    }

    for (
      let cursor = new Date(start);
      cursor <= end;
      cursor.setDate(cursor.getDate() + 1)
    ) {
      const cursorDay = DAYS[cursor.getDay()];
      const cursorDate = cursor.toISOString().split('T')[0];

      if (!workDays.includes(cursorDay)) {
        return {
          available: false,
          status: 'CARE_GIVER_UNAVAILABLE',
          reason: `Caregiver does not work on ${cursorDay}`,
          unavailableDate: cursorDate,
        };
      }

      if (requestedStart < workStart || requestedEnd > workEnd) {
        return {
          available: false,
          status: 'CARE_GIVER_UNAVAILABLE',
          reason: `Requested time must be within caregiver working hours ${weeklySchedule.hours.start}-${weeklySchedule.hours.end}`,
          unavailableDate: cursorDate,
        };
      }

      const override = this._resolveCalendarOverrides(caregiverDoc, cursor);
      if (override && override.isAvailable === false) {
        return {
          available: false,
          status: 'CARE_GIVER_UNAVAILABLE',
          reason: 'Caregiver marked this date unavailable',
          unavailableDate: cursorDate,
        };
      }
    }

    return { available: true };
  }

  /**
   * Get caregiver's availability for a date range
   * Combines: weekly schedule + calendar overrides + blocked dates + existing bookings
   *
   * @param {string} caregiverId - User ID of the caregiver
   * @param {Date} startDate - Start of date range
   * @param {Date} endDate - End of date range
   * @returns {Object} Combined availability data
   */
  async getCaregiverAvailability(caregiverId, startDate, endDate) {
    // Fetch caregiver profile
    const caregiver = await Caregiver.findOne({ userId: caregiverId });
    if (!caregiver) {
      // Fall back to User model for caregivers without separate profile
      const user = await User.findById(caregiverId);
      if (!user || user.role !== 'caregiver') {
        throw new Error('Caregiver not found');
      }
      return this._buildAvailabilityFromUser(user, startDate, endDate);
    }

    // Get base weekly schedule
    const weeklySchedule = {
      days: (caregiver.availability?.days || []).map(normalizeDayName),
      hours: {
        start: caregiver.availability?.hours?.start || '09:00',
        end: caregiver.availability?.hours?.end || '18:00',
      },
      immediateAvailability: caregiver.availability?.immediateAvailability || false,
      availableFrom: caregiver.availability?.availableFrom,
    };

    // Get blocked dates within range
    const blockedDates = (caregiver.blockedDates || [])
      .filter(date => {
        const d = new Date(date);
        return d >= startDate && d <= endDate;
      })
      .map(d => new Date(d).toISOString().split('T')[0]);

    // Get existing bookings that block slots
    const bookings = await Booking.find({
      caregiverId,
      status: { $in: SLOT_BLOCKING_STATUSES },
      'schedule.startDate': { $lte: endDate },
      'schedule.endDate': { $gte: startDate },
    }).select('bookingNumber schedule status');

    // Generate daily availability map
    const availabilityMap = await this._generateAvailabilityMap(
      caregiverId,
      startDate,
      endDate,
      weeklySchedule,
      blockedDates,
      bookings,
      caregiver.calendar || []
    );

    return {
      caregiverId,
      weeklySchedule,
      blockedDates,
      bookings: bookings.map(b => ({
        bookingNumber: b.bookingNumber,
        startDate: b.schedule.startDate,
        endDate: b.schedule.endDate,
        startTime: b.schedule.startTime,
        endTime: b.schedule.endTime,
        status: b.status,
      })),
      calendar: availabilityMap,
      lastUpdated: new Date(),
    };
  }

  /**
   * Fallback for caregivers without separate Caregiver document
   */
  async _buildAvailabilityFromUser(user, startDate, endDate) {
    const weeklySchedule = {
      days: (user.availability?.days || []).map(normalizeDayName),
      hours: {
        start: user.availability?.hours?.start || '09:00',
        end: user.availability?.hours?.end || '18:00',
      },
      immediateAvailability: false,
      availableFrom: null,
    };

    const bookings = await Booking.find({
      caregiverId: user._id,
      status: { $in: SLOT_BLOCKING_STATUSES },
      'schedule.startDate': { $lte: endDate },
      'schedule.endDate': { $gte: startDate },
    }).select('bookingNumber schedule status');

    const availabilityMap = await this._generateAvailabilityMap(
      user._id,
      startDate,
      endDate,
      weeklySchedule,
      [],
      bookings,
      []
    );

    return {
      caregiverId: user._id,
      weeklySchedule,
      blockedDates: [],
      bookings: bookings.map(b => ({
        bookingNumber: b.bookingNumber,
        startDate: b.schedule.startDate,
        endDate: b.schedule.endDate,
        startTime: b.schedule.startTime,
        endTime: b.schedule.endTime,
        status: b.status,
      })),
      calendar: availabilityMap,
      lastUpdated: new Date(),
    };
  }

  /**
   * Generate daily availability map
   */
  async _generateAvailabilityMap(caregiverId, startDate, endDate, weeklySchedule, blockedDates, bookings, calendarOverrides) {
    const normalizedWorkdays = new Set((weeklySchedule.days || []).map(normalizeDayName));
    const calendar = {};
    const current = new Date(startDate);

    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0];
      const dayOfWeek = DAYS[current.getDay()];

      // Check if day is in weekly schedule
      const isWorkday = normalizedWorkdays.has(dayOfWeek);

      // Check if date is blocked
      const isBlocked = blockedDates.includes(dateStr);

      // Check calendar overrides
      const override = calendarOverrides.find(c => {
        const cDate = new Date(c.date).toISOString().split('T')[0];
        return cDate === dateStr;
      });

      // Find bookings for this day
      const dayBookings = bookings.filter(b => {
        const bookingStart = new Date(b.schedule.startDate).toISOString().split('T')[0];
        const bookingEnd = new Date(b.schedule.endDate).toISOString().split('T')[0];
        return dateStr >= bookingStart && dateStr <= bookingEnd;
      });

      calendar[dateStr] = {
        date: dateStr,
        dayOfWeek,
        isWorkday,
        isBlocked,
        isAvailable: isWorkday && !isBlocked && (override ? override.isAvailable !== false : true),
        workingHours: isWorkday ? weeklySchedule.hours : null,
        bookings: dayBookings.map(b => ({
          bookingNumber: b.bookingNumber,
          startTime: b.schedule.startTime,
          endTime: b.schedule.endTime,
          status: b.status,
        })),
        override: override ? {
          isAvailable: override.isAvailable,
          slots: override.slots,
        } : null,
      };

      current.setDate(current.getDate() + 1);
    }

    return calendar;
  }

  /**
   * Check if a time slot is available (conflict detection)
   * CRITICAL: Uses MongoDB transaction for race condition safety
   *
   * @param {string} caregiverId - User ID of the caregiver
   * @param {Object} schedule - { startDate, endDate, startTime, endTime }
   * @param {string} excludeBookingId - Optional booking ID to exclude (for modifications)
   * @param {mongoose.ClientSession} session - Optional transaction session
   * @returns {Object} { available: boolean, conflicts: [], blockedDate: boolean }
   */
  async checkSlotAvailability(caregiverId, schedule, excludeBookingId = null, session = null) {
    const { startDate, endDate, startTime, endTime } = schedule;
    const normalizedEndDate = endDate || startDate;

    // Build caregiver availability profile (caregiver collection preferred)
    const caregiver = await Caregiver.findOne({ userId: caregiverId }).session(session);
    let caregiverUser = null;
    if (!caregiver) {
      caregiverUser = await User.findById(caregiverId).session(session);
      if (!caregiverUser || caregiverUser.role !== 'caregiver') {
        return {
          available: false,
          status: 'CARE_GIVER_UNAVAILABLE',
          conflicts: [],
          blockedDate: false,
          reason: 'Caregiver is not available for booking',
        };
      }
    }

    const weeklySchedule = this._buildWeeklySchedule(caregiver, caregiverUser);
    const availabilityWindowCheck = this._validateWithinAvailabilityWindow(
      { startDate, endDate: normalizedEndDate, startTime, endTime },
      weeklySchedule,
      caregiver,
    );

    if (!availabilityWindowCheck.available) {
      return {
        available: false,
        status: 'CARE_GIVER_UNAVAILABLE',
        conflicts: [],
        blockedDate: false,
        reason: availabilityWindowCheck.reason,
        unavailableDate: availabilityWindowCheck.unavailableDate || null,
      };
    }

    // First check if caregiver has blocked the date
    if (caregiver?.blockedDates?.length > 0) {
      const start = new Date(startDate);
      const end = new Date(normalizedEndDate);

      for (const blockedDate of caregiver.blockedDates) {
        const blocked = new Date(blockedDate);
        if (blocked >= start && blocked <= end) {
          return {
            available: false,
            status: 'CARE_GIVER_UNAVAILABLE',
            conflicts: [],
            blockedDate: true,
            blockedDates: [blocked.toISOString().split('T')[0]],
            reason: 'Caregiver has blocked this date',
          };
        }
      }
    }

    // Check for overlapping bookings
    const conflictQuery = {
      caregiverId: new mongoose.Types.ObjectId(caregiverId),
      status: { $in: SLOT_BLOCKING_STATUSES },
      $or: [
        // Booking starts within the requested period
        {
          'schedule.startDate': { $lte: new Date(normalizedEndDate) },
          'schedule.endDate': { $gte: new Date(startDate) },
        },
      ],
    };

    // Exclude specific booking (for modifications)
    if (excludeBookingId) {
      conflictQuery._id = { $ne: new mongoose.Types.ObjectId(excludeBookingId) };
    }

    const conflictingBookings = await Booking.find(conflictQuery)
      .select('bookingNumber schedule status careSeekerId')
      .session(session);

    // Filter by time overlap (since dates overlap isn't enough)
    const actualConflicts = conflictingBookings.filter(booking => {
      return this._timeSlotsOverlap(
        startTime, endTime,
        booking.schedule.startTime, booking.schedule.endTime
      );
    });

    if (actualConflicts.length > 0) {
      return {
        available: false,
        status: 'CARE_GIVER_UNAVAILABLE',
        conflicts: actualConflicts.map(b => ({
          bookingNumber: b.bookingNumber,
          status: b.status,
          startDate: b.schedule.startDate,
          endDate: b.schedule.endDate,
          startTime: b.schedule.startTime,
          endTime: b.schedule.endTime,
        })),
        blockedDate: false,
        reason: `Time slot conflicts with ${actualConflicts.length} existing booking(s)`,
      };
    }

    return {
      available: true,
      status: 'AVAILABLE',
      conflicts: [],
      blockedDate: false,
    };
  }

  /**
   * Check if two time slots overlap
   */
  _timeSlotsOverlap(start1, end1, start2, end2) {
    // Convert HH:MM to minutes since midnight
    const toMinutes = (time) => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const s1 = toMinutes(start1);
    const e1 = toMinutes(end1);
    const s2 = toMinutes(start2);
    const e2 = toMinutes(end2);

    // Slots overlap if one starts before the other ends
    return s1 < e2 && s2 < e1;
  }

  /**
   * Check availability with MongoDB transaction for race conditions
   * Use this for booking creation to ensure atomicity
   */
  async checkSlotAvailabilityWithTransaction(caregiverId, schedule, excludeBookingId = null) {
    const session = await mongoose.startSession();

    try {
      session.startTransaction({
        readConcern: { level: 'snapshot' },
        writeConcern: { w: 'majority' },
      });

      const result = await this.checkSlotAvailability(caregiverId, schedule, excludeBookingId, session);

      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Update caregiver's weekly schedule
   */
  async updateWeeklySchedule(caregiverId, days, hours) {
    // Find or create caregiver profile
    let caregiver = await Caregiver.findOne({ userId: caregiverId });

    if (!caregiver) {
      // Also update User model for backward compatibility
      const user = await User.findById(caregiverId);
      if (!user || user.role !== 'caregiver') {
        throw new Error('Caregiver not found');
      }

      user.availability = { days, hours };
      await user.save();

      return { days, hours };
    }

    caregiver.availability = {
      ...caregiver.availability,
      days,
      hours,
    };

    await caregiver.save();

    // Also update User model for backward compatibility
    await User.findByIdAndUpdate(caregiverId, {
      'availability.days': days,
      'availability.hours': hours,
    });

    return caregiver.availability;
  }

  /**
   * Update blocked dates
   */
  async updateBlockedDates(caregiverId, blockedDates, operation = 'set') {
    // Validate no conflicts with existing confirmed bookings
    if (blockedDates.length > 0) {
      const conflicts = await Booking.find({
        caregiverId,
        status: { $in: ['confirmed', 'active', 'in_progress'] },
        'schedule.startDate': { $in: blockedDates.map(d => new Date(d)) },
      }).select('bookingNumber schedule.startDate');

      if (conflicts.length > 0) {
        throw new Error(
          `Cannot block dates with existing bookings: ${conflicts.map(c => c.bookingNumber).join(', ')}`
        );
      }
    }

    let caregiver = await Caregiver.findOne({ userId: caregiverId });

    if (!caregiver) {
      throw new Error('Caregiver profile not found');
    }

    const dateObjs = blockedDates.map(d => new Date(d));

    if (operation === 'set') {
      caregiver.blockedDates = dateObjs;
    } else if (operation === 'add') {
      const existing = caregiver.blockedDates.map(d => d.toISOString().split('T')[0]);
      const toAdd = dateObjs.filter(d => !existing.includes(d.toISOString().split('T')[0]));
      caregiver.blockedDates = [...caregiver.blockedDates, ...toAdd];
    } else if (operation === 'remove') {
      const toRemove = blockedDates.map(d => new Date(d).toISOString().split('T')[0]);
      caregiver.blockedDates = caregiver.blockedDates.filter(
        d => !toRemove.includes(d.toISOString().split('T')[0])
      );
    }

    await caregiver.save();
    return caregiver.blockedDates;
  }

  /**
   * Add a single blocked date
   */
  async addBlockedDate(caregiverId, date) {
    return this.updateBlockedDates(caregiverId, [date], 'add');
  }

  /**
   * Remove a single blocked date
   */
  async removeBlockedDate(caregiverId, date) {
    return this.updateBlockedDates(caregiverId, [date], 'remove');
  }

  /**
   * Mark slots as booked when booking is confirmed
   * Updates caregiver calendar with booking reference
   */
  async markSlotsAsBooked(caregiverId, bookingId, schedule) {
    const caregiver = await Caregiver.findOne({ userId: caregiverId });
    if (!caregiver) return;

    const { startDate, endDate, startTime, endTime } = schedule;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const current = new Date(start);

    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];

      // Find or create calendar entry for this date
      let calendarEntry = caregiver.calendar.find(c => {
        return new Date(c.date).toISOString().split('T')[0] === dateStr;
      });

      if (!calendarEntry) {
        calendarEntry = {
          date: new Date(dateStr),
          isAvailable: true,
          slots: [],
        };
        caregiver.calendar.push(calendarEntry);
      }

      // Add booked slot
      calendarEntry.slots.push({
        start: startTime,
        end: endTime,
        booked: true,
        bookingId,
      });

      current.setDate(current.getDate() + 1);
    }

    await caregiver.save();
  }

  /**
   * Release slots when booking is cancelled/expired
   */
  async releaseSlotsForBooking(caregiverId, bookingId) {
    const caregiver = await Caregiver.findOne({ userId: caregiverId });
    if (!caregiver) return;

    // Remove booking reference from all calendar slots
    for (const calendarEntry of caregiver.calendar) {
      calendarEntry.slots = calendarEntry.slots.filter(
        slot => !slot.bookingId || slot.bookingId.toString() !== bookingId.toString()
      );
    }

    // Clean up empty calendar entries
    caregiver.calendar = caregiver.calendar.filter(c => c.slots.length > 0);

    await caregiver.save();
  }

  /**
   * Generate available time slots for a specific date
   * @param {string} caregiverId - Caregiver's user ID
   * @param {Date} date - Date to generate slots for
   * @param {number} slotDurationMinutes - Duration of each slot (default 60)
   * @returns {Array} Available time slots
   */
  async generateTimeSlots(caregiverId, date, slotDurationMinutes = 60) {
    const dateObj = new Date(date);
    const dateStr = dateObj.toISOString().split('T')[0];
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayOfWeek = days[dateObj.getDay()];

    // Get caregiver availability
    const caregiver = await Caregiver.findOne({ userId: caregiverId });
    let workingHours = { start: '09:00', end: '18:00' };
    let availableDays = [];

    if (caregiver) {
      availableDays = (caregiver.availability?.days || []).map(normalizeDayName);
      workingHours = caregiver.availability?.hours || workingHours;

      // Check if date is blocked
      const isBlocked = caregiver.blockedDates?.some(
        d => new Date(d).toISOString().split('T')[0] === dateStr
      );
      if (isBlocked) {
        return [];
      }
    } else {
      const user = await User.findById(caregiverId);
      if (user?.availability) {
        availableDays = (user.availability.days || []).map(normalizeDayName);
        workingHours = user.availability.hours || workingHours;
      }
    }

    // Check if it's a working day
    if (!availableDays.includes(dayOfWeek)) {
      return [];
    }

    // Get existing bookings for this date
    const existingBookings = await Booking.find({
      caregiverId,
      status: { $in: SLOT_BLOCKING_STATUSES },
      'schedule.startDate': { $lte: dateObj },
      'schedule.endDate': { $gte: dateObj },
    }).select('schedule.startTime schedule.endTime schedule.startDate schedule.endDate status');

    // Generate time slots
    const slots = [];
    const [startHour, startMin] = workingHours.start.split(':').map(Number);
    const [endHour, endMin] = workingHours.end.split(':').map(Number);

    let currentMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    while (currentMinutes + slotDurationMinutes <= endMinutes) {
      const slotStart = `${String(Math.floor(currentMinutes / 60)).padStart(2, '0')}:${String(currentMinutes % 60).padStart(2, '0')}`;
      const slotEnd = `${String(Math.floor((currentMinutes + slotDurationMinutes) / 60)).padStart(2, '0')}:${String((currentMinutes + slotDurationMinutes) % 60).padStart(2, '0')}`;

      // Check if slot conflicts with any existing booking
      const conflict = existingBookings.find(b => {
        // Check if booking covers this date
        const bookingStartDate = new Date(b.schedule.startDate).toISOString().split('T')[0];
        const bookingEndDate = new Date(b.schedule.endDate).toISOString().split('T')[0];
        if (dateStr < bookingStartDate || dateStr > bookingEndDate) return false;

        // Check time overlap
        return this._timeSlotsOverlap(slotStart, slotEnd, b.schedule.startTime, b.schedule.endTime);
      });

      slots.push({
        start: slotStart,
        end: slotEnd,
        available: !conflict,
        status: conflict ? (conflict.status === 'reserved' ? 'reserved' : 'booked') : 'available',
        bookingNumber: conflict?.bookingNumber || null,
      });

      currentMinutes += slotDurationMinutes;
    }

    return slots;
  }

  /**
   * Get caregiver's calendar for a month (for dashboard view)
   */
  async getMonthCalendar(caregiverId, year, month) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    return this.getCaregiverAvailability(caregiverId, startDate, endDate);
  }
}

// Export singleton instance
const availabilityService = new AvailabilityService();
export default availabilityService;
