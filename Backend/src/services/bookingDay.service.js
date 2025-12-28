// ============================================
// BOOKING DAY SERVICE
// BookingDay is the execution truth layer.
// ============================================

import Booking from '../models/booking.model.js';
import BookingDay, { BOOKING_DAY_STATUS } from '../models/bookingDay.model.js';

const DAY_TRANSITIONS = Object.freeze({
  [BOOKING_DAY_STATUS.UPCOMING]: [
    BOOKING_DAY_STATUS.IN_PROGRESS,
    BOOKING_DAY_STATUS.MISSED,
  ],
  [BOOKING_DAY_STATUS.IN_PROGRESS]: [
    BOOKING_DAY_STATUS.COMPLETED,
    BOOKING_DAY_STATUS.MISSED,
  ],
  [BOOKING_DAY_STATUS.COMPLETED]: [],
  [BOOKING_DAY_STATUS.MISSED]: [],
});

const parseClock = (clock) => {
  if (!clock || typeof clock !== 'string') {
    return { hour: 0, minute: 0 };
  }

  const [h, m] = clock.split(':').map((value) => Number(value));

  return {
    hour: Number.isInteger(h) && h >= 0 && h <= 23 ? h : 0,
    minute: Number.isInteger(m) && m >= 0 && m <= 59 ? m : 0,
  };
};

const toUtcDateOnly = (value) => {
  const date = new Date(value);
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

const toTimeZoneDateKey = (value, timezone) => {
  const date = new Date(value);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone || 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return formatter.format(date);
};

class BookingDayService {
  getDayStatusTransitions(currentStatus) {
    return DAY_TRANSITIONS[currentStatus] || [];
  }

  assertDayTransition(currentStatus, nextStatus) {
    const allowed = this.getDayStatusTransitions(currentStatus);
    if (!allowed.includes(nextStatus)) {
      throw new Error(
        `Invalid BookingDay transition ${currentStatus} -> ${nextStatus}. Allowed: [${allowed.join(', ')}]`,
      );
    }
  }

  applyClockToUtcDate(dateValue, clock) {
    const base = toUtcDateOnly(dateValue);
    const { hour, minute } = parseClock(clock);
    base.setUTCHours(hour, minute, 0, 0);
    return base;
  }

  buildBookingDaysFromBooking(booking) {
    if (!booking?.schedule?.startDate) {
      throw new Error('Booking schedule is required to generate BookingDays');
    }

    const timezone = booking.schedule.timezone || 'UTC';
    const start = toUtcDateOnly(booking.schedule.startDate);
    const end = toUtcDateOnly(booking.schedule.endDate || booking.schedule.startDate);

    const days = [];
    const cursor = new Date(start);
    let dayNumber = 1;

    while (cursor.getTime() <= end.getTime()) {
      const serviceDateUtc = new Date(cursor);
      const scheduledStartUtc = this.applyClockToUtcDate(cursor, booking.schedule.startTime);
      const scheduledEndUtc = this.applyClockToUtcDate(cursor, booking.schedule.endTime);

      if (scheduledEndUtc.getTime() <= scheduledStartUtc.getTime()) {
        scheduledEndUtc.setUTCHours(23, 59, 59, 999);
      }

      days.push({
        bookingId: booking._id,
        bookingNumber: booking.bookingNumber,
        careSeekerId: booking.careSeekerId,
        caregiverId: booking.caregiverId,
        dayNumber,
        timezone,
        serviceDateUtc,
        serviceDateLocal: toTimeZoneDateKey(serviceDateUtc, timezone),
        scheduledStartUtc,
        scheduledEndUtc,
        status: BOOKING_DAY_STATUS.UPCOMING,
        source: 'booking_workflow',
      });

      cursor.setUTCDate(cursor.getUTCDate() + 1);
      dayNumber += 1;
    }

    return days;
  }

  async ensureBookingDaysForBooking(bookingOrId) {
    const booking = typeof bookingOrId === 'string' || bookingOrId?._id == null
      ? await Booking.findById(bookingOrId)
      : bookingOrId;

    if (!booking) {
      throw new Error('Booking not found while generating BookingDays');
    }

    const payloads = this.buildBookingDaysFromBooking(booking);
    if (payloads.length === 0) {
      return [];
    }

    const operations = payloads.map((payload) => ({
      updateOne: {
        filter: {
          bookingId: payload.bookingId,
          serviceDateLocal: payload.serviceDateLocal,
        },
        update: {
          $setOnInsert: payload,
        },
        upsert: true,
      },
    }));

    await BookingDay.bulkWrite(operations, { ordered: false });

    return BookingDay.find({ bookingId: booking._id }).sort({ dayNumber: 1 });
  }

  async getBookingDays(bookingId) {
    return BookingDay.find({ bookingId }).sort({ dayNumber: 1 });
  }

  async getBookingDayForDate(bookingOrId, dateValue) {
    const booking = typeof bookingOrId === 'string' || bookingOrId?._id == null
      ? await Booking.findById(bookingOrId)
      : bookingOrId;

    if (!booking) {
      throw new Error('Booking not found while resolving BookingDay');
    }

    const timezone = booking.schedule?.timezone || 'UTC';
    const localDateKey = toTimeZoneDateKey(dateValue, timezone);

    let day = await BookingDay.findOne({
      bookingId: booking._id,
      serviceDateLocal: localDateKey,
    });

    if (!day) {
      const utcDay = toUtcDateOnly(dateValue);
      day = await BookingDay.findOne({
        bookingId: booking._id,
        serviceDateUtc: utcDay,
      });
    }

    return day;
  }

  async transitionStatus(bookingDay, nextStatus, options = {}) {
    if (!bookingDay) {
      throw new Error('BookingDay is required for transition');
    }

    if (bookingDay.status === nextStatus) {
      return bookingDay;
    }

    this.assertDayTransition(bookingDay.status, nextStatus);

    bookingDay.status = nextStatus;

    const now = options.at || new Date();

    if (nextStatus === BOOKING_DAY_STATUS.MISSED) {
      bookingDay.missedAt = bookingDay.missedAt || now;
    }

    if (nextStatus === BOOKING_DAY_STATUS.COMPLETED) {
      bookingDay.completedAt = bookingDay.completedAt || now;
      bookingDay.missedAt = null;
    }

    if (options.updatedBy) {
      bookingDay.updatedBy = options.updatedBy;
    }

    await bookingDay.save();

    return bookingDay;
  }

  async markCheckIn(bookingOrId, dateValue, payload = {}) {
    const booking = typeof bookingOrId === 'string' || bookingOrId?._id == null
      ? await Booking.findById(bookingOrId)
      : bookingOrId;

    if (!booking) {
      throw new Error('Booking not found while marking BookingDay check-in');
    }

    await this.ensureBookingDaysForBooking(booking);

    const day = await this.getBookingDayForDate(booking, dateValue || new Date());
    if (!day) {
      throw new Error('BookingDay not found for check-in date');
    }

    if (day.checkInAt) {
      throw new Error('Double check-in is not allowed for this booking day');
    }

    if (day.status === BOOKING_DAY_STATUS.UPCOMING) {
      this.assertDayTransition(day.status, BOOKING_DAY_STATUS.IN_PROGRESS);
      day.status = BOOKING_DAY_STATUS.IN_PROGRESS;
    }

    const now = payload.at || new Date();
    day.checkInAt = now;
    day.checkInMeta = {
      source: payload.source || 'gps',
      coordinates: payload.coordinates || null,
      accuracy: payload.accuracy || null,
      sessionId: payload.sessionId || null,
    };
    day.updatedBy = payload.updatedBy || null;

    await day.save();
    return day;
  }

  async markCheckOut(bookingOrId, dateValue, payload = {}) {
    const booking = typeof bookingOrId === 'string' || bookingOrId?._id == null
      ? await Booking.findById(bookingOrId)
      : bookingOrId;

    if (!booking) {
      throw new Error('Booking not found while marking BookingDay check-out');
    }

    await this.ensureBookingDaysForBooking(booking);

    const day = await this.getBookingDayForDate(booking, dateValue || new Date());
    if (!day) {
      throw new Error('BookingDay not found for check-out date');
    }

    if (!day.checkInAt) {
      throw new Error('Cannot check out without check-in for this booking day');
    }

    if (day.checkOutAt) {
      throw new Error('Double check-out is not allowed for this booking day');
    }

    if (day.status !== BOOKING_DAY_STATUS.IN_PROGRESS) {
      this.assertDayTransition(day.status, BOOKING_DAY_STATUS.COMPLETED);
      day.status = BOOKING_DAY_STATUS.COMPLETED;
    } else {
      day.status = BOOKING_DAY_STATUS.COMPLETED;
    }

    const now = payload.at || new Date();
    day.checkOutAt = now;
    day.completedAt = now;
    day.checkOutMeta = {
      source: payload.source || 'gps',
      coordinates: payload.coordinates || null,
      accuracy: payload.accuracy || null,
      sessionId: payload.sessionId || null,
    };
    day.updatedBy = payload.updatedBy || null;

    await day.save();
    return day;
  }

  async markMissedDaysForBooking(bookingOrId, referenceDate = new Date()) {
    const booking = typeof bookingOrId === 'string' || bookingOrId?._id == null
      ? await Booking.findById(bookingOrId)
      : bookingOrId;

    if (!booking) {
      return { modifiedCount: 0 };
    }

    await this.ensureBookingDaysForBooking(booking);

    const timezone = booking.schedule?.timezone || 'UTC';
    const todayLocalKey = toTimeZoneDateKey(referenceDate, timezone);

    const updateResult = await BookingDay.updateMany(
      {
        bookingId: booking._id,
        serviceDateLocal: { $lt: todayLocalKey },
        status: {
          $in: [BOOKING_DAY_STATUS.UPCOMING, BOOKING_DAY_STATUS.IN_PROGRESS],
        },
      },
      {
        $set: {
          status: BOOKING_DAY_STATUS.MISSED,
          missedAt: new Date(),
        },
      },
    );

    return {
      modifiedCount: updateResult.modifiedCount || 0,
    };
  }

  async areAllDaysCompleted(bookingId) {
    const total = await BookingDay.countDocuments({ bookingId });
    if (total === 0) {
      return true;
    }

    const nonCompleted = await BookingDay.countDocuments({
      bookingId,
      status: { $ne: BOOKING_DAY_STATUS.COMPLETED },
    });

    return nonCompleted === 0;
  }

  async getSummary(bookingId) {
    const grouped = await BookingDay.aggregate([
      { $match: { bookingId: BookingDay.db.base.Types.ObjectId.createFromHexString(String(bookingId)) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const summary = {
      [BOOKING_DAY_STATUS.UPCOMING]: 0,
      [BOOKING_DAY_STATUS.IN_PROGRESS]: 0,
      [BOOKING_DAY_STATUS.COMPLETED]: 0,
      [BOOKING_DAY_STATUS.MISSED]: 0,
    };

    grouped.forEach((row) => {
      summary[row._id] = row.count;
    });

    return summary;
  }
}

export default new BookingDayService();
