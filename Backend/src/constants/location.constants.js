/**
 * Location and trust score constants
 */

export const LOCATION_PROOF_STATUS = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
};

export const LOCATION_TRUST_SCORE = {
  LOCATION_ENTERED: 20,
  GPS_VERIFIED: 40,
  ADDRESS_DOC_VERIFIED: 40,
  MAX_SCORE: 100,
  GPS_VERIFICATION_RADIUS_KM: 3,
};

export const LOCATION_TRUST_LEVELS = {
  BASIC: 'basic',
  VERIFIED: 'verified',
  TRUSTED: 'trusted',
};

export const SERVICE_LOCATION_EVENTS = {
  SERVICE_START: 'service_start',
  SERVICE_PING: 'service_ping',
  SERVICE_END: 'service_end',
};

export const NOMINATIM = {
  BASE_URL: 'https://nominatim.openstreetmap.org',
  DEFAULT_LIMIT: 8,
  USER_AGENT: 'CareConnect/1.0 (Location Search API)',
};
