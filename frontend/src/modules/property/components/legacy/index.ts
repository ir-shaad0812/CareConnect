/**
 * Maps components barrel export
 * Using client-side wrappers to prevent SSR issues with Leaflet
 */

// Export static constants directly (safe for SSR)
export { roleColors } from './mapConstants';

// Export client components via dynamic wrappers
export { BaseMap, createCustomIcon, type BaseMapProps } from './BaseMapClient';
export { CaregiverDiscoveryMap, type CaregiverDiscoveryMapProps } from './CaregiverDiscoveryMapClient';
export { PremiumCaregiverDiscoveryMap } from './PremiumCaregiverDiscoveryMapClient';
export { AdminDashboardMap, type AdminDashboardMapProps } from './AdminDashboardMapClient';
export { BookingConfirmationMap, type BookingConfirmationMapProps } from './BookingConfirmationMapClient';
export { ServiceAreaSelector, type ServiceAreaSelectorProps } from './ServiceAreaSelectorClient';
export { DecorativeMap, type DecorativeMapProps } from './DecorativeMapClient';
export { NavigationButton, type NavigationButtonProps } from './NavigationButton';
