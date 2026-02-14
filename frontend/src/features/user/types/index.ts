// ============================================
// USER TYPES
// ============================================

import type { Location, Availability } from '@/shared/types';

export interface ProfileUpdateData {
  fullName?: string;
  phone?: string;
  age?: number;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  bio?: string;
  avatar?: string;
  location?: Location;
  languages?: string[];

  // Caregiver-specific
  experience?: number;
  hourlyRate?: number;
  dailyRate?: number;
  weeklyRate?: number;
  monthlyRate?: number;
  skills?: string[];
  serviceTypes?: string[];
  workPreferences?: string[];
  availability?: Availability;

  // Careseeker-specific
  careNeeds?: string[];
  preferredSchedule?: Availability;
  budget?: {
    min?: number;
    max?: number;
    type?: 'hourly' | 'daily' | 'weekly' | 'monthly';
  };
  familyMembers?: FamilyMember[];
}

export interface FamilyMember {
  name?: string;
  age?: number;
  relationship?: string;
  specialNeeds?: string;
}

export interface RatesData {
  hourlyRate?: number;
  dailyRate?: number;
  weeklyRate?: number;
  monthlyRate?: number;
}

export interface DashboardStats {
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  averageRating: number;
  totalEarnings: number;
  profileViews: number;
}

export type { User } from '@/types';
