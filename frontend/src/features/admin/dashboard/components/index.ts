/**
 * Mock caregiver data for development and testing
 * Realistic coordinates within Kathmandu, Nepal area
 *
 * This fixture should only be used as a fallback when live API data
 * is unavailable in map-related pages.
 */

import type { CaregiverLocation } from '@/types/map.types';

export const mockCaregivers: CaregiverLocation[] = [
  {
    id: 'cg-001',
    name: 'Sarah Johnson',
    role: 'Nurse',
    latitude: 27.7172,
    longitude: 85.324,
    rating: 4.9,
    hourlyRate: 25,
    isActive: true,
    responseRate: 98,
    completedBookings: 147,
    profileImage: '/avatars/sarah.jpg',
  },
  {
    id: 'cg-002',
    name: 'Michael Chen',
    role: 'Physiotherapy',
    latitude: 27.7089,
    longitude: 85.3206,
    rating: 4.8,
    hourlyRate: 30,
    isActive: true,
    responseRate: 95,
    completedBookings: 89,
    profileImage: '/avatars/michael.jpg',
  },
  {
    id: 'cg-003',
    name: 'Priya Sharma',
    role: 'Elder Care',
    latitude: 27.7103,
    longitude: 85.3123,
    rating: 5.0,
    hourlyRate: 22,
    isActive: true,
    responseRate: 100,
    completedBookings: 203,
    profileImage: '/avatars/priya.jpg',
  },
  {
    id: 'cg-004',
    name: 'David Thompson',
    role: 'Child Care',
    latitude: 27.7215,
    longitude: 85.3341,
    rating: 4.7,
    hourlyRate: 20,
    isActive: true,
    responseRate: 92,
    completedBookings: 134,
    profileImage: '/avatars/david.jpg',
  },
  {
    id: 'cg-005',
    name: 'Maria Rodriguez',
    role: 'Personal Care',
    latitude: 27.7052,
    longitude: 85.3162,
    rating: 4.9,
    hourlyRate: 24,
    isActive: true,
    responseRate: 97,
    completedBookings: 176,
    profileImage: '/avatars/maria.jpg',
  },
  {
    id: 'cg-006',
    name: 'James Wilson',
    role: 'Disability Support',
    latitude: 27.7135,
    longitude: 85.3285,
    rating: 4.8,
    hourlyRate: 28,
    isActive: true,
    responseRate: 94,
    completedBookings: 112,
    profileImage: '/avatars/james.jpg',
  },
  {
    id: 'cg-007',
    name: 'Aisha Patel',
    role: 'Mental Health Support',
    latitude: 27.7198,
    longitude: 85.3157,
    rating: 5.0,
    hourlyRate: 35,
    isActive: false,
    responseRate: 99,
    completedBookings: 87,
    profileImage: '/avatars/aisha.jpg',
  },
  {
    id: 'cg-008',
    name: 'Robert Lee',
    role: 'Nurse',
    latitude: 27.7065,
    longitude: 85.3298,
    rating: 4.6,
    hourlyRate: 26,
    isActive: true,
    responseRate: 90,
    completedBookings: 95,
    profileImage: '/avatars/robert.jpg',
  },
  {
    id: 'cg-009',
    name: 'Emily Davis',
    role: 'Elder Care',
    latitude: 27.7182,
    longitude: 85.3219,
    rating: 4.9,
    hourlyRate: 23,
    isActive: true,
    responseRate: 96,
    completedBookings: 165,
    profileImage: '/avatars/emily.jpg',
  },
  {
    id: 'cg-010',
    name: 'Raj Kumar',
    role: 'Physiotherapy',
    latitude: 27.7112,
    longitude: 85.3367,
    rating: 4.8,
    hourlyRate: 32,
    isActive: false,
    responseRate: 93,
    completedBookings: 78,
    profileImage: '/avatars/raj.jpg',
  },
];

/**
 * Mock user location (Kathmandu center)
 */
export const mockUserLocation = {
  latitude: 27.7172,
  longitude: 85.324,
};

/**
 * Available distance radius options
 */
export const distanceRadiusOptions = [
  { value: 3, label: '3 km' },
  { value: 5, label: '5 km' },
  { value: 10, label: '10 km' },
  { value: 15, label: '15 km' },
  { value: 20, label: '20 km' },
  { value: 50, label: '50 km' },
];
