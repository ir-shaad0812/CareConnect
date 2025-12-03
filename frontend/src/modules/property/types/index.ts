// ============================================
// MAP/LOCATION TYPES
// ============================================

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface LocationSuggestion {
  displayName: string;
  lat: number;
  lng: number;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  placeId: string;
}

export interface ReverseGeocodeResult {
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}

export interface LocationData {
  locationName?: string;
  placeId?: string;
  coordinates: Coordinates;
  selectedCoordinates?: Coordinates;
  gpsCoordinates?: Coordinates;
  distanceKm?: number;
  gpsVerified?: boolean;
  trustScore?: number;
  accuracy: number;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  capturedAt: string;
}

export interface MapViewport {
  center: Coordinates;
  zoom: number;
}

export interface MapBounds {
  northEast: Coordinates;
  southWest: Coordinates;
}

export interface ServiceArea {
  center: Coordinates;
  radius: number; // kilometers
}

export interface CaregiverMapLocation extends Coordinates {
  id: string;
  name: string;
  avatar?: string;
  role: string;
  rating?: number;
  hourlyRate?: number;
  isVerified?: boolean;
}

// Map config constants
export const MAP_CONFIG = {
  DEFAULT_CENTER: { lat: 27.7172, lng: 85.324 }, // Kathmandu
  DEFAULT_ZOOM: 13,
  MIN_ZOOM: 5,
  MAX_ZOOM: 18,
  TILE_URL: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  TILE_ATTRIBUTION: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  VERIFIED_DISTANCE_KM: 3,
} as const;
