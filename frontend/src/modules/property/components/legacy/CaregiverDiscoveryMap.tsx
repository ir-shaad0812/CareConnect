/**
 * Caregiver Discovery Map
 * Main map for care-seekers to find and filter caregivers by location
 * Production-grade implementation with clean architecture
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BaseMap } from './BaseMap';
import { roleColors } from './mapConstants';
import { Select } from '@/components/ui/Select';
import { Card, CardContent } from '@/components/ui/Card';
import type { CaregiverLocation, Coordinates } from '@/types/map.types';
import { getNearestCaregivers, formatDistance } from '@/lib/map-utils';
import { MapPin, Navigation, Star, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import type L from 'leaflet';

export interface CaregiverDiscoveryMapProps {
  /** Array of caregivers to display */
  caregivers: CaregiverLocation[];
  /** User's current location */
  userLocation: Coordinates;
  /** Initial radius filter in km */
  initialRadius?: number;
  /** Callback when caregiver is clicked */
  onCaregiverClick?: (caregiver: CaregiverLocation) => void;
  /** Additional className */
  className?: string;
}

const RADIUS_OPTIONS = [
  { value: 3, label: '3 km radius' },
  { value: 5, label: '5 km radius' },
  { value: 10, label: '10 km radius' },
  { value: 15, label: '15 km radius' },
  { value: 20, label: '20 km radius' },
  { value: 50, label: '50 km radius' },
];

export function CaregiverDiscoveryMap({
  caregivers,
  userLocation,
  initialRadius = 10,
  onCaregiverClick,
  className,
}: CaregiverDiscoveryMapProps) {
  const [selectedRadius, setSelectedRadius] = useState(initialRadius);
  const [filteredCaregivers, setFilteredCaregivers] = useState<
    Array<CaregiverLocation & { distance: number }>
  >([]);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const [radiusCircle, setRadiusCircle] = useState<L.Circle | null>(null);
  const leafletRef = useRef<typeof L | null>(null);

  // Filter caregivers when radius changes
  useEffect(() => {
    const filtered = getNearestCaregivers(
      caregivers,
      userLocation,
      selectedRadius,
      'km'
    );
    setFilteredCaregivers(filtered);
  }, [caregivers, userLocation, selectedRadius]);

  // Update markers when filtered caregivers change
  useEffect(() => {
    if (!mapInstance) return;

    const updateMarkers = async () => {
      // Dynamically import Leaflet
      if (!leafletRef.current) {
        leafletRef.current = (await import('leaflet')).default;
      }
      const L = leafletRef.current;
      
      // Initialize markers layer if needed
      if (!markersLayerRef.current) {
        markersLayerRef.current = L.layerGroup();
      }
      const markersLayer = markersLayerRef.current;

      // Clear existing markers
      markersLayer.clearLayers();

      // Add user location marker
      const userIcon = L.divIcon({
        html: `
          <div style="
            width: 24px;
            height: 24px;
            background: #4461F2;
            border-radius: 50%;
            border: 4px solid white;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
          "></div>
        `,
        className: 'user-location-marker',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      L.marker([userLocation.latitude, userLocation.longitude], { icon: userIcon })
        .bindPopup('<strong>Your Location</strong>')
        .addTo(markersLayer);

      // Add caregiver markers
      for (const caregiver of filteredCaregivers) {
        const color = roleColors[caregiver.role] || '#4461F2';
        const isActive = caregiver.isActive !== undefined ? caregiver.isActive : true;
        const size = 40;

        const iconHtml = `
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

        const icon = L.divIcon({
          html: iconHtml,
          className: 'custom-marker-icon',
          iconSize: [size, size],
          iconAnchor: [size / 2, size],
          popupAnchor: [0, -size],
        });

        const marker = L.marker([caregiver.latitude, caregiver.longitude], {
          icon,
        });

        // Create popup content
        const popupContent = createPopupContent(caregiver);
        marker.bindPopup(popupContent, {
          maxWidth: 280,
          className: 'custom-popup',
        });

        marker.on('click', () => {
          onCaregiverClick?.(caregiver);
        });

        marker.addTo(markersLayer);
      }

      markersLayer.addTo(mapInstance);

      // Update radius circle
      if (radiusCircle) {
        radiusCircle.remove();
      }

      const newCircle = L.circle([userLocation.latitude, userLocation.longitude], {
        radius: selectedRadius * 1000, // Convert km to meters
        color: '#4461F2',
        fillColor: '#4461F2',
        fillOpacity: 0.1,
        weight: 2,
        dashArray: '5, 10',
      }).addTo(mapInstance);

      setRadiusCircle(newCircle);

      // Fit bounds to show all markers
      if (filteredCaregivers.length > 0) {
        const bounds = L.latLngBounds([
          ...filteredCaregivers.map((c) => [c.latitude, c.longitude]),
          [userLocation.latitude, userLocation.longitude],
        ] as L.LatLngExpression[]);
        mapInstance.fitBounds(bounds, { padding: [50, 50] });
      }
    };

    updateMarkers();

    return () => {
      if (markersLayerRef.current) {
        markersLayerRef.current.clearLayers();
      }
      if (radiusCircle) {
        radiusCircle.remove();
      }
    };
  }, [mapInstance, filteredCaregivers, userLocation, selectedRadius, onCaregiverClick]);

  const handleMapReady = useCallback((map: L.Map) => {
    setMapInstance(map);
  }, []);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-neutral-600">
              <MapPin className="w-4 h-4" />
              <span className="font-medium">
                {filteredCaregivers.length} caregiver{filteredCaregivers.length !== 1 ? 's' : ''} found
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <label htmlFor="radius-select" className="text-sm font-medium text-neutral-700">
                Search Radius:
              </label>
              <Select
                id="radius-select"
                value={selectedRadius}
                onChange={(e) => setSelectedRadius(Number(e.target.value))}
                className="w-[140px]"
              >
                {RADIUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Map */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <BaseMap
          center={userLocation}
          zoom={13}
          height="h-[600px]"
          onMapReady={handleMapReady}
          className="shadow-md"
        />
      </motion.div>

      {/* Results List */}
      <AnimatePresence mode="wait">
        {filteredCaregivers.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            {filteredCaregivers.slice(0, 6).map((caregiver, index) => (
              <motion.div
                key={caregiver.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <CaregiverCard
                  caregiver={caregiver}
                  {...(onCaregiverClick !== undefined ? { onClick: onCaregiverClick } : {})}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Create popup content HTML
 */
function createPopupContent(
  caregiver: CaregiverLocation & { distance: number }
): string {
  return `
    <div style="padding: 8px;">
      <div style="font-weight: 600; font-size: 16px; margin-bottom: 4px; color: #1f2937;">
        ${caregiver.name}
      </div>
      <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 6px;">
        <span style="
          display: inline-block;
          padding: 2px 8px;
          background: ${roleColors[caregiver.role] || '#4461F2'};
          color: white;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
        ">${caregiver.role}</span>
      </div>
      ${caregiver.rating ? `
        <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 4px;">
          <span style="color: #F59E0B;">⭐</span>
          <span style="font-size: 14px; font-weight: 500;">${caregiver.rating}</span>
          ${caregiver.completedBookings ? `
            <span style="font-size: 12px; color: #6B7280;">(${caregiver.completedBookings} bookings)</span>
          ` : ''}
        </div>
      ` : ''}
      <div style="display: flex; align-items: center; gap: 4px; margin-top: 8px; padding-top: 8px; border-top: 1px solid #E5E7EB;">
        <span style="font-size: 14px; color: #4B5563;">📍 ${formatDistance(caregiver.distance, 'km', 1)} away</span>
      </div>
      ${caregiver.hourlyRate ? `
        <div style="margin-top: 4px; font-size: 14px; font-weight: 600; color: #4461F2;">
          Rs. ${caregiver.hourlyRate}/hr
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * Caregiver Card Component
 */
interface CaregiverCardProps {
  caregiver: CaregiverLocation & { distance: number };
  onClick?: (caregiver: CaregiverLocation) => void;
}

function CaregiverCard({ caregiver, onClick }: CaregiverCardProps) {
  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1"
      onClick={() => onClick?.(caregiver)}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          <div>
            <h3 className="font-semibold text-lg text-neutral-900">{caregiver.name}</h3>
            <span
              className="inline-block mt-1 px-2 py-1 text-xs font-medium text-white rounded"
              style={{ background: roleColors[caregiver.role] || '#4461F2' }}
            >
              {caregiver.role}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            {caregiver.rating && (
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <span className="font-medium">{caregiver.rating}</span>
                {caregiver.completedBookings && (
                  <span className="text-neutral-500">({caregiver.completedBookings})</span>
                )}
              </div>
            )}
            {caregiver.hourlyRate && (
              <div className="flex items-center gap-1 font-semibold text-neutral-900">
                <DollarSign className="w-4 h-4" />
                {caregiver.hourlyRate}/hr
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-neutral-100">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1 text-neutral-600">
                <Navigation className="w-4 h-4" />
                {formatDistance(caregiver.distance, 'km', 1)}
              </div>
              {caregiver.responseRate && (
                <div className="text-neutral-600">
                  Response: {caregiver.responseRate}%
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
