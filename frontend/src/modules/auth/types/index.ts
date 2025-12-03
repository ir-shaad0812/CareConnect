// ============================================
// AUTH TYPES
// ============================================

import type { User } from '@/types';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Form state for login
export interface LoginFormState {
  email: string;
  password: string;
}

export interface LoginFormErrors {
  email?: string;
  password?: string;
}

// Form state for registration steps
export interface PersonalDetailsFormState {
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say' | '';
  address: string;
}

export interface RoleProfileFormState {
  role: 'caregiver' | 'careseeker' | '';
  bio: string;
  experience?: string;
  specializations?: string[];
}
