/**
 * PremiumCaregiverDiscoveryMap Client-Side Wrapper
 * Dynamically imports map component only on the client
 */

'use client';

import dynamic from 'next/dynamic';

export const PremiumCaregiverDiscoveryMap = dynamic(
  () => import('./PremiumCaregiverDiscoveryMap').then((mod) => mod.PremiumCaregiverDiscoveryMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[600px] bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading premium map...</p>
        </div>
      </div>
    ),
  }
);
