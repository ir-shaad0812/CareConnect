"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useQueryClient } from "@tanstack/react-query";
import { authService } from "@/modules/auth/services";
import { useAuthContext } from "@/context/AuthContext";
import {
  useCaregiverProfile,
  useCaregiverDashboardStats,
  useCaregiverActionCenter,
} from "@/hooks/useDashboardData";
import { useRealtimeDashboard } from "@/hooks/useRealtimeBooking";
import {
  CaregiverSidebar,
  CaregiverTopBar,
  StatsCards,
  WelcomeBanner,
  ProfileCard,
  VerificationWidget,
  TodayTasksWidget,
  PendingActionsWidget,
  RatingBreakdown,
  QuickActions,
  NoticesWidget,
  NotesWidget,
  BookingStatusWidget,
  RealTimeIndicator,
} from "./components";

// Dynamic imports for heavy components — loaded after initial paint
const DashboardCharts = dynamic(() => import("./components/DashboardCharts"), {
  loading: () => <div className="h-80 bg-white rounded-2xl animate-pulse" />,
});
const JobListings = dynamic(() => import("./components/JobListings"), {
  loading: () => <div className="h-60 bg-white rounded-2xl animate-pulse" />,
});
const MessagingPanel = dynamic(() => import("./components/MessagingPanel"), {
  loading: () => <div className="h-60 bg-white rounded-2xl animate-pulse" />,
});
const RecentActivity = dynamic(() => import("./components/RecentActivity"), {
  loading: () => <div className="h-60 bg-white rounded-2xl animate-pulse" />,
});

interface DashboardStats {
  profileViews: number;
  rating: number;
  totalReviews: number;
  completionPercentage: number;
  earnings: {
    total: number;
    pending: number;
    withdrawn: number;
  };
  ratingBreakdown: {
    punctuality: number;
    professionalism: number;
    communication: number;
    qualityOfCare: number;
    valueForMoney: number;
  };
  featured: boolean;
  backgroundCheck: {
    status: string;
  };
}

interface UserProfile {
  _id: string;
  fullName: string;
  email: string;
  avatar?: string;
  role: string;
  hourlyRate?: number;
  dailyRate?: number;
  experience?: number;
  serviceTypes?: string[];
  completionPercentage?: number;
  isEmailVerified?: boolean;
}

export default function CaregiverDashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user: authUser, isLoading: isAuthLoading } = useAuthContext();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [lastEventType, setLastEventType] = useState<string | undefined>(
    undefined,
  );

  // DashboardRouteGuard validates role/status/verification before rendering this page.
  const cachedUser = authService.getCurrentUser();

  // React Query: fetch profile & stats in background (cached, deduped)
  const { data: profileData, error: profileError } = useCaregiverProfile();

  const { data: statsData } = useCaregiverDashboardStats();
  const { data: actionCenterData } = useCaregiverActionCenter();

  // ── Real-time dashboard sync ──────────────────────────────────────────────
  const { connected: realtimeConnected } = useRealtimeDashboard({
    onBookingCreated: (payload) => {
      setLastEventType("booking:created");
      void queryClient.invalidateQueries({ queryKey: ["caregiver"] });
      console.info("[RT] BOOKING_CREATED", payload);
    },
    onBookingAccepted: (payload) => {
      setLastEventType("booking:accepted");
      void queryClient.invalidateQueries({ queryKey: ["caregiver"] });
      console.info("[RT] BOOKING_ACCEPTED", payload);
    },
    onTrackingFlagged: (payload) => {
      setLastEventType("tracking:flagged");
      void queryClient.invalidateQueries({ queryKey: ["caregiver"] });
      console.info("[RT] TRACKING_FLAGGED", payload);
    },
    onDisputeCreated: (payload) => {
      setLastEventType("dispute:created");
      void queryClient.invalidateQueries({ queryKey: ["caregiver"] });
      console.info("[RT] DISPUTE_CREATED", payload);
    },
    onStatsUpdated: () => {
      setLastEventType("system:stats_updated");
      void queryClient.invalidateQueries({
        queryKey: ["caregiver", "dashboardStats"],
      });
    },
    onNotification: () => {
      setLastEventType("notification:created");
      void queryClient.invalidateQueries({ queryKey: ["caregiver"] });
    },
  });

  // Use fetched data if available, otherwise use cached user for instant render
  const user = profileData
    ? (profileData as unknown as UserProfile)
    : authUser
      ? (authUser as unknown as UserProfile)
      : cachedUser
        ? (cachedUser as unknown as UserProfile)
        : null;
  const stats = statsData ? (statsData as unknown as DashboardStats) : null;

  const handleLogout = async () => {
    await authService.logout();
    router.push("/home");
  };

  if (isAuthLoading || !user) {
    return null;
  }

  if (profileError) {
    const err = profileError as { statusCode?: number; message?: string };
    if (err.statusCode === 401) {
      void authService.logout();
      authService.clearAuthData();
      router.replace("/login?redirect=/dashboard/caregiver");
      return null;
    }

    if (err.statusCode === 403) {
      router.replace("/dashboard/pending");
      return null;
    }
    return (
      <div className="min-h-screen bg-[#FAFBFC] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">
            {err.message || "Failed to load dashboard"}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 bg-[#39B54A] text-white rounded-xl text-sm font-medium hover:bg-primary-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      {/* Sidebar */}
      <CaregiverSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        user={user}
        onLogout={handleLogout}
      />

      {/* Main wrapper with left margin for sidebar */}
      <div
        className={`transition-all duration-300 ${
          sidebarCollapsed ? "ml-0 md:ml-18" : "ml-0 md:ml-65"
        }`}
      >
        {/* Top Bar */}
        <CaregiverTopBar user={user} />

        {/* Main Content */}
        <main>
          <div className="max-w-350 mx-auto px-6 py-6 space-y-6">
            {/* Welcome Banner */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <WelcomeBanner
                  userName={user?.fullName ?? ""}
                  completionPercentage={stats?.completionPercentage || 0}
                />
              </div>
              {/* Real-time connection indicator */}
              <div className="mt-1 shrink-0">
                <RealTimeIndicator
                  connected={realtimeConnected}
                  {...(lastEventType ? { lastEventType } : {})}
                />
              </div>
            </div>

            {/* Stats Cards */}
            <StatsCards actionMetrics={actionCenterData?.metrics ?? null} />

            {/* Main Grid: Content + Sidebar Widgets */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              {/* Left Content - 8 cols */}
              <div className="xl:col-span-8 space-y-6">
                {/* Charts */}
                <DashboardCharts />

                {/* Job Listings */}
                <JobListings />

                {/* Messaging Panel */}
                <MessagingPanel />

                {/* Recent Activity */}
                <RecentActivity />
              </div>

              {/* Right Sidebar Widgets - 4 cols */}
              <div className="xl:col-span-4 space-y-5">
                {/* Profile Card */}
                <ProfileCard
                  user={user}
                  stats={stats}
                  realtimeConnected={realtimeConnected}
                />

                {/* Verification Status */}
                <VerificationWidget stats={stats} />

                {/* Booking Status — real-time aware */}
                <BookingStatusWidget
                  bookings={actionCenterData?.bookings ?? []}
                  isLoading={!actionCenterData}
                />

                {/* Action Center Widgets */}
                <TodayTasksWidget items={actionCenterData?.todayTasks ?? []} />
                <PendingActionsWidget
                  items={actionCenterData?.pendingActions ?? []}
                />

                {/* Quick Actions */}
                <QuickActions />

                {/* Notice Board */}
                <NoticesWidget />

                {/* My Notes */}
                <NotesWidget />

                {/* Performance Ratings */}
                <RatingBreakdown stats={stats} />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
