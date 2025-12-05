// ============================================
// SERVICES BARREL EXPORT
// ============================================

export { apiClient } from "./api/client";
export { authService } from "./api/auth.service";
export { documentService } from "./api/document.service";
export { 
  caregiverService,
  SERVICE_TYPES,
  WORK_PREFERENCES,
  BACKGROUND_CHECK_STATUSES,
} from "./api/caregiver.service";
export { adminService } from "./api/admin.service";

// Type exports
export type { Document, DocumentType, DocumentStatus } from "./api/document.service";
export type {
  DashboardStats,
  AdminSystemStats,
  AdminUser,
  AdminDocument,
  Activity,
  AdminLocationProof,
  AdminAnalytics,
  AnalyticsProofOfWork,
  AnalyticsCaregiverVisitor,
  AnalyticsLocation,
  AnalyticsTopPage,
  AnalyticsReferrer,
} from "./api/admin.service";
export type {
  Caregiver,
  CaregiversResponse,
  CaregiverFilters,
  CaregiverStats,
  AdminCaregiverFilters,
  BackgroundCheckUpdate,
  ProfileUpdateData,
} from "./api/caregiver.service";

// Booking and Notification services
export { bookingService } from "./api/booking.service";
export { notificationService } from "./api/notification.service";

// Booking type exports
export type {
  Booking,
  BookingStatus,
  BookingType,
  DurationType,
  ServiceType,
  PaymentStatus,
  CareRecipient,
  BookingSchedule,
  BookingLocation,
  BookingPricing,
  CareReport,
  CreateBookingData,
  BookingFilters,
  BookingListResponse,
  BookingStatsResponse,
} from "./api/booking.service";

// Notification type exports
export type {
  Notification,
  NotificationType,
  NotificationPreferences,
  NotificationFilters,
  NotificationListResponse,
} from "./api/notification.service";

// User service
export { userService } from "./api/user.service";
export type {
  CompleteProfileData,
  AvailabilityData,
  RatesData,
} from "./api/user.service";

// Chat service
export { chatService } from "./api/chat.service";
export type {
  Conversation,
  Message,
  SendMessagePayload,
} from "./api/chat.service";

// Search service
export { searchService } from "./api/search.service";
export type {
  SearchFilters,
  SearchResponse,
  CaregiverPreview,
} from "./api/search.service";

// Payment service
export { paymentService } from "./api/payment.service";
export type {
  Transaction,
  TransactionType,
  TransactionStatus,
  TransactionFilters,
  TransactionListResponse,
  EarningsDashboard,
  EarningsOverview,
  MonthlyBreakdown,
  TransactionStats,
  InvoiceData,
  StripeConfig,
} from "./api/payment.service";

// Review service
export { reviewService } from "./api/review.service";
export type {
  Review,
  ReviewType,
  ReviewStatus,
  ReviewRatings,
  ReviewFilters,
  ReviewListResponse,
  ReviewStats,
  AverageRatings,
  ReviewableBooking,
  CreateVerifiedReviewData,
  ReportReason,
  ModerationAction,
} from "./api/review.service";

// Feedback service
export { feedbackService } from "./api/feedback.service";
export type {
  FeedbackType,
  FeedbackStatus,
  FeedbackRecord,
  CreateFeedbackData,
  FeedbackFilters,
  FeedbackListResponse,
  AdminFeedbackListResponse,
} from "./api/feedback.service";

// Location service
export { default as locationApiService } from "./api/location.service";
export type {
  LocationSuggestion,
  ReverseGeocodeResult,
  ServiceLocationPayload,
  ServiceSessionResponse,
  ServiceTimelinePoint,
  ServiceTimelineResponse,
} from "./api/location.service";

// AI Match service
export { aiMatchService } from "./api/aiMatch.service";

// Job service
export { jobService } from "./api/job.service";
export type {
  Job,
  JobApplication,
  CareRequest,
  JobDashboardStats,
  HiringFunnel,
  PaginatedResponse as JobPaginatedResponse,
} from "./api/job.service";

// Video / Call service
export { videoService } from "./api/video.service";
export type {
  WebRTCConfig,
  WebRTCConfig as VideoConfig,
  CallInitResponse,
  CallInitResponse as VideoTokenResponse,
  CallDetailsResponse,
} from "./api/video.service";
