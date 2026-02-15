// ============================================
// HOOKS BARREL EXPORT
// ============================================

export { useAuth } from "./useAuth";
export { useDebounce } from "./useDebounce";
export { useAISearch } from "./useAISearch";
export * from "./useSocket";
export { useRealtimeBooking, useRealtimeDashboard } from "./useRealtimeBooking";
export { useCaregiverSlots, useBookedSlots, slotKeys } from "./useSlots";
export type {
  CaregiverAvailabilityDay,
  CaregiverSlotsResponse,
  BookedSlot,
  BookedSlotsResponse,
} from "./useSlots";
export type {
  UseRealtimeBookingOptions,
  UseRealtimeBookingReturn,
  UseRealtimeDashboardOptions,
  UseRealtimeDashboardReturn,
  LastEvent,
} from "./useRealtimeBooking";
