import locationService from '../../services/location.service.js';
import { ApiResponse, asyncHandler } from '../../utils/apiResponse.js';

/**
 * Search location suggestions via Nominatim proxy.
 * GET /api/location/search?q=...
 */
export const searchAddress = asyncHandler(async (req, res) => {
  const { q, limit } = req.query;
  const suggestions = await locationService.searchAddress(req.user?._id, q, limit);

  res.status(200).json(
    new ApiResponse(200, { suggestions }, 'Location suggestions fetched successfully')
  );
});

/**
 * Reverse geocode coordinates.
 * GET /api/location/reverse?lat=...&lng=...
 */
export const reverseGeocode = asyncHandler(async (req, res) => {
  const { lat, lng } = req.query;
  const location = await locationService.reverseGeocode(Number(lat), Number(lng));

  res.status(200).json(
    new ApiResponse(200, location, 'Reverse geocoding fetched successfully')
  );
});

/**
 * Save user location and GPS proof.
 * POST /api/location/proof
 */
export const saveLocationProof = asyncHandler(async (req, res) => {
  const data = await locationService.saveLocationProof(req.user._id, req.body);

  res.status(200).json(
    new ApiResponse(200, data, 'Location proof saved successfully')
  );
});

/**
 * Get current user trust score.
 * GET /api/location/trust-score
 */
export const getTrustScore = asyncHandler(async (req, res) => {
  const trust = await locationService.getTrustScore(req.user._id);

  res.status(200).json(
    new ApiResponse(200, { trust }, 'Trust score fetched successfully')
  );
});

/**
 * Get current user location logs.
 * GET /api/location/logs
 */
export const getLocationLogs = asyncHandler(async (req, res) => {
  const { limit } = req.query;
  const logs = await locationService.getLocationLogs(req.user._id, limit);

  res.status(200).json(
    new ApiResponse(200, { logs }, 'Location logs fetched successfully')
  );
});

/**
 * Start service session and first location capture.
 * POST /api/location/service/:bookingId/start
 */
export const startServiceSession = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const data = await locationService.startServiceSession(bookingId, req.user._id, req.body);

  res.status(200).json(
    new ApiResponse(200, data, 'Service session started successfully')
  );
});

/**
 * Track live service location.
 * POST /api/location/service/:bookingId/ping
 */
export const trackServiceLocation = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const data = await locationService.trackServiceLocation(bookingId, req.user._id, req.body);

  // Broadcast real-time location update to booking room (careseeker watching)
  try {
    const io = global.__careconnect_io;
    if (io && req.body.coordinates) {
      io.to(`booking_${bookingId}`).emit('location:update', {
        bookingId,
        caregiverId: req.user._id,
        coordinates: req.body.coordinates,
        timestamp: new Date(),
      });

      io.to(`booking:${bookingId}`).emit('location:update', {
        bookingId,
        caregiverId: req.user._id,
        coordinates: req.body.coordinates,
        timestamp: new Date(),
      });
    }
  } catch { /* non-critical */ }

  res.status(200).json(
    new ApiResponse(200, data, 'Service location recorded')
  );
});

/**
 * End service session and final location capture.
 * POST /api/location/service/:bookingId/end
 */
export const endServiceSession = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const data = await locationService.endServiceSession(bookingId, req.user._id, req.body);

  res.status(200).json(
    new ApiResponse(200, data, 'Service session ended successfully')
  );
});

/**
 * Get service timeline for a booking/session.
 * GET /api/location/service/:bookingId/timeline
 */
export const getServiceTimeline = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const { sessionId } = req.query;
  const data = await locationService.getServiceTimeline(bookingId, req.user._id, sessionId);

  res.status(200).json(
    new ApiResponse(200, data, 'Service timeline fetched successfully')
  );
});
