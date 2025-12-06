// ============================================
// SHARED TYPE DEFINITIONS
// ============================================

// User Types
export type UserRole = 'caregiver' | 'careseeker' | 'admin';
export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say';
export type UserStatus = 'pending' | 'pending_approval' | 'active' | 'rejected' | 'suspended' | 'deleted';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Location {
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  coordinates?: Coordinates;
}

export interface Availability {
  days?: string[];
  hours?: {
    start?: string;
    end?: string;
  };
}

// API Response Types
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

// Pagination
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Component Base Props
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

// Form Field Props
export interface FormFieldProps {
  label?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  name?: string;
  id?: string;
}
