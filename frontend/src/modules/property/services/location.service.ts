// ============================================
// LOCATION SERVICE
// Static location search and reverse geocoding for Nepal
// ============================================

import locationsData from '@/data/locations.nepal.json';
import type { LocationSuggestion, ReverseGeocodeResult } from '../types';

interface NepalLocation {
  city: string;
  district: string;
  province: string;
  country: string;
  latitude: number;
  longitude: number;
  postalCode?: string;
}

const NEPAL_LOCATIONS = locationsData.locations as NepalLocation[];

const toRadians = (value: number): number => (value * Math.PI) / 180;

const haversineDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number => {
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
};

const asSuggestion = (location: NepalLocation): LocationSuggestion => {
  const placeId = `${location.city.toLowerCase().replace(/\s+/g, '-')}-${location.district
    .toLowerCase()
    .replace(/\s+/g, '-')}`;

  return {
    displayName: `${location.city}, ${location.district}, ${location.province}, ${location.country}`,
    lat: location.latitude,
    lng: location.longitude,
    city: location.city,
    state: location.province,
    country: location.country,
    postalCode: location.postalCode || null,
    placeId,
  };
}

class LocationService {
  async searchAddress(query: string, limit = 8): Promise<LocationSuggestion[]> {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return [];

    const matches = NEPAL_LOCATIONS.filter((location) => {
      const haystack = [location.city, location.district, location.province, location.country]
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    })
      .slice(0, limit)
      .map(asSuggestion);

    return matches;
  }

  async reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult> {
    if (NEPAL_LOCATIONS.length === 0) {
      return {
        address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        city: '',
        state: '',
        country: 'Nepal',
        postalCode: '',
      };
    }

    const nearest = NEPAL_LOCATIONS.reduce((closest, current) => {
      const currentDistance = haversineDistance(lat, lng, current.latitude, current.longitude);
      if (!closest) {
        return { location: current, distance: currentDistance };
      }

      return currentDistance < closest.distance
        ? { location: current, distance: currentDistance }
        : closest;
    }, null as { location: NepalLocation; distance: number } | null);

    if (!nearest) {
      return {
        address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        city: '',
        state: '',
        country: 'Nepal',
        postalCode: '',
      };
    }

    return {
      address: `${nearest.location.city}, ${nearest.location.district}, ${nearest.location.province}`,
      city: nearest.location.city,
      state: nearest.location.province,
      country: nearest.location.country,
      postalCode: nearest.location.postalCode || '',
    };
  }
}

export const locationService = new LocationService();
