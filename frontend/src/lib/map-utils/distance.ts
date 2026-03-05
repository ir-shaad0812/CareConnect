/**
 * Distance calculation utilities using Haversine formula
 * Production-grade implementation with TypeScript type safety
 */

import type { Coordinates, DistanceUnit, CaregiverLocation } from '@/types/map.types';

const EARTH_RADIUS_KM = 6371;
const EARTH_RADIUS_MILES = 3959;

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param point1 - First coordinate point
 * @param point2 - Second coordinate point
 * @param unit - Unit of measurement (km or miles)
 * @returns Distance in specified unit
 */
export function calculateDistance(
  point1: Coordinates,
  point2: Coordinates,
  unit: DistanceUnit = 'km'
): number {
  const earthRadius = unit === 'km' ? EARTH_RADIUS_KM : EARTH_RADIUS_MILES;

  const lat1Rad = toRadians(point1.latitude);
  const lat2Rad = toRadians(point2.latitude);
  const deltaLatRad = toRadians(point2.latitude - point1.latitude);
  const deltaLonRad = toRadians(point2.longitude - point1.longitude);

  const a =
    Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(deltaLonRad / 2) *
      Math.sin(deltaLonRad / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadius * c;
}

/**
 * Filter caregivers within a specified radius from user location
 * @param caregivers - Array of caregiver locations
 * @param userLocation - User's current location
 * @param radius - Search radius
 * @param unit - Unit of measurement
 * @returns Filtered array of caregivers within radius
 */
export function filterByRadius(
  caregivers: CaregiverLocation[],
  userLocation: Coordinates,
  radius: number,
  unit: DistanceUnit = 'km'
): CaregiverLocation[] {
  return caregivers.filter((caregiver) => {
    const distance = calculateDistance(userLocation, caregiver, unit);
    return distance <= radius;
  });
}

/**
 * Sort caregivers by distance from user location (nearest first)
 * @param caregivers - Array of caregiver locations
 * @param userLocation - User's current location
 * @param unit - Unit of measurement
 * @returns Sorted array with distance property added
 */
export function sortByDistance(
  caregivers: CaregiverLocation[],
  userLocation: Coordinates,
  unit: DistanceUnit = 'km'
): Array<CaregiverLocation & { distance: number }> {
  return caregivers
    .map((caregiver) => ({
      ...caregiver,
      distance: calculateDistance(userLocation, caregiver, unit),
    }))
    .sort((a, b) => a.distance - b.distance);
}

/**
 * Get caregivers within radius sorted by nearest first
 * Combines filtering and sorting in one operation
 * @param caregivers - Array of caregiver locations
 * @param userLocation - User's current location
 * @param radius - Search radius
 * @param unit - Unit of measurement
 * @returns Filtered and sorted array of caregivers with distance
 */
export function getNearestCaregivers(
  caregivers: CaregiverLocation[],
  userLocation: Coordinates,
  radius: number,
  unit: DistanceUnit = 'km'
): Array<CaregiverLocation & { distance: number }> {
  return caregivers
    .map((caregiver) => ({
      ...caregiver,
      distance: calculateDistance(userLocation, caregiver, unit),
    }))
    .filter((caregiver) => caregiver.distance <= radius)
    .sort((a, b) => a.distance - b.distance);
}

/**
 * Format distance for display
 * @param distance - Distance value
 * @param unit - Unit of measurement
 * @param decimals - Number of decimal places
 * @returns Formatted distance string
 */
export function formatDistance(
  distance: number,
  unit: DistanceUnit = 'km',
  decimals: number = 1
): string {
  return `${distance.toFixed(decimals)} ${unit}`;
}

/**
 * Calculate map bounds to fit all caregivers
 * @param caregivers - Array of caregiver locations
 * @returns Map bounds containing all caregivers
 */
export function calculateBounds(caregivers: CaregiverLocation[]): {
  northEast: Coordinates;
  southWest: Coordinates;
} | null {
  if (caregivers.length === 0) return null;

  const latitudes = caregivers.map((c) => c.latitude);
  const longitudes = caregivers.map((c) => c.longitude);

  return {
    northEast: {
      latitude: Math.max(...latitudes),
      longitude: Math.max(...longitudes),
    },
    southWest: {
      latitude: Math.min(...latitudes),
      longitude: Math.min(...longitudes),
    },
  };
}
