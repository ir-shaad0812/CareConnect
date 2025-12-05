// ============================================
// BOOKING API SERVICE
// Booking management API calls
// ============================================

import { apiClient } from "./client";
import type { ApiResponse, User } from "@/types";

export type BookingStatus =
  | "reserved"
  | "pending"
  | "accepted"
  | "agreement_pending"
  | "payment_pending"
  | "confirmed"
  | "active"
  | "rejected"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "disputed"
  | "expired";

export type BookingType = "one_time" | "recurring";

// Sprint A/B: Slot + refund preview types
export type SlotStatus =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show"
  | "disputed";

export interface BookingSlot {
  _id: string;
  bookingId: string;
  slotNumber: number;
  scheduledStart: string;
  scheduledEnd: string;
  status: SlotStatus;
  amountAllocated: number;
  amountPaid: number;
  amountRefunded: number;
  amountReleased: number;
  currency: string;
  availabilityConfirmed?: {
    status: "pending" | "yes" | "no" | "no_response";
    askedAt?: string;
    respondedAt?: string;
  };
}

export interface SlotSummary {
  slotCount: number;
  totalAllocated: number;
  totalPaid: number;
  totalRefunded: number;
  byStatus: Record<string, number>;
  slots: BookingSlot[];
}

export interface RefundPreviewBreakdown {
  slotId?: string;
  slotNumber: number;
  scheduledStart: string;
  status: string;
  amountAllocated: number;
  amountPaid: number;
  refundAmount: number;
  refundPercentage: number;
  eligibility: "full" | "high" | "low" | "none";
  reason: string;
}

export interface RefundPreview {
  bookingId: string;
  cancelledByRole: "careseeker" | "caregiver" | "admin";
  coolOffActive: boolean;
  coolOffHours?: number;
  refundEligible?: boolean;
  refundStatus?: string;
  refundDecisionReason?: string;
  refundWindowEndsAt?: string | null;
  platformFee?: number;
  legacy?: boolean;
  slotCount: number;
  totalPaid: number;
  totalRefund: number;
  totalNonRefundable: number;
  currency: string;
  breakdown: RefundPreviewBreakdown[];
}
export type DurationType = "hourly" | "daily" | "weekly" | "monthly";
export type ServiceType = 
  | "elderly_care" 
  | "child_care" 
  | "special_needs" 
  | "disability_care" 
  | "post_surgery" 
  | "companionship" 
  | "respite_care" 
  | "palliative_care";

export type PaymentStatus =
  | "unpaid"
  | "payment_pending"
  | "partially_paid"
  | "fully_paid"
  | "paid"
  | "refunded"
  | "partially_refunded"
  | "cancelled"
  | "expired"
  | "pending"
  | "failed";

export interface CareRecipient {
  name: string;
  age?: number;
  gender?: string;
  relationship?: string;
  notes?: string;
  specialNeeds?: string;
  medicalConditions?: string[];
  allergies?: string[];
  medications?: string[];
  emergencyContact?: {
    name: string;
    phone: string;
    relationship?: string;
  };
}

export interface BookingSchedule {
  startDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  days?: string[];
  isFlexible?: boolean;
}

export interface BookingLocation {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  additionalInstructions?: string;
}

export interface BookingPricing {
  baseRate: number;
  rate?: number;           // actual DB field name
  rateType: DurationType;
  currency?: string;
  estimatedHours?: number;
  totalHours?: number;
  totalDays?: number;
  subtotal?: number;
  totalAmount: number;
  total?: number;          // actual DB field name
  platformFee?: number;
  platformFeePercentage?: number;
  discount?: number;
}

export interface CareReport {
  _id: string;
  bookingId: string;
  caregiverId: string;
  date: string;
  summary?: string;
  activities?: string[];
  activitiesCompleted?: string[];
  mealsProvided?: string[];
  medicationsGiven?: string[];
  mood?: string;
  notes?: string;
  healthObservations?: string;
  concerns?: string;
  moodRating?: number;
  createdAt: string;
}

export interface CheckInOut {
  time: string;
  notes?: string;
}

export interface BookingDispute {
  raisedBy: string;
  reason: string;
  description?: string;
  status: "pending" | "investigating" | "resolved" | "dismissed";
  resolution?: string;
  createdAt?: string;
}

export type TrackingLogStatus = "PENDING" | "SUBMITTED" | "FLAGGED";
export type TrackingWorkflowStatus =
  | "LOG_PENDING"
  | "LOG_SUBMITTED"
  | "LOG_MISSED";

export interface AgreementInfo {
  agreementId: string;
  status:
    | "generated"
    | "pending"
    | "partially_accepted"
    | "accepted"
    | "rejected"
    | "revoked";
  accepted: boolean;
  acceptedAt?: string;
  pdfUrl?: string;
  version?: string;
  seekerAccepted?: boolean;
  caregiverAccepted?: boolean;
  seekerAcceptedAt?: string;
  caregiverAcceptedAt?: string;
  content?: Record<string, unknown>;
}

export interface TrackingPowImage {
  imageUrl: string;
  timestamp: string;
  verifiedByAdmin: boolean;
}

export interface BookingTrackingLog {
  date: string;
  dateKey: string;
  checkInTime?: string;
  checkOutTime?: string;
  tasksCompleted?: string;
  notes?: string;
  issues?: string;
  issueFlag: boolean;
  images: TrackingPowImage[];
  status: TrackingLogStatus;
  workflowStatus?: TrackingWorkflowStatus;
  lateSubmission: boolean;
  missed: boolean;
  submittedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  reviewedByCareSeeker?: {
    approved: boolean;
    reviewedAt?: string;
    reviewerId?: string;
    comment?: string;
  };
  adminReview?: {
    status: "none" | "overridden" | "penalized" | "dispute_triggered";
    reviewerId?: string;
    reviewedAt?: string;
    note?: string;
  };
}

export interface BookingTrackingSummary {
  submitted: number;
  pending: number;
  flagged: number;
  missed: number;
  lateSubmissions: number;
  expectedDays: number;
  lastSubmittedAt?: string | null;
  workflow?: {
    LOG_PENDING: number;
    LOG_SUBMITTED: number;
    LOG_MISSED: number;
  };
}

export interface BookingTrackingControls {
  trackingEnabled: boolean;
  chatEnabled: boolean;
  mapVisible: boolean;
}

export interface BookingTrackingResponse {
  bookingId: string;
  bookingNumber?: string;
  bookingStatus: BookingStatus;
  schedule: BookingSchedule;
  caregiver: string | User;
  careSeeker: string | User;
  agreement: AgreementInfo;
  controls: BookingTrackingControls;
  summary: BookingTrackingSummary;
  trackingStatus?: TrackingWorkflowStatus;
  trackingLogs: BookingTrackingLog[];
}

export interface BookingAgreementResponse {
  bookingId: string;
  bookingNumber?: string;
  bookingStatus: BookingStatus;
  agreement: AgreementInfo;
}

export interface TrackingOverviewRow {
  bookingId: string;
  bookingNumber?: string;
  bookingStatus: BookingStatus;
  trackingStatus?: TrackingWorkflowStatus;
  agreementStatus: AgreementInfo["status"];
  caregiver: string | User;
  careSeeker: string | User;
  schedule: BookingSchedule;
  summary: BookingTrackingSummary;
  alerts: {
    flagged: number;
    missed: number;
    lateSubmissions: number;
  };
}

export interface TrackingOverviewResponse {
  bookings: TrackingOverviewRow[];
  totals: {
    bookings: number;
    flagged: number;
    missed: number;
    pending: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface BookingCancellation {
  cancelledBy: string;
  reason: string;
  cancelledAt: string;
  refundAmount?: number;
}

export interface BookingPayment {
  status: "pending" | "completed" | "failed" | "refunded" | "unpaid" | "payment_pending" | "partially_paid" | "fully_paid" | "expired";
  method?: string;
  transactionId?: string;
  paidAt?: string;
  amountPaid?: number;
  amountDue?: number;
  totalAmount?: number;
  paymentDeadline?: string;
  lastPaymentDate?: string;
}

export interface StatusHistoryEntry {
  status: BookingStatus;
  timestamp: string;
  changedBy?: string;
  notes?: string;
}

export interface Booking {
  _id: string;
  bookingNumber?: string;
  careSeekerId: string | User;
  caregiverId: string | User;
  status: BookingStatus;
  bookingType: BookingType;
  durationType?: DurationType;
  serviceType: ServiceType;
  schedule: BookingSchedule;
  location: BookingLocation;
  careRecipient: CareRecipient;
  pricing: BookingPricing;
  agreement?: AgreementInfo;
  specialInstructions?: string;
  careInstructions?: string;
  notes?: string;
  paymentStatus: PaymentStatus;
  totalAmount?: number;
  amountPaid?: number;
  amountDue?: number;
  paymentDeadline?: string;
  payment?: BookingPayment;
  checkIn?: CheckInOut;
  checkOut?: CheckInOut;
  checkInTime?: string;
  checkOutTime?: string;
  dispute?: BookingDispute;
  cancellation?: BookingCancellation;
  cancellationReason?: string;
  disputeReason?: string;
  careReports?: CareReport[];
  trackingLogs?: BookingTrackingLog[];
  statusHistory?: StatusHistoryEntry[];
  // Reservation fields
  reservationExpiry?: string;
  reservedAt?: string;
  extensionCount?: number;
  // Caregiver rate fallback (for legacy bookings with zero rate)
  caregiverCurrentRate?: number;
  caregiverRates?: {
    hourly: number;
    daily: number;
    weekly: number;
    monthly: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookingData {
  caregiverId: string;
  bookingType?: BookingType;
  serviceType: ServiceType;
  durationType?: DurationType;
  schedule: BookingSchedule;
  location: BookingLocation;
  careRecipient: CareRecipient;
  specialInstructions?: string;
  careInstructions?: string;
  notes?: string;
}

export interface BookingFilters {
  page?: number;
  limit?: number;
  status?: BookingStatus;
  serviceType?: ServiceType;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface BookingListResponse {
  bookings: Booking[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface BookingStatsResponse {
  totalBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalEarnings?: number;
  totalSpent?: number;
}

class BookingService {
  /**
   * Create a new booking
   */
  async createBooking(data: CreateBookingData): Promise<ApiResponse<{ booking: Booking }>> {
    return apiClient.post<{ booking: Booking }>("/bookings", data);
  }

  /**
   * Get my bookings (as caregiver or careseeker)
   */
  async getMyBookings(filters: BookingFilters = {}): Promise<ApiResponse<BookingListResponse>> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== "") {
        params.append(key, String(value));
      }
    });

    const queryString = params.toString();
    return apiClient.get<BookingListResponse>(`/bookings${queryString ? `?${queryString}` : ""}`);
  }

  /**
   * Get booking by ID
   */
  async getBookingById(bookingId: string): Promise<ApiResponse<{ booking: Booking }>> {
    return apiClient.get<{ booking: Booking }>(`/bookings/${bookingId}`);
  }

  /**
   * Get full agreement payload for a booking (including content).
   */
  async getAgreement(bookingId: string): Promise<ApiResponse<BookingAgreementResponse>> {
    return apiClient.get<BookingAgreementResponse>(`/bookings/${bookingId}/agreement`);
  }

  /**
   * Submit reservation - converts RESERVED to PENDING
   */
  async submitReservation(bookingId: string): Promise<ApiResponse<{ booking: Booking }>> {
    return apiClient.post<{ booking: Booking }>(`/bookings/${bookingId}/submit`);
  }

  /**
   * Extend reservation time
   */
  async extendReservation(bookingId: string): Promise<ApiResponse<{ booking: Booking }>> {
    return apiClient.post<{ booking: Booking }>(`/bookings/${bookingId}/extend-reservation`);
  }

  /**
   * Get my booking statistics
   */
  async getMyStats(): Promise<ApiResponse<BookingStatsResponse>> {
    return apiClient.get<BookingStatsResponse>("/bookings/stats");
  }

  /**
   * Confirm a booking (caregiver only)
   */
  async confirmBooking(bookingId: string): Promise<ApiResponse<{ booking: Booking }>> {
    return apiClient.post<{ booking: Booking }>(`/bookings/${bookingId}/confirm`);
  }

  /**
   * Accept booking agreement (care seeker / caregiver)
   */
  async acceptAgreement(bookingId: string): Promise<ApiResponse<{ booking: Booking }>> {
    return apiClient.post<{ booking: Booking }>(`/bookings/${bookingId}/agreement/accept`);
  }

  /**
   * Reject a booking (caregiver only)
   */
  async rejectBooking(bookingId: string, reason?: string): Promise<ApiResponse<{ booking: Booking }>> {
    return apiClient.post<{ booking: Booking }>(`/bookings/${bookingId}/reject`, { reason });
  }

  /**
   * Cancel a booking
   */
  async cancelBooking(bookingId: string, reason?: string): Promise<ApiResponse<{ booking: Booking }>> {
    return apiClient.post<{ booking: Booking }>(`/bookings/${bookingId}/cancel`, { reason });
  }

  /**
   * Sprint B: Preview refund before cancelling. Does NOT mutate anything.
   */
  async previewRefund(bookingId: string): Promise<ApiResponse<RefundPreview>> {
    return apiClient.get<RefundPreview>(`/bookings/${bookingId}/refund-preview`);
  }

  /**
   * Sprint A: Get atomic slots for a booking.
   */
  async getBookingSlots(bookingId: string): Promise<ApiResponse<SlotSummary>> {
    return apiClient.get<SlotSummary>(`/bookings/${bookingId}/slots`);
  }

  /**
   * Check in for a booking (caregiver only)
   */
  async checkIn(bookingId: string): Promise<ApiResponse<{ booking: Booking }>> {
    return apiClient.post<{ booking: Booking }>(`/bookings/${bookingId}/check-in`);
  }

  /**
   * Check out from a booking (caregiver only)
   */
  async checkOut(bookingId: string): Promise<ApiResponse<{ booking: Booking }>> {
    return apiClient.post<{ booking: Booking }>(`/bookings/${bookingId}/check-out`);
  }

  /**
   * Tracking check-in
   */
  async checkInTracking(payload: {
    bookingId: string;
    date?: string;
    notes?: string;
  }): Promise<ApiResponse<{ booking: Booking; trackingLog: BookingTrackingLog }>> {
    return apiClient.post<{ booking: Booking; trackingLog: BookingTrackingLog }>("/tracking/check-in", payload);
  }

  /**
   * Tracking check-out
   */
  async checkOutTracking(payload: {
    bookingId: string;
    date?: string;
    notes?: string;
  }): Promise<ApiResponse<{ booking: Booking; trackingLog: BookingTrackingLog }>> {
    return apiClient.post<{ booking: Booking; trackingLog: BookingTrackingLog }>("/tracking/check-out", payload);
  }

  /**
   * Submit daily tracking report
   */
  async submitTracking(payload: {
    bookingId: string;
    date: string;
    tasksCompleted: string;
    notes?: string;
    issues?: string;
    issueFlag?: boolean;
    images?: string[];
  }): Promise<ApiResponse<{ booking: Booking; trackingLog: BookingTrackingLog }>> {
    return apiClient.post<{ booking: Booking; trackingLog: BookingTrackingLog }>("/tracking/submit", payload);
  }

  /**
   * Legacy compatibility wrapper used by booking detail page.
   */
  async submitTrackingLog(
    bookingId: string,
    formData: FormData,
  ): Promise<ApiResponse<{ booking: Booking; trackingLog: BookingTrackingLog }>> {
    const payload = new FormData();
    payload.append("bookingId", bookingId);

    for (const [key, value] of formData.entries()) {
      payload.append(key, value);
    }

    return apiClient.post<{ booking: Booking; trackingLog: BookingTrackingLog }>(
      "/tracking/submit",
      payload,
    );
  }

  /**
   * Get tracking logs for a booking
   */
  async getTrackingLogs(bookingId: string): Promise<ApiResponse<BookingTrackingResponse>> {
    return apiClient.get<BookingTrackingResponse>(`/tracking/${bookingId}`);
  }

  /**
   * Care seeker review on a daily tracking log
   */
  async reviewTrackingLog(
    bookingId: string,
    date: string,
    action: "approve" | "flag",
    comment?: string
  ): Promise<ApiResponse<{ booking: Booking; trackingLog: BookingTrackingLog }>> {
    return apiClient.patch<{ booking: Booking; trackingLog: BookingTrackingLog }>(
      `/tracking/${bookingId}/${date}/review`,
      { action, comment }
    );
  }

  /**
   * Admin tracking observability panel
   */
  async getAdminTrackingOverview(params?: {
    page?: number;
    limit?: number;
    caregiverId?: string;
    flaggedOnly?: boolean;
  }): Promise<ApiResponse<TrackingOverviewResponse>> {
    const queryParams: Record<string, unknown> = {};

    if (params?.page !== undefined) queryParams.page = params.page;
    if (params?.limit !== undefined) queryParams.limit = params.limit;
    if (params?.caregiverId) queryParams.caregiverId = params.caregiverId;
    if (params?.flaggedOnly !== undefined) queryParams.flaggedOnly = params.flaggedOnly;

    return apiClient.get<TrackingOverviewResponse>("/tracking/admin/overview", {
      params: queryParams,
    });
  }

  /**
   * Admin action on a specific daily tracking log
   */
  async adminUpdateTrackingLog(
    bookingId: string,
    date: string,
    action: "override" | "penalize" | "dispute",
    note?: string
  ): Promise<ApiResponse<{ booking: Booking; trackingLog: BookingTrackingLog }>> {
    const payload = note && note.trim().length > 0
      ? { action, note }
      : { action };

    return apiClient.patch<{ booking: Booking; trackingLog: BookingTrackingLog }>(
      `/tracking/${bookingId}/${date}/admin`,
      payload
    );
  }

  /**
   * Admin ping for missing/pending daily tracking log.
   */
  async sendTrackingReminder(
    bookingId: string,
    date: string,
    message?: string,
  ): Promise<ApiResponse<{ sent: boolean; dateKey: string; message: string }>> {
    const payload =
      typeof message === "string" && message.trim().length > 0
        ? { message: message.trim() }
        : {};

    return apiClient.post<{ sent: boolean; dateKey: string; message: string }>(
      `/tracking/${bookingId}/${date}/remind`,
      payload,
    );
  }

  /**
   * Submit care report (caregiver only)
   */
  async submitCareReport(
    bookingId: string, 
    report: Omit<CareReport, "_id" | "bookingId" | "caregiverId" | "createdAt">
  ): Promise<ApiResponse<{ careReport: CareReport }>> {
    return apiClient.post<{ careReport: CareReport }>(`/bookings/${bookingId}/care-report`, report);
  }

  /**
   * Get care reports for a booking
   */
  async getCareReports(bookingId: string): Promise<ApiResponse<{ careReports: CareReport[] }>> {
    return apiClient.get<{ careReports: CareReport[] }>(`/bookings/${bookingId}/care-reports`);
  }

  /**
   * Request modification
   */
  async requestModification(
    bookingId: string, 
    modifications: Partial<Pick<Booking, "schedule" | "specialInstructions">>
  ): Promise<ApiResponse<{ booking: Booking }>> {
    return apiClient.post<{ booking: Booking }>(`/bookings/${bookingId}/modify`, modifications);
  }

  /**
   * Raise a dispute
   */
  async raiseDispute(
    bookingId: string, 
    data: { reason: string; description?: string } | string
  ): Promise<ApiResponse<{ booking: Booking }>> {
    const payload = typeof data === 'string' ? { reason: data } : data;
    return apiClient.post<{ booking: Booking }>(`/bookings/${bookingId}/dispute`, payload);
  }

  // ============================================
  // ADMIN METHODS
  // ============================================

  /**
   * Get all bookings (Admin)
   */
  async getAllBookings(filters: BookingFilters = {}): Promise<ApiResponse<BookingListResponse>> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== "") {
        params.append(key, String(value));
      }
    });

    const queryString = params.toString();
    return apiClient.get<BookingListResponse>(`/admin/bookings${queryString ? `?${queryString}` : ""}`);
  }

  /**
   * Get booking stats (Admin)
   */
  async getBookingStats(): Promise<ApiResponse<BookingStatsResponse>> {
    return apiClient.get<BookingStatsResponse>("/admin/bookings/stats");
  }

  /**
   * Update booking status (Admin)
   */
  async updateBookingStatus(
    bookingId: string, 
    status: BookingStatus
  ): Promise<ApiResponse<{ booking: Booking }>> {
    return apiClient.patch<{ booking: Booking }>(`/admin/bookings/${bookingId}/status`, { status });
  }

  /**
   * Resolve dispute (Admin)
   */
  async resolveDispute(
    bookingId: string, 
    resolution: { decision: string; notes?: string }
  ): Promise<ApiResponse<{ booking: Booking }>> {
    return apiClient.post<{ booking: Booking }>(`/admin/bookings/${bookingId}/resolve-dispute`, resolution);
  }

  /**
   * Get calendar events
   */
  async getCalendarEvents(startDate?: string, endDate?: string): Promise<ApiResponse<{ events: CalendarEventData[] }>> {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    
    const queryString = params.toString();
    return apiClient.get<{ events: CalendarEventData[] }>(`/bookings/calendar${queryString ? `?${queryString}` : ""}`);
  }

  /**
   * Get admin calendar events
   */
  async getAdminCalendarEvents(startDate?: string, endDate?: string): Promise<ApiResponse<{ events: CalendarEventData[] }>> {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    
    const queryString = params.toString();
    return apiClient.get<{ events: CalendarEventData[] }>(`/admin/bookings/calendar${queryString ? `?${queryString}` : ""}`);
  }

  /**
   * Admin cancel booking
   */
  async adminCancelBooking(bookingId: string, reason: string): Promise<ApiResponse<{ booking: Booking }>> {
    return apiClient.post<{ booking: Booking }>(`/admin/bookings/${bookingId}/cancel`, { reason });
  }
}

// Calendar event type
export interface CalendarEventData {
  id: string;
  title: string;
  start: string;
  end?: string;
  startTime?: string;
  endTime?: string;
  status: BookingStatus;
  serviceType: ServiceType;
  careSeeker: {
    _id: string;
    fullName: string;
    email: string;
    avatar?: string;
  };
  caregiver: {
    _id: string;
    fullName: string;
    email: string;
    avatar?: string;
  };
  pricing?: BookingPricing;
  bookingNumber?: string;
}

export const bookingService = new BookingService();
export default bookingService;
