/**
 * BaseMap Client-Side Wrapper
 * Dynamically imports Leaflet only on the client to avoid SSR issues
 */

'use client';

import dynamic from 'next/dynamic';
import type { BaseMapProps } from './BaseMap';

// Dynamic import with SSR disabled
export const BaseMap = dynamic(
  () => import('./BaseMap').then((mod) => mod.BaseMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[500px] bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    ),
  }
);

// Re-export roleColors from mapConstants (safe for SSR - no Leaflet dependency)
export { roleColors } from './mapConstants';

// Export createCustomIcon - this is async and dynamically imports Leaflet
export const createCustomIcon = async (options: {
  color?: string;
  isActive?: boolean;
  size?: number;
}) => {
  const { createCustomIcon: originalCreateCustomIcon } = await import('./BaseMap');
  return originalCreateCustomIcon(options);
};

export type { BaseMapProps };
