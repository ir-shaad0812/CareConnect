// ============================================
// BOOKING TYPES
// ============================================

export type BookingStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'disputed';

export interface Booking {
  id: string;
  _id?: string;
  caregiverId: string;
  carseekerId: string;
  status: BookingStatus;
  startDate: string;
  endDate: string;
  totalHours: number;
  totalPrice: number;
  serviceType: string;
  notes?: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookingData {
  caregiverId: string;
  startDate: string;
  endDate: string;
  serviceType: string;
  notes?: string;
  address?: string;
}

export interface BookingFilters {
  status?: BookingStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}
