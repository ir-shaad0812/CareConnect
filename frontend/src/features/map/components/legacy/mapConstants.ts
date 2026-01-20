/**
 * Map constants and utilities that don't depend on Leaflet
 * Safe to import from any context (SSR or client)
 */

/**
 * Role-based icon colors for map markers
 */
export const roleColors: Record<string, string> = {
  Nurse: '#EF4444',
  'Child Care': '#F59E0B',
  'Elder Care': '#8B5CF6',
  Physiotherapy: '#10B981',
  'Personal Care': '#3B82F6',
  'Disability Support': '#EC4899',
  'Mental Health Support': '#6366F1',
};

/**
 * Create custom icon HTML string for map markers
 * This function generates the HTML but does NOT create the Leaflet DivIcon
 */
export function createMarkerIconHtml(options: {
  color?: string;
  isActive?: boolean;
  size?: number;
}): string {
  const { color = '#4461F2', isActive = true, size = 40 } = options;

  return `
    <div style="
      width: ${size}px;
      height: ${size}px;
      background: ${isActive ? color : '#9CA3AF'};
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 3px solid white;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="
        transform: rotate(45deg);
        color: white;
        font-size: ${size * 0.5}px;
        font-weight: bold;
      ">📍</div>
    </div>
  `;
}
