// ============================================
// ADMIN API SERVICE
// API calls for admin dashboard and management
// ============================================

import apiClient from "./client";
import type { ApiResponse } from "@/types";

export interface DashboardStats {
  users: {
    total: number;
    caregivers: number;
    careseekers: number;
    pending: number;
    pendingApproval: number;
    active: number;
    suspended: number;
    newThisWeek: number;
    newThisMonth: number;
  };
  documents: {
    pending: number;
    verified: number;
    rejected: number;
  };
  bookings?: {
    total: number;
    thisMonth: number;
    active: number;
    pending: number;
    completed: number;
  };
  revenue?: {
    thisMonth: number;
    prevMonth: number;
    growthPercent: number;
  };
}

export interface SystemStatsMetricBundle {
  activeBookings: number;
  todayCheckIns: number;
  missedCheckIns: number;
  lateCheckIns: number;
  pendingLogs: number;
  flaggedLogs: number;
  activeDisputes: number;
  pendingApprovals: number;
  onlineCaregivers: number;
}

export interface SystemStatsHealth {
  status: "healthy" | "warning" | "critical";
  score: number;
  signals: {
    flaggedRate: number;
    missedRate: number;
    disputeLoad: number;
  };
}

export interface SystemStatsAlert {
  id: string;
  type: "tracking" | "dispute" | "approval" | "operations";
  severity: "medium" | "high" | "critical";
  title: string;
  message: string;
  count: number;
  actionUrl: string;
}

export interface SystemStatsFeedItem {
  id: string;
  type: "tracking" | "dispute";
  severity: "medium" | "high" | "critical";
  title: string;
  description: string;
  bookingNumber?: string;
  ticketNumber?: string;
  actionUrl: string;
  timestamp: string;
}

export interface AdminSystemStats {
  metrics: SystemStatsMetricBundle;
  health: SystemStatsHealth;
  alerts: SystemStatsAlert[];
  feed: SystemStatsFeedItem[];
  generatedAt: string;
}

export interface AnalyticsProofOfWork {
  caregiver: string;
  caregiverAvatar: string | null;
  client: string;
  service: string;
  hours: string;
  rating: number | null;
  verified: boolean;
  date: string;
}

export interface AnalyticsCaregiverVisitor {
  name: string;
  avatar: string | null;
  totalVisits: number;
  unique: number;
  searches: number;
  growth: number;
}

export interface AnalyticsLocation {
  country: string;
  code: string;
  visitors: number;
  percent: number;
}

export interface AnalyticsTopPage {
  page: string;
  views: number;
  change: number;
}

export interface AnalyticsReferrer {
  source: string;
  count: number;
  percent: number;
}

export interface AnalyticsOverview {
  totalUsers: number;
  activeCaregivers: number;
  activeFamilies: number;
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  revenue: number;
  revenueChange: number;
  userChange: number;
  completionRate: number;
  cancellationRate: number;
  newUsersThisMonth: number;
}

export interface TimeSeriesPoint {
  date: string;
  label: string;
  total: number;
  caregivers?: number;
  careseekers?: number;
  completed?: number;
  cancelled?: number;
  confirmed?: number;
}

export interface RevenuePoint {
  label: string;
  revenue: number;
  bookings: number;
  platformFee: number;
}

export interface TopEarner {
  _id: string;
  totalEarnings: number;
  bookings: number;
  user: { fullName: string; avatar?: string; email: string };
}

export interface NotesInsights {
  totalNotes: number;
  tags: Record<string, number>;
  visibility: Record<string, number>;
  avgNotesPerBooking: number;
  bookingsWithNotes: number;
  activeCreators: Array<{ _id: string; count: number; user: { fullName: string; avatar?: string; role: string } }>;
}

export interface LocationAnalytics {
  byCity: Array<{ _id: string; count: number; state?: string }>;
  byCountry: Array<{ _id: string; count: number }>;
}

// ==================== USER ACTIVITY TRACKING TYPES ====================

export interface UserActivityItem {
  _id: string;
  userId: string;
  category: 'auth' | 'booking' | 'message' | 'note' | 'document' | 'profile' | 'payment' | 'job' | 'dispute' | 'review' | 'system';
  action: string;
  relatedEntity?: {
    type: string;
    id: string;
  };
  metadata: {
    userAgent?: string;
    browser?: string;
    os?: string;
    device?: string;
    ip?: string;
    country?: string;
    city?: string;
    description?: string;
    previousValue?: unknown;
    newValue?: unknown;
    amount?: number;
    success?: boolean;
    errorMessage?: string;
    targetUserId?: string;
  };
  sessionId?: string;
  userRole?: string;
  status: 'success' | 'failed' | 'pending';
  createdAt: string;
  user?: {
    fullName: string;
    email: string;
    avatar?: string;
    role: string;
  };
}

export interface ActivityTimelineResponse {
  activities: UserActivityItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasMore: boolean;
  };
}

export interface ActivityStats {
  byCategory: Array<{ _id: string; count: number }>;
  byAction: Array<{ _id: { category: string; action: string }; count: number }>;
  byRole: Array<{ _id: string; count: number }>;
  dailyTrend: Array<{ _id: string; count: number; uniqueUsers: number }>;
}

export interface LoginAnalytics {
  dailyLogins: Array<{
    _id: string;
    total: number;
    successful: number;
    failed: number;
    uniqueUsers: number;
  }>;
  loginsByRole: Array<{ _id: string; count: number }>;
  loginsByDevice: Array<{ _id: string; count: number }>;
  loginsByLocation: Array<{ _id: { city: string; country: string }; count: number }>;
}

export interface UserEngagement {
  mostActiveUsers: Array<{
    _id: string;
    activityCount: number;
    categories: string[];
    user?: {
      fullName: string;
      email: string;
      avatar?: string;
      role: string;
    };
  }>;
  engagementByCategory: Array<{
    _id: string;
    totalActions: number;
    uniqueUsers: number;
    avgActionsPerUser: number;
  }>;
  hourlyActivity: Array<{ _id: number; count: number }>;
  avgSessionDuration: number;
}

export interface PlatformActivityStats {
  byCategoryDaily: Array<{ _id: { date: string; category: string }; count: number }>;
  byActionCount: Array<{ _id: string; count: number }>;
  activeUsers: Array<{ _id: string; activeUsers: number; totalActivities: number }>;
  peakHours: Array<{ _id: number; count: number }>;
}

export interface UserActivitySummary {
  _id: string;
  count: number;
  lastActivity: string;
  actions: string[];
}

export interface FullAnalytics {
  overview: AnalyticsOverview;
  userGrowth: TimeSeriesPoint[];
  bookingAnalytics: TimeSeriesPoint[];
  revenueInsights: { monthly: RevenuePoint[]; topEarners: TopEarner[] };
  notesInsights: NotesInsights;
  locationAnalytics: LocationAnalytics;
}

export interface AdminAnalytics {
  proofOfWork: AnalyticsProofOfWork[];
  caregiverVisitors: AnalyticsCaregiverVisitor[];
  locations: AnalyticsLocation[];
  topPages: AnalyticsTopPage[];
  topReferrers: AnalyticsReferrer[];
  bookingBreakdown: Record<string, number>;
}

export interface AdminUser {
  _id: string;
  fullName: string;
  email: string;
  role: string;
  status: string;
  phone?: string;
  avatar?: string;
  completionPercentage?: number;
  isEmailVerified: boolean;
  createdAt: string;
  lastLogin?: string;
  avatarHistory?: Array<{
    url: string;
    publicId: string;
    action: "upload" | "delete";
    createdAt: string;
  }>;
}

export interface AdminDocument {
  _id: string;
  userId: {
    _id: string;
    fullName: string;
    email: string;
    role: string;
  };
  /** Legacy alias — same as `url` */
  fileUrl: string;
  /** Cloudinary secure_url  — publicly accessible */
  url: string;
  type: string;
  documentType: string;
  fileName: string;
  originalName?: string;
  mimeType?: string;
  size?: number;
  publicId?: string;
  status: string;
  rejectionReason?: string;
  createdAt: string;
  verifiedAt?: string;
}

export interface Activity {
  type: "user_registration" | "document_submission";
  user: {
    fullName: string;
    email: string;
  } | null;
  role?: string;
  status?: string;
  documentType?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface AdminLocationProof {
  userId: string;
  fullName: string;
  email: string;
  avatar?: string;
  userStatus: string;
  userCreatedAt: string;
  locationProof: {
    coordinates: {
      lat: number;
      lng: number;
    };
    accuracy: number;
    address: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    capturedAt: string;
    verificationStatus: "pending" | "verified" | "rejected";
    verifiedAt?: string;
    verifiedBy?: string;
    rejectionReason?: string;
  };
}

export type AdminMapUserType = "caregiver" | "careseeker";

export interface AdminMapRecord {
  recordId: string;
  userId: string;
  bookingId: string | null;
  sessionId: string | null;
  eventType: "submit" | "service_start" | "service_ping" | "service_end";
  source: string;
  accuracy: number | null;
  coordinates: {
    lat: number;
    lng: number;
  };
  capturedAt: string;
}

export interface AdminMapParticipant {
  userId: string;
  userType: AdminMapUserType;
  fullName: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  isVerified: boolean;
  verificationStatus: "pending" | "verified" | "rejected" | string;
  rating: number | null;
  completionPercentage: number | null;
  serviceTypes: string[];
  profileImage: string | null;
  location: {
    source: string;
    coordinates: {
      lat: number;
      lng: number;
    };
    accuracy: number | null;
    capturedAt: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
  };
  lastRecord: AdminMapRecord | null;
}

export interface AdminMapSummary {
  totalUsers: number;
  caregivers: number;
  careSeekers: number;
  verifiedUsers: number;
  activeUsers: number;
  records: number;
}

export interface AdminMapLocationsResponse {
  caregivers: AdminMapParticipant[];
  careSeekers: AdminMapParticipant[];
  records: AdminMapRecord[];
  summary: AdminMapSummary;
}

interface AdminLoginResponse {
  user: AdminUser;
  accessToken: string;
  refreshToken: string;
}

function buildQueryString(params: Record<string, string | number | boolean | undefined>): string {
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      queryParams.append(key, String(value));
    }
  });
  const queryString = queryParams.toString();
  return queryString ? `?${queryString}` : "";
}

class AdminService {
  /**
   * Admin login
   */
  async login(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const response = await apiClient.post<AdminLoginResponse>("/auth/admin/login", {
      email: normalizedEmail,
      password,
    });
    return response;
  }

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(): Promise<DashboardStats> {
    const response = await apiClient.get<DashboardStats>("/admin/dashboard/stats");
    return response.data as DashboardStats;
  }

  /**
   * Get live system metrics for control center cards/widgets
   */
  async getSystemStats(): Promise<AdminSystemStats> {
    const response = await apiClient.get<AdminSystemStats>("/admin/system-stats");
    return response.data as AdminSystemStats;
  }

  /**
   * Get recent activities
   */
  async getRecentActivities(limit = 20): Promise<Activity[]> {
    const response = await apiClient.get<{ activities: Activity[] }>(`/admin/activities?limit=${limit}`);
    return (response.data as { activities: Activity[] }).activities;
  }

  /**
   * Get all users with filters
   */
  async getUsers(params: {
    page?: number;
    limit?: number;
    role?: string;
    status?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }): Promise<{ users: AdminUser[]; pagination: PaginatedResponse<AdminUser>["pagination"] }> {
    const queryString = buildQueryString(params);
    const response = await apiClient.get<{ users: AdminUser[]; pagination: PaginatedResponse<AdminUser>["pagination"] }>(`/admin/users${queryString}`);
    return response.data as { users: AdminUser[]; pagination: PaginatedResponse<AdminUser>["pagination"] };
  }

  /**
   * Get user details by ID
   */
  async getUserDetails(userId: string): Promise<{ user: AdminUser; documents: AdminDocument[] }> {
    const response = await apiClient.get<{ user: AdminUser; documents: AdminDocument[] }>(`/admin/users/${userId}`);
    return response.data as { user: AdminUser; documents: AdminDocument[] };
  }

  /**
   * Update user status
   */
  async updateUserStatus(userId: string, status: string): Promise<AdminUser> {
    const response = await apiClient.patch<{ user: AdminUser }>(`/admin/users/${userId}/status`, { status });
    return (response.data as { user: AdminUser }).user;
  }

  /**
   * Update user role
   */
  async updateUserRole(userId: string, role: string): Promise<AdminUser> {
    const response = await apiClient.patch<{ user: AdminUser }>(`/admin/users/${userId}/role`, { role });
    return (response.data as { user: AdminUser }).user;
  }

  /**
   * Get all documents with filters
   */
  async getDocuments(params: {
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }): Promise<{ documents: AdminDocument[]; pagination: PaginatedResponse<AdminDocument>["pagination"] }> {
    const queryString = buildQueryString(params);
    const response = await apiClient.get<{ documents: AdminDocument[]; pagination: PaginatedResponse<AdminDocument>["pagination"] }>(`/admin/documents${queryString}`);
    return response.data as { documents: AdminDocument[]; pagination: PaginatedResponse<AdminDocument>["pagination"] };
  }

  /**
   * Verify a document
   */
  async verifyDocument(documentId: string): Promise<AdminDocument> {
    const response = await apiClient.patch<{ document: AdminDocument }>(`/admin/documents/${documentId}/verify`);
    return (response.data as { document: AdminDocument }).document;
  }

  /**
   * Reject a document
   */
  async rejectDocument(documentId: string, reason?: string): Promise<AdminDocument> {
    const response = await apiClient.patch<{ document: AdminDocument }>(`/admin/documents/${documentId}/reject`, { reason });
    return (response.data as { document: AdminDocument }).document;
  }

  /**
   * Approve a user (pending_approval -> active)
   */
  async approveUser(userId: string): Promise<AdminUser> {
    const response = await apiClient.post<{ user: AdminUser }>(`/admin/users/${userId}/approve`);
    return (response.data as { user: AdminUser }).user;
  }

  /**
   * Suspend a user and terminate all sessions
   */
  async suspendUser(userId: string, reason?: string): Promise<AdminUser> {
    const response = await apiClient.post<{ user: AdminUser }>(`/admin/users/${userId}/suspend`, { reason });
    return (response.data as { user: AdminUser }).user;
  }

  /**
   * Reject a user application
   */
  async rejectUser(userId: string, reason?: string): Promise<AdminUser> {
    const response = await apiClient.post<{ user: AdminUser }>(`/admin/users/${userId}/reject`, { reason });
    return (response.data as { user: AdminUser }).user;
  }

  /**
   * Delete a user permanently
   * Note: sendEmail parameter is not currently supported by the delete endpoint
   */
  async deleteUser(userId: string): Promise<void> {
    await apiClient.delete(`/admin/users/${userId}`);
  }

  /**
   * Get pending approval users
   */
  async getPendingApprovalUsers(params: {
    page?: number;
    limit?: number;
  } = {}): Promise<{ users: AdminUser[]; pagination: PaginatedResponse<AdminUser>["pagination"] }> {
    const queryString = buildQueryString(params);
    const response = await apiClient.get<{ users: AdminUser[]; pagination: PaginatedResponse<AdminUser>["pagination"] }>(`/admin/users/pending-approval${queryString}`);
    return response.data as { users: AdminUser[]; pagination: PaginatedResponse<AdminUser>["pagination"] };
  }

  /**
   * Get all caregivers with profiles
   */
  async getCaregivers(params: {
    page?: number;
    limit?: number;
    status?: string;
    verified?: boolean;
    featured?: boolean;
    search?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  } = {}): Promise<{ caregivers: AdminUser[]; pagination: PaginatedResponse<AdminUser>["pagination"] }> {
    const queryString = buildQueryString(params as Record<string, string | number | undefined>);
    const response = await apiClient.get<{ caregivers: AdminUser[]; pagination: PaginatedResponse<AdminUser>["pagination"] }>(`/admin/caregivers${queryString}`);
    return response.data as { caregivers: AdminUser[]; pagination: PaginatedResponse<AdminUser>["pagination"] };
  }

  /**
   * Get all care seekers with profiles
   */
  async getCareSeekers(params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  } = {}): Promise<{ careSeekers: AdminUser[]; pagination: PaginatedResponse<AdminUser>["pagination"] }> {
    const queryString = buildQueryString(params);
    const response = await apiClient.get<{ careSeekers: AdminUser[]; pagination: PaginatedResponse<AdminUser>["pagination"] }>(`/admin/care-seekers${queryString}`);
    return response.data as { careSeekers: AdminUser[]; pagination: PaginatedResponse<AdminUser>["pagination"] };
  }

  /**
   * Get combined map locations and recent location records
   */
  async getMapLocations(params: {
    verifiedOnly?: boolean;
    includeInactive?: boolean;
    limitPerRole?: number;
    recordsLimit?: number;
  } = {}): Promise<AdminMapLocationsResponse> {
    const queryString = buildQueryString(params);
    const response = await apiClient.get<AdminMapLocationsResponse>(`/admin/map/locations${queryString}`);
    return response.data as AdminMapLocationsResponse;
  }

  /**
   * Toggle caregiver featured status
   */
  async toggleCaregiverFeatured(userId: string, featured: boolean, featuredUntil?: string): Promise<void> {
    await apiClient.patch(`/admin/caregivers/${userId}/featured`, { featured, featuredUntil });
  }

  /**
   * Update caregiver background check
   */
  async updateBackgroundCheck(userId: string, status: string, notes?: string): Promise<void> {
    await apiClient.patch(`/admin/caregivers/${userId}/background-check`, { status, notes });
  }

  /**
   * Verify caregiver profile
   */
  async verifyCaregiverProfile(userId: string, verified: boolean): Promise<void> {
    await apiClient.patch(`/admin/caregivers/${userId}/verify`, { verified });
  }

  // ==================== LOCATION PROOF MANAGEMENT ====================

  /**
   * Get location proofs for verification
   */
  async getLocationProofs(params: {
    page?: number;
    limit?: number;
    status?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  } = {}): Promise<{ locationProofs: AdminLocationProof[]; pagination: PaginatedResponse<AdminLocationProof>["pagination"] }> {
    const queryString = buildQueryString(params);
    const response = await apiClient.get<{ locationProofs: AdminLocationProof[]; pagination: PaginatedResponse<AdminLocationProof>["pagination"] }>(`/admin/location-proofs${queryString}`);
    return response.data as { locationProofs: AdminLocationProof[]; pagination: PaginatedResponse<AdminLocationProof>["pagination"] };
  }

  /**
   * Verify location proof
   */
  async verifyLocationProof(userId: string): Promise<AdminLocationProof> {
    const response = await apiClient.patch<AdminLocationProof>(`/admin/location-proofs/${userId}/verify`);
    return response.data as AdminLocationProof;
  }

  /**
   * Reject location proof
   */
  async rejectLocationProof(userId: string, reason?: string): Promise<AdminLocationProof> {
    const response = await apiClient.patch<AdminLocationProof>(`/admin/location-proofs/${userId}/reject`, { reason });
    return response.data as AdminLocationProof;
  }

  // ==================== GENERIC REQUEST METHOD ====================

  /**
   * Generic request method for any admin API endpoint
   */
  async request<T>(endpoint: string, options?: { method?: string; body?: unknown }): Promise<ApiResponse<T>> {
    const method = options?.method?.toUpperCase() || 'GET';
    
    switch (method) {
      case 'POST':
        return apiClient.post<T>(endpoint, options?.body);
      case 'PUT':
        return apiClient.put<T>(endpoint, options?.body);
      case 'PATCH':
        return apiClient.patch<T>(endpoint, options?.body);
      case 'DELETE':
        return apiClient.delete<T>(endpoint);
      default:
        return apiClient.get<T>(endpoint);
    }
  }

  // ==================== DASHBOARD ANALYTICS ====================

  /**
   * Get enriched dashboard analytics (real data: proof of work, locations,
   * caregiver visitors, top pages, top referrers)
   */
  async getAnalytics(): Promise<AdminAnalytics> {
    const response = await apiClient.get<AdminAnalytics>("/admin/dashboard/analytics");
    return response.data as AdminAnalytics;
  }

  /**
   * Get full analytics bundle (time-series data for charts)
   */
  async getFullAnalytics(days = 30): Promise<FullAnalytics> {
    const response = await apiClient.get<FullAnalytics>(`/admin/analytics/full`, { params: { days } });
    return response.data as FullAnalytics;
  }

  /**
   * Get analytics overview stats
   */
  async getAnalyticsOverview(): Promise<AnalyticsOverview> {
    const response = await apiClient.get<AnalyticsOverview>("/admin/analytics/overview");
    return response.data as AnalyticsOverview;
  }

  // ==================== BOOKING MANAGEMENT ====================

  /**
   * Get all bookings with filters (admin)
   */
  async getBookings(params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<ApiResponse<{
    bookings: AdminBooking[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }>> {
    const queryString = buildQueryString(params || {});
    return apiClient.get(`/admin/bookings${queryString}`);
  }

  /**
   * Get booking statistics (admin)
   */
  async getBookingStats(): Promise<ApiResponse<{
    total: number;
    pending: number;
    confirmed: number;
    in_progress: number;
    completed: number;
    cancelled: number;
    disputed: number;
  }>> {
    return apiClient.get('/admin/bookings/stats');
  }

  /**
   * Get single booking details (admin)
   */
  async getBookingDetails(bookingId: string): Promise<ApiResponse<AdminBooking>> {
    return apiClient.get(`/admin/bookings/${bookingId}`);
  }

  /**
   * Resolve booking dispute (admin)
   */
  async resolveDispute(bookingId: string, resolution: {
    decision: 'refund_full' | 'refund_partial' | 'no_refund' | 'other';
    notes: string;
    refundAmount?: number;
  }): Promise<ApiResponse<AdminBooking>> {
    return apiClient.post(`/admin/bookings/${bookingId}/resolve-dispute`, resolution);
  }

  /**
   * Cancel booking (admin override)
   */
  async cancelBooking(bookingId: string, reason: string): Promise<ApiResponse<AdminBooking>> {
    return apiClient.post(`/admin/bookings/${bookingId}/cancel`, { reason });
  }

  // ==================== USER ACTIVITY TRACKING ====================

  /**
   * Get activity timeline with pagination and filters
   */
  async getActivityTimeline(params: {
    page?: number;
    limit?: number;
    category?: string;
    action?: string;
    userRole?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  } = {}): Promise<ActivityTimelineResponse> {
    const queryString = buildQueryString(params);
    const response = await apiClient.get<ActivityTimelineResponse>(`/admin/activities/timeline${queryString}`);
    return response.data as ActivityTimelineResponse;
  }

  /**
   * Get activity statistics by category
   */
  async getActivityStats(days: number = 30): Promise<ActivityStats> {
    const response = await apiClient.get<ActivityStats>(`/admin/activities/stats?days=${days}`);
    return response.data as ActivityStats;
  }

  /**
   * Get login analytics
   */
  async getLoginAnalytics(days: number = 30): Promise<LoginAnalytics> {
    const response = await apiClient.get<LoginAnalytics>(`/admin/activities/logins?days=${days}`);
    return response.data as LoginAnalytics;
  }

  /**
   * Get user engagement metrics
   */
  async getUserEngagement(days: number = 30): Promise<UserEngagement> {
    const response = await apiClient.get<UserEngagement>(`/admin/activities/engagement?days=${days}`);
    return response.data as UserEngagement;
  }

  /**
   * Get platform activity stats
   */
  async getPlatformActivityStats(days: number = 7): Promise<PlatformActivityStats> {
    const response = await apiClient.get<PlatformActivityStats>(`/admin/activities/platform?days=${days}`);
    return response.data as PlatformActivityStats;
  }

  /**
   * Get activity summary for a specific user
   */
  async getUserActivitySummary(userId: string, days: number = 30): Promise<UserActivitySummary[]> {
    const response = await apiClient.get<UserActivitySummary[]>(`/admin/activities/user/${userId}?days=${days}`);
    return response.data as UserActivitySummary[];
  }
}

// Admin Booking interface
export interface AdminBooking {
  _id: string;
  bookingNumber: string;
  careSeekerId: {
    _id: string;
    fullName: string;
    email: string;
    avatar?: string;
  };
  caregiverId: {
    _id: string;
    fullName: string;
    email: string;
    avatar?: string;
  };
  status: string;
  bookingType: string;
  durationType: string;
  serviceType?: string;
  serviceTypes?: string[];
  schedule: {
    startDate: string;
    endDate: string;
  };
  pricing: {
    hourlyRate?: number;
    totalHours?: number;
    subtotal?: number;
    platformFee?: number;
    totalAmount: number;
    total?: number;
  };
  dispute?: {
    raisedBy: string;
    reason: string;
    raisedAt?: string;
    status?: string;
    description?: string;
    resolution?: {
      resolvedBy: string;
      decision: string;
      notes: string;
      resolvedAt: string;
    };
  };
  createdAt: string;
  updatedAt?: string;
}

export const adminService = new AdminService();

// ============================================
// ADMIN CHAT MONITORING API  
// ============================================

export async function getAdminConversations(params: {
  page?: number;
  limit?: number;
  status?: string;
  hasReports?: boolean;
} = {}) {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.set("page", String(params.page));
  if (params.limit) queryParams.set("limit", String(params.limit));
  if (params.status) queryParams.set("status", params.status);
  if (params.hasReports) queryParams.set("hasReports", "true");
  const qs = queryParams.toString();
  return apiClient.get(`/chat/admin/conversations${qs ? `?${qs}` : ""}`);
}

export async function getAdminReportedMessages(params: {
  page?: number;
  limit?: number;
} = {}) {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.set("page", String(params.page));
  if (params.limit) queryParams.set("limit", String(params.limit));
  const qs = queryParams.toString();
  return apiClient.get(`/chat/admin/reports${qs ? `?${qs}` : ""}`);
}

export async function updateReportStatus(
  messageId: string,
  status: string,
  notes?: string
) {
  return apiClient.patch(`/chat/admin/reports/${messageId}`, { status, notes });
}

// Get conversation messages for admin viewer
export async function getConversationMessages(
  conversationId: string,
  params: { page?: number; limit?: number } = {}
) {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.append("page", params.page.toString());
  if (params.limit) queryParams.append("limit", params.limit.toString());

  const query = queryParams.toString();
  return apiClient.get(`/chat/admin/conversations/${conversationId}/messages${query ? `?${query}` : ""}`);
}

// Admin force unlock chat
export async function adminForceUnlockChat(conversationId: string, reason: string) {
  return apiClient.post(`/chat/admin/conversations/${conversationId}/force-unlock`, { reason });
}

// Admin restrict chat
export async function adminRestrictChat(conversationId: string, reason: string) {
  return apiClient.post(`/chat/admin/conversations/${conversationId}/restrict`, { reason });
}

// Get admin chat stats
export async function getAdminChatStats() {
  return apiClient.get("/chat/admin/stats");
}

export default adminService;
