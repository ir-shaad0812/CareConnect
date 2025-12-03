// ============================================
// MAP UTILITY FUNCTIONS
// ============================================

import type { Coordinates } from '../types';

/**
 * Calculate distance between two points using Haversine formula
 * @returns Distance in kilometers
 */
export function calculateDistance(
  point1: Coordinates,
  point2: Coordinates
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadiusKm = 6371;

  const dLat = toRad(point2.lat - point1.lat);
  const dLng = toRad(point2.lng - point1.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(point1.lat)) *
      Math.cos(toRad(point2.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

/**
 * Format distance for display
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

/**
 * Check if a point is within a radius from center
 */
export function isWithinRadius(
  point: Coordinates,
  center: Coordinates,
  radiusKm: number
): boolean {
  return calculateDistance(point, center) <= radiusKm;
}

/**
 * Get map bounds that contain all points with padding
 */
export function getBoundsFromPoints(
  points: Coordinates[],
  paddingPercent = 0.1
): { northEast: Coordinates; southWest: Coordinates } | null {
  if (points.length === 0) return null;

  let minLat = points[0].lat;
  let maxLat = points[0].lat;
  let minLng = points[0].lng;
  let maxLng = points[0].lng;

  for (const point of points) {
    minLat = Math.min(minLat, point.lat);
    maxLat = Math.max(maxLat, point.lat);
    minLng = Math.min(minLng, point.lng);
    maxLng = Math.max(maxLng, point.lng);
  }

  const latPadding = (maxLat - minLat) * paddingPercent;
  const lngPadding = (maxLng - minLng) * paddingPercent;

  return {
    northEast: { lat: maxLat + latPadding, lng: maxLng + lngPadding },
    southWest: { lat: minLat - latPadding, lng: minLng - lngPadding },
  };
}

/**
 * Create Google Maps URL for navigation
 */
export function getGoogleMapsUrl(
  destination: Coordinates,
  origin?: Coordinates
): string {
  const destParam = `${destination.lat},${destination.lng}`;

  if (origin) {
    const originParam = `${origin.lat},${origin.lng}`;
    return `https://www.google.com/maps/dir/?api=1&origin=${originParam}&destination=${destParam}`;
  }

  return `https://www.google.com/maps/dir/?api=1&destination=${destParam}`;
}
