import mongoose from 'mongoose';

const locationCoordinatesSchema = new mongoose.Schema(
  {
    lat: { type: Number },
    lng: { type: Number },
  },
  { _id: false }
);

const locationLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      enum: ['search', 'submit', 'verify', 'reject', 'service_start', 'service_ping', 'service_end'],
      required: true,
      index: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      index: true,
    },
    sessionId: {
      type: String,
      index: true,
    },
    source: {
      type: String,
      enum: ['gps', 'manual', 'system'],
      default: 'gps',
    },
    sessionPhase: {
      type: String,
      enum: ['start', 'live', 'end'],
    },
    bookingStatusSnapshot: { type: String },
    capturedAt: { type: Date, default: Date.now },
    searchQuery: { type: String },
    provider: { type: String, default: 'nominatim' },
    manualCoordinates: locationCoordinatesSchema,
    gpsCoordinates: locationCoordinatesSchema,
    gpsAccuracy: { type: Number },
    distanceKm: { type: Number },
    withinAllowedRadius: { type: Boolean },
    trustScore: { type: Number },
    notes: { type: String },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

locationLogSchema.index({ userId: 1, createdAt: -1 });
locationLogSchema.index({ bookingId: 1, createdAt: -1 });
locationLogSchema.index({ bookingId: 1, sessionId: 1, createdAt: 1 });

const LocationLog = mongoose.model('LocationLog', locationLogSchema);

export default LocationLog;
