// ============================================
// UI COMPONENTS BARREL EXPORT
// ============================================

export { Button } from "./Button";
export { Input } from "./Input";
export { LineChart, BarChart, DonutChart, StatCard, ProgressBar } from "./Chart";
export { NotificationBell } from "./NotificationBell";
export { ImageSwiper } from "./ImageSwiper";
export type { CardData } from "./ImageSwiper";
export { default as Newsletter } from "./Newsletter";
export { ImageCarouselSection, careConnectCards } from "./ImageCarouselSection";
export { Calendar } from "./Calendar";
export type { CalendarEvent } from "./Calendar";
export { default as LocationMap } from "@/modules/property/components/LocationMap";
export { FloatingChatButton } from "./FloatingChatButton";
export { BackToTop } from "./BackToTop";
export { QAChatWidget } from "@/modules/chat/components/QAChatWidget";
export type { QAPair } from "@/modules/chat/components/QAChatWidget";
export { UnifiedChatWidget } from "@/modules/chat/components/UnifiedChatWidget";

// Dashboard Widgets
export {
  CircularProgressStat,
  UpcomingBookingCard,
  BookingHistoryTable,
  InvoiceTable,
  LiveActivityFeed,
  SpendingChart,
  CaregiverDistribution,
} from "./DashboardWidgets";

export type {
  UpcomingBooking,
  BookingHistoryItem,
  Invoice,
  ActivityItem,
} from "./DashboardWidgets";

// Journey Stepper Components
export {
  JourneyStepper,
  VerticalJourneyStepper,
  ResponsiveJourneyStepper,
} from "./JourneyStepper";

export type {
  JourneyStep,
  JourneyStepperProps,
} from "./JourneyStepper";

// Scatter Testimonials
export {
  ScatterTestimonials,
  RatingBreakdown,
  TrustIndicators,
  ReviewFilterTabs,
  FeedbackInfoPanel,
} from "./ScatterTestimonials";

export type { Testimonial } from "./ScatterTestimonials";

// Discovery Call Button
export {
  DiscoveryCallButton,
  DiscoveryCallButtonGlow,
  DiscoveryCallButtonMinimal,
  FloatingDiscoveryButton,
} from "./DiscoveryCallButton";

export type { DiscoveryCallButtonProps } from "./DiscoveryCallButton";

// Timetable Calendar
export {
  TimetableCalendar,
  MobileTimetable,
  TimetableTrustSignals,
} from "./TimetableCalendar";

export type {
  TimetableEvent,
  TimetableCalendarProps,
  EventStatus,
} from "./TimetableCalendar";

// Caregiver Navigation Map
export { CaregiverNavigationMapV2 } from "@/modules/property/components/CaregiverNavigationMapV2";

export type {
  CareSeekerLocation,
  BookingDetails,
  CaregiverNavigationMapProps,
} from "@/modules/property/components/CaregiverNavigationMapV2";

// Activity Timeline
export {
  ActivityTimeline,
  generateSampleActivities,
} from "./ActivityTimeline";

export type {
  Activity,
  ActivityType,
  ActivityGroup,
  ActivityTimelineProps,
} from "./ActivityTimeline";

// Care Calendar
export {
  CareCalendar,
  generateSampleCareEvents,
} from "./CareCalendar";

export type {
  CareEvent,
  CareEventType,
  CareCalendarProps,
} from "./CareCalendar";

// Add more UI component exports here
// export { Card } from "./Card";
// export { Modal } from "./Modal";
// export { Spinner } from "./Spinner";
// export { Avatar } from "./Avatar";
