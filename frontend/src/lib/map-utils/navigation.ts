/**
 * Google Maps navigation utility
 * Generate navigation URLs without using Google Maps SDK
 */

import type { Coordinates } from '@/types/map.types';

/**
 * Generate Google Maps navigation URL
 * Works on both mobile and desktop
 * @param destination - Destination coordinates
 * @param origin - Optional origin coordinates (defaults to user's current location)
 * @returns Google Maps URL
 */
export function getGoogleMapsNavigationUrl(
  destination: Coordinates,
  origin?: Coordinates
): string {
  const baseUrl = 'https://www.google.com/maps/dir/';
  
  const originParam = origin
    ? `${origin.latitude},${origin.longitude}`
    : 'Current+Location';
  
  const destParam = `${destination.latitude},${destination.longitude}`;
  
  return `${baseUrl}${originParam}/${destParam}`;
}

/**
 * Generate Google Maps place URL for a specific location
 * @param location - Location coordinates
 * @returns Google Maps place URL
 */
export function getGoogleMapsPlaceUrl(location: Coordinates): string {
  return `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
}

/**
 * Open Google Maps navigation in new tab
 * @param destination - Destination coordinates
 * @param origin - Optional origin coordinates
 */
export function openGoogleMapsNavigation(
  destination: Coordinates,
  origin?: Coordinates
): void {
  const url = getGoogleMapsNavigationUrl(destination, origin);
  window.open(url, '_blank', 'noopener,noreferrer');
}
