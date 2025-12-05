// ============================================
// DASHBOARD SERVICE - Real-time analytics API
// ============================================

import { apiClient } from "./client";

export interface EarningsDataPoint {
  month: string;
  earnings: number;
  bookings: number;
}

export interface ServiceDistribution {
  type: string;
  count: number;
  percentage?: number;
  color: string;
}

export interface WeeklyActivity {
  day: string;
  hours: number;
}

export interface ActivityItem {
  _id: string;
  type: string;
  title: string;
  message: string;
  time: string;
  isRead: boolean;
  data?: Record<string, unknown>;
}

export interface ConversationPreview {
  _id: string;
  participant: {
    _id: string;
    fullName?: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
    role: string;
  };
  lastMessage: {
    content: string;
    createdAt: string;
    sender: string;
  } | null;
  unreadCount: number;
  updatedAt: string;
}

export interface DashboardJob {
  _id: string;
  title: string;
  description: string;
  budget: { min: number; max: number; type: string };
  location: { city: string; state: string };
  serviceType: string;
  schedule: { type: string; startDate?: string };
  postedBy: {
    _id: string;
    fullName?: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
  };
  status: string;
  createdAt: string;
  requirements?: string[];
  tags?: string[];
}

export interface CaregiverDashboardStats {
  totalBookings: number;
  activeBookings: number;
  completedBookings: number;
  completionRate: number;
  totalEarnings: number;
  pendingPayments: number;
  totalReviews: number;
  avgRating: number;
}

export interface CareseekerDashboardStats {
  totalBookings: number;
  activeBookings: number;
  completedBookings: number;
  totalSpent: number;
  pendingPayments: number;
}

export interface SpendingDataPoint {
  month: string;
  spending: number;
  bookings: number;
}

const dashboardService = {
  // ============================================
  // CAREGIVER ENDPOINTS
  // ============================================

  getCaregiverEarnings: () =>
    apiClient.get<{ earnings: EarningsDataPoint[] }>(
      "/dashboard/caregiver/earnings",
    ),

  getCaregiverBookingsByType: () =>
    apiClient.get<{ distribution: ServiceDistribution[] }>(
      "/dashboard/caregiver/bookings-by-type",
    ),

  getCaregiverWeeklyActivity: () =>
    apiClient.get<{ activity: WeeklyActivity[] }>(
      "/dashboard/caregiver/weekly-activity",
    ),

  getCaregiverRecentActivity: (limit?: number) =>
    limit
      ? apiClient.get<{ activities: ActivityItem[] }>(
          "/dashboard/caregiver/recent-activity",
          { params: { limit } },
        )
      : apiClient.get<{ activities: ActivityItem[] }>(
          "/dashboard/caregiver/recent-activity",
        ),

  getCaregiverConversations: (limit?: number) =>
    limit
      ? apiClient.get<{ conversations: ConversationPreview[] }>(
          "/dashboard/caregiver/conversations",
          { params: { limit } },
        )
      : apiClient.get<{ conversations: ConversationPreview[] }>(
          "/dashboard/caregiver/conversations",
        ),

  getCaregiverAvailableJobs: (limit?: number) =>
    limit
      ? apiClient.get<{ jobs: DashboardJob[] }>(
          "/dashboard/caregiver/available-jobs",
          { params: { limit } },
        )
      : apiClient.get<{ jobs: DashboardJob[] }>(
          "/dashboard/caregiver/available-jobs",
        ),

  getCaregiverStats: () =>
    apiClient.get<{ stats: CaregiverDashboardStats }>(
      "/dashboard/caregiver/stats",
    ),

  // ============================================
  // CARESEEKER ENDPOINTS
  // ============================================

  getCareseekerSpending: (timeRange?: string) =>
    timeRange
      ? apiClient.get<{ spending: SpendingDataPoint[] }>(
          "/dashboard/careseeker/spending",
          { params: { timeRange } },
        )
      : apiClient.get<{ spending: SpendingDataPoint[] }>(
          "/dashboard/careseeker/spending",
        ),

  getCareseekerServiceDistribution: () =>
    apiClient.get<{ distribution: ServiceDistribution[] }>(
      "/dashboard/careseeker/service-distribution",
    ),

  getCareseekerRecentActivity: (limit?: number) =>
    limit
      ? apiClient.get<{ activities: ActivityItem[] }>(
          "/dashboard/careseeker/recent-activity",
          { params: { limit } },
        )
      : apiClient.get<{ activities: ActivityItem[] }>(
          "/dashboard/careseeker/recent-activity",
        ),

  getCareseekerStats: () =>
    apiClient.get<{ stats: CareseekerDashboardStats }>(
      "/dashboard/careseeker/stats",
    ),
};

export default dashboardService;
