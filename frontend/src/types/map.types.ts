/**
 * Map-related TypeScript interfaces and types
 * Production-grade type definitions for CareConnect map features
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface CaregiverLocation extends Coordinates {
  id: string;
  name: string;
  role: CaregiverRole;
  userType?: 'caregiver' | 'careseeker';
  rating?: number;
  hourlyRate?: number;
  isActive?: boolean;
  isVerified?: boolean;
  verificationStatus?: 'pending' | 'verified' | 'rejected' | 'unknown';
  profileImage?: string;
  responseRate?: number;
  completedBookings?: number;
  lastRecordedAt?: string;
  locationSource?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
}

export type CaregiverRole =
  | 'Nurse'
  | 'Child Care'
  | 'Elder Care'
  | 'Physiotherapy'
  | 'Personal Care'
  | 'Disability Support'
  | 'Mental Health Support'
  | 'Care Seeker';

export type DistanceUnit = 'km' | 'miles';

export interface DistanceFilterConfig {
  userLocation: Coordinates;
  radius: number;
  unit: DistanceUnit;
}

export interface MapBounds {
  northEast: Coordinates;
  southWest: Coordinates;
}

export interface MapViewport {
  center: Coordinates;
  zoom: number;
}

export interface ServiceArea {
  center: Coordinates;
  radius: number; // in kilometers
}

export interface BookingLocation extends Coordinates {
  address: string;
  landmark?: string;
  city: string;
  postalCode?: string;
}

export interface CaregiverStats {
  totalCaregivers: number;
  activeCaregivers: number;
  inactiveCaregivers: number;
  byRole: Record<CaregiverRole, number>;
  byCity: Record<string, number>;
}

export interface MarkerClusterGroup {
  caregivers: CaregiverLocation[];
  count: number;
  center: Coordinates;
}
