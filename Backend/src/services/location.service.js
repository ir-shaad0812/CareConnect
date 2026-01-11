import User from '../models/user.model.js';
import Document from '../models/document.model.js';
import LocationLog from '../models/locationLog.model.js';
import Booking from '../models/booking.model.js';
import nominatimService from './nominatim.service.js';
import { DOCUMENT_STATUS, DOCUMENT_TYPES } from '../constants/index.js';
import { BOOKING_STATUS } from '../constants/booking.constants.js';
import {
  LOCATION_TRUST_LEVELS,
  LOCATION_TRUST_SCORE,
  SERVICE_LOCATION_EVENTS,
} from '../constants/location.constants.js';
import bookingStateTransitionService from './bookingStateTransition.service.js';
import bookingDayService from './bookingDay.service.js';
import slotService from './slot.service.js';
import ledgerService from './ledger.service.js';
import { emitWalletUpdate } from '../config/socket.js';
import { ApiError } from '../utils/apiResponse.js';
import { haversineDistanceKm } from '../utils/haversine.js';

class LocationService {
  normalizeCoordinates(rawCoordinates) {
    const lat = Number(rawCoordinates?.lat);
    const lng = Number(rawCoordinates?.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw ApiError.badRequest('Valid latitude and longitude are required');
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw ApiError.badRequest('Coordinates are out of valid range');
    }

    return {
      lat: Number(lat.toFixed(7)),
      lng: Number(lng.toFixed(7)),
    };
  }

  async getBookingForTracking(bookingId, userId, caregiverOnly = false) {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      throw ApiError.notFound('Booking not found');
    }

    const isCaregiver = booking.caregiverId.toString() === userId.toString();
    const isCareSeeker = booking.careSeekerId.toString() === userId.toString();

    if (!isCaregiver && !isCareSeeker) {
      throw ApiError.forbidden('You are not authorized for this booking');
    }

    if (caregiverOnly && !isCaregiver) {
      throw ApiError.forbidden('Only the assigned caregiver can share service location');
    }

    return { booking, isCaregiver, isCareSeeker };
  }

  async resolveSessionId(bookingId, userId, sessionId) {
    if (sessionId) {
      return sessionId;
    }

    const latestStartLog = await LocationLog.findOne({
      bookingId,
      userId,
      eventType: SERVICE_LOCATION_EVENTS.SERVICE_START,
    })
      .sort({ createdAt: -1 })
      .select('sessionId');

    return latestStartLog?.sessionId || `${bookingId}-${Date.now()}`;
  }

  async searchAddress(userId, query, limit) {
    const suggestions = await nominatimService.searchAddress(query, limit);

    if (userId) {
      await LocationLog.create({
        userId,
        eventType: 'search',
        searchQuery: query,
        provider: 'nominatim',
      });
    }

    return suggestions;
  }

  async reverseGeocode(lat, lng) {
    return nominatimService.reverseGeocode(lat, lng);
  }

  computeTrustScore({ hasLocation, isGpsVerified, hasVerifiedAddressDocument }) {
    let score = 0;

    if (hasLocation) {
      score += LOCATION_TRUST_SCORE.LOCATION_ENTERED;
    }

    if (isGpsVerified) {
      score += LOCATION_TRUST_SCORE.GPS_VERIFIED;
    }

    if (hasVerifiedAddressDocument) {
      score += LOCATION_TRUST_SCORE.ADDRESS_DOC_VERIFIED;
    }

    let level = LOCATION_TRUST_LEVELS.BASIC;
    if (score >= 71) {
      level = LOCATION_TRUST_LEVELS.TRUSTED;
    } else if (score >= 31) {
      level = LOCATION_TRUST_LEVELS.VERIFIED;
    }

    return {
      score,
      level,
      breakdown: {
        hasLocation,
        isGpsVerified,
        hasVerifiedAddressDocument,
      },
    };
  }

  async getTrustScore(userId) {
    const user = await User.findById(userId);

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    return this.getTrustScoreForUser(user);
  }

  async getTrustScoreForUser(user) {
    const hasLocation = Boolean(
      user?.location?.address ||
      user?.location?.coordinates?.coordinates?.length === 2 ||
      user?.locationProof?.address
    );

    const profileLat = user?.location?.coordinates?.coordinates?.[1];
    const profileLng = user?.location?.coordinates?.coordinates?.[0];
    const gpsLat = user?.locationProof?.coordinates?.lat;
    const gpsLng = user?.locationProof?.coordinates?.lng;

    let distanceKm = null;
    let isGpsVerified = false;

    if (
      Number.isFinite(profileLat) &&
      Number.isFinite(profileLng) &&
      Number.isFinite(gpsLat) &&
      Number.isFinite(gpsLng)
    ) {
      distanceKm = haversineDistanceKm(profileLat, profileLng, gpsLat, gpsLng);
      isGpsVerified = distanceKm <= LOCATION_TRUST_SCORE.GPS_VERIFICATION_RADIUS_KM;
    }

    const hasVerifiedAddressDocument = await Document.exists({
      userId: user._id,
      type: DOCUMENT_TYPES.ADDRESS_PROOF,
      status: DOCUMENT_STATUS.VERIFIED,
    });

    const trust = this.computeTrustScore({
      hasLocation,
      isGpsVerified,
      hasVerifiedAddressDocument: Boolean(hasVerifiedAddressDocument),
    });

    return {
      ...trust,
      gpsDistanceKm: distanceKm,
      gpsVerificationRadiusKm: LOCATION_TRUST_SCORE.GPS_VERIFICATION_RADIUS_KM,
    };
  }

  async saveLocationProof(userId, payload) {
    const {
      manualAddress,
      manualCoordinates,
      gpsCoordinates,
      gpsAccuracy,
      capturedAt,
    } = payload;

    if (!manualAddress?.address && !manualCoordinates?.lat) {
      throw ApiError.badRequest('Manual location details are required');
    }

    if (!gpsCoordinates?.lat || !gpsCoordinates?.lng) {
      throw ApiError.badRequest('GPS coordinates are required');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    user.location = {
      ...user.location,
      address: manualAddress?.address || user.location?.address,
      city: manualAddress?.city || user.location?.city,
      state: manualAddress?.state || user.location?.state,
      country: manualAddress?.country || user.location?.country,
      postalCode: manualAddress?.postalCode || user.location?.postalCode,
      zipCode: manualAddress?.zipCode || user.location?.zipCode,
      coordinates: Number.isFinite(manualCoordinates?.lat) && Number.isFinite(manualCoordinates?.lng)
        ? {
          type: 'Point',
          coordinates: [manualCoordinates.lng, manualCoordinates.lat],
        }
        : user.location?.coordinates,
    };

    user.locationProof = {
      ...user.locationProof,
      coordinates: {
        lat: gpsCoordinates.lat,
        lng: gpsCoordinates.lng,
      },
      accuracy: gpsAccuracy,
      address: manualAddress?.address || user.locationProof?.address,
      city: manualAddress?.city || user.locationProof?.city,
      state: manualAddress?.state || user.locationProof?.state,
      country: manualAddress?.country || user.locationProof?.country,
      postalCode: manualAddress?.postalCode || user.locationProof?.postalCode,
      capturedAt: capturedAt ? new Date(capturedAt) : new Date(),
      verificationStatus: 'pending',
      verifiedAt: null,
      verifiedBy: null,
      rejectionReason: null,
    };

    await user.save();

    const trust = await this.getTrustScoreForUser(user);

    await LocationLog.create({
      userId,
      eventType: 'submit',
      manualCoordinates: Number.isFinite(manualCoordinates?.lat) && Number.isFinite(manualCoordinates?.lng)
        ? { lat: manualCoordinates.lat, lng: manualCoordinates.lng }
        : undefined,
      gpsCoordinates: { lat: gpsCoordinates.lat, lng: gpsCoordinates.lng },
      gpsAccuracy,
      distanceKm: trust.gpsDistanceKm,
      withinAllowedRadius: trust.breakdown.isGpsVerified,
      trustScore: trust.score,
    });

    return {
      location: user.location,
      locationProof: user.locationProof,
      trust,
    };
  }

  async getLocationLogs(userId, limit = 20) {
    return LocationLog.find({ userId })
      .sort({ createdAt: -1 })
      .limit(Math.min(Number(limit) || 20, 100));
  }

  async logAdminDecision({ userId, adminId, eventType, notes }) {
    const trust = await this.getTrustScore(userId);

    await LocationLog.create({
      userId,
      performedBy: adminId,
      eventType,
      notes,
      trustScore: trust.score,
    });

    return trust;
  }

  async startServiceSession(bookingId, userId, payload) {
    const { booking } = await this.getBookingForTracking(bookingId, userId, true);

    if (
      ![
        BOOKING_STATUS.CONFIRMED,
        BOOKING_STATUS.ACTIVE,
        BOOKING_STATUS.IN_PROGRESS,
      ].includes(booking.status)
    ) {
      throw ApiError.badRequest('Service can only be started for confirmed or active bookings');
    }

    const coordinates = this.normalizeCoordinates(payload?.coordinates);
    const sessionId = `${bookingId}-${Date.now()}`;
    const startedAt = payload?.capturedAt ? new Date(payload.capturedAt) : new Date();

        if (
          booking.status === BOOKING_STATUS.CONFIRMED &&
          booking.canTransitionTo(BOOKING_STATUS.ACTIVE)
        ) {
          await bookingStateTransitionService.transition(
            booking,
            BOOKING_STATUS.ACTIVE,
            {
              actorId: userId,
              actorRole: 'caregiver',
              source: 'location.startServiceSession',
              reason: 'Service session started',
              transitionedAt: startedAt,
            },
          );
        }

    booking.checkIn = {
      time: startedAt,
      location: {
        type: 'Point',
        coordinates: [coordinates.lng, coordinates.lat],
      },
      notes: payload?.notes,
      verifiedBy: 'gps',
    };

    await booking.save();

    try {
      await bookingDayService.markCheckIn(booking, startedAt, {
        at: startedAt,
        source: payload?.source || 'gps',
        coordinates,
        accuracy: Number(payload?.accuracy) || null,
        sessionId,
        updatedBy: userId,
      });
    } catch (bookingDayError) {
      console.error('[LocationService] Failed to mark BookingDay check-in:', bookingDayError.message);
    }

    try {
      await slotService.markSlotInProgress(booking._id, startedAt);
    } catch (slotError) {
      console.error('[LocationService] Failed to mark slot in progress:', slotError.message);
    }

    await LocationLog.create({
      userId,
      bookingId,
      sessionId,
      eventType: SERVICE_LOCATION_EVENTS.SERVICE_START,
      sessionPhase: 'start',
      bookingStatusSnapshot: booking.status,
      gpsCoordinates: coordinates,
      gpsAccuracy: Number(payload?.accuracy) || null,
      capturedAt: startedAt,
      source: payload?.source || 'gps',
      notes: payload?.notes,
    });

    return {
      bookingId,
      sessionId,
      status: booking.status,
      checkIn: booking.checkIn,
    };
  }

  async trackServiceLocation(bookingId, userId, payload) {
    const { booking } = await this.getBookingForTracking(bookingId, userId, true);

    if (![BOOKING_STATUS.ACTIVE, BOOKING_STATUS.IN_PROGRESS].includes(booking.status)) {
      throw ApiError.badRequest('Live location is only available while service is active');
    }

    const coordinates = this.normalizeCoordinates(payload?.coordinates);
    const sessionId = await this.resolveSessionId(bookingId, userId, payload?.sessionId);
    const capturedAt = payload?.capturedAt ? new Date(payload.capturedAt) : new Date();

    await LocationLog.create({
      userId,
      bookingId,
      sessionId,
      eventType: SERVICE_LOCATION_EVENTS.SERVICE_PING,
      sessionPhase: 'live',
      bookingStatusSnapshot: booking.status,
      gpsCoordinates: coordinates,
      gpsAccuracy: Number(payload?.accuracy) || null,
      capturedAt,
      source: payload?.source || 'gps',
    });

    return {
      bookingId,
      sessionId,
      acceptedAt: capturedAt,
    };
  }

  async endServiceSession(bookingId, userId, payload) {
    const { booking } = await this.getBookingForTracking(bookingId, userId, true);

    if (
      ![
        BOOKING_STATUS.ACTIVE,
        BOOKING_STATUS.IN_PROGRESS,
        BOOKING_STATUS.COMPLETED,
      ].includes(booking.status)
    ) {
      throw ApiError.badRequest('Service can only be ended for active bookings');
    }

    const coordinates = this.normalizeCoordinates(payload?.coordinates);
    const sessionId = await this.resolveSessionId(bookingId, userId, payload?.sessionId);
    const endedAt = payload?.capturedAt ? new Date(payload.capturedAt) : new Date();

    booking.checkOut = {
      time: endedAt,
      location: {
        type: 'Point',
        coordinates: [coordinates.lng, coordinates.lat],
      },
      notes: payload?.notes,
      verifiedBy: 'gps',
    };

        if (
          [BOOKING_STATUS.ACTIVE, BOOKING_STATUS.IN_PROGRESS].includes(booking.status) &&
          booking.canTransitionTo(BOOKING_STATUS.COMPLETED)
        ) {
          await bookingStateTransitionService.transition(
            booking,
            BOOKING_STATUS.COMPLETED,
            {
              actorId: userId,
              actorRole: 'caregiver',
              source: 'location.endServiceSession',
              reason: 'Service session ended',
              transitionedAt: endedAt,
            },
          );
        }

    await booking.save();

    try {
      await bookingDayService.markCheckOut(booking, endedAt, {
        at: endedAt,
        source: payload?.source || 'gps',
        coordinates,
        accuracy: Number(payload?.accuracy) || null,
        sessionId,
        updatedBy: userId,
      });
    } catch (bookingDayError) {
      console.error('[LocationService] Failed to mark BookingDay check-out:', bookingDayError.message);
    }

    try {
      const { release } = await slotService.completeAndReleaseSlotForDate(booking, endedAt);
      if (release?.grossReleased > 0) {
        const io = global.__careconnect_io;
        if (io) {
          const updatedWallet = await ledgerService.getWallet(booking.caregiverId);
          if (updatedWallet) {
            emitWalletUpdate(io, booking.caregiverId, {
              wallet: updatedWallet,
              event: 'slot_released',
              bookingId: booking._id,
              slotId: release.slotId,
              amount: release.grossReleased,
            });
          }
        }
      }
    } catch (slotError) {
      console.error('[LocationService] Failed to complete/release slot:', slotError.message);
    }

    await LocationLog.create({
      userId,
      bookingId,
      sessionId,
      eventType: SERVICE_LOCATION_EVENTS.SERVICE_END,
      sessionPhase: 'end',
      bookingStatusSnapshot: booking.status,
      gpsCoordinates: coordinates,
      gpsAccuracy: Number(payload?.accuracy) || null,
      capturedAt: endedAt,
      source: payload?.source || 'gps',
      notes: payload?.notes,
    });

    return {
      bookingId,
      sessionId,
      status: booking.status,
      checkOut: booking.checkOut,
      completedAt: booking.completedAt,
    };
  }

  async getServiceTimeline(bookingId, userId, sessionId) {
    await this.getBookingForTracking(bookingId, userId, false);

    const query = {
      bookingId,
      eventType: {
        $in: [
          SERVICE_LOCATION_EVENTS.SERVICE_START,
          SERVICE_LOCATION_EVENTS.SERVICE_PING,
          SERVICE_LOCATION_EVENTS.SERVICE_END,
        ],
      },
    };

    if (sessionId) {
      query.sessionId = sessionId;
    }

    const logs = await LocationLog.find(query)
      .sort({ capturedAt: 1, createdAt: 1 })
      .limit(2000)
      .select('eventType gpsCoordinates gpsAccuracy capturedAt sessionId sessionPhase bookingStatusSnapshot source notes userId');

    return {
      bookingId,
      sessionId: sessionId || null,
      points: logs,
    };
  }
}

export default new LocationService();
