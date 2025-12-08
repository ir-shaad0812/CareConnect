// ============================================
// TYPE DEFINITIONS - CareConnect Platform
// ============================================

// User Role Types
export type UserRole = 'caregiver' | 'careseeker' | 'admin';
export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say';
export type UserStatus = 'onboarding' | 'pending' | 'pending_approval' | 'active' | 'rejected' | 'suspended' | 'deleted';
export type VerificationStatus = 'PENDING' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED';

// User Location
export interface UserLocation {
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  postalCode?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

// Availability
export interface Availability {
  days?: string[];
  hours?: {
    start?: string;
    end?: string;
  };
}

// Budget (for careseekers)
export interface Budget {
  min?: number;
  max?: number;
  type?: 'hourly' | 'daily' | 'weekly' | 'monthly';
}

// Family Member (for careseekers)
export interface FamilyMember {
  name?: string;
  age?: number;
  relationship?: string;
  specialNeeds?: string;
}

// User Types
export interface User {
  id: string;
  _id?: string;
  email: string;
  fullName: string;
  phone?: string;
  age?: number;
  gender?: Gender;
  role: UserRole | null;
  status: UserStatus;
  verificationStatus?: VerificationStatus;
  onboardingCompleted?: boolean;
  profileCompletion?: number;
  isBanned?: boolean;
  rejectionReason?: string;
  avatar?: string;
  bio?: string;
  location?: UserLocation;
  languages?: string[];
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isProfileComplete: boolean;
  authProvider: 'local' | 'google';
  createdAt: string;
  updatedAt: string;
  
  // Caregiver-specific fields
  experience?: number;
  hourlyRate?: number;
  skills?: string[];
  certifications?: string[];
  availability?: Availability;
  rating?: number;
  totalReviews?: number;
  
  // Careseeker-specific fields
  careNeeds?: string[];
  preferredSchedule?: Availability;
  budget?: Budget;
  familyMembers?: FamilyMember[];
}

// Auth Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  age: number;
  gender: Gender;
  role: UserRole;
  location?: {
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  };
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

// API Types
export interface ApiResponse<T> {
  success: boolean;
  statusCode?: number;
  data?: T;
  message?: string;
  error?: string;
  errors?: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ApiError {
  message: string;
  statusCode: number;
  errors?: ValidationError[];
}

// Social Auth Types
export type SocialProvider = 'google' | 'facebook' | 'linkedin' | 'microsoft' | 'email';

export interface SocialButton {
  name: SocialProvider;
  text: string;
  icon: React.ReactNode;
}

// Form Step Types for Registration
export interface PersonalDetailsForm {
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: Gender | '';
  address: string;
}

export interface RoleProfileForm {
  role: UserRole | '';
  bio: string;
  experience?: string;
  specializations?: string[];
}

export interface DocumentsForm {
  documents: File[];
  certifications: File[];
}

// Component Props Types
export interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export interface InputProps {
  label?: string;
  error?: string;
  placeholder?: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'date';
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  name?: string;
  id?: string;
}

export interface SelectProps {
  label?: string;
  error?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[];
  className?: string;
  required?: boolean;
  disabled?: boolean;
  name?: string;
}
