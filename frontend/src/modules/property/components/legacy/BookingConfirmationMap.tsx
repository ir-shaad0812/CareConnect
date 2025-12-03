/**
 * Booking Confirmation Map
 * Static map displaying service location with navigation option
 * Used in booking confirmation and detail pages
 */

'use client';

import { useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { BaseMap } from './BaseMap';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { BookingLocation } from '@/types/map.types';
import { openGoogleMapsNavigation } from '@/lib/map-utils';
import { MapPin, Navigation } from 'lucide-react';
import { cn } from '@/lib/utils';
import type L from 'leaflet';

export interface BookingConfirmationMapProps {
  /** Service location details */
  location: BookingLocation;
  /** Additional className */
  className?: string;
  /** Show navigation button */
  showNavigation?: boolean;
}

export function BookingConfirmationMap({
  location,
  className,
  showNavigation = true,
}: BookingConfirmationMapProps) {
  const leafletRef = useRef<typeof L | null>(null);

  const handleMapReady = useCallback(
    async (map: L.Map) => {
      // Dynamically import Leaflet
      if (!leafletRef.current) {
        leafletRef.current = (await import('leaflet')).default;
      }
      const L = leafletRef.current;

      // Create custom icon inline
      const size = 50;
      const iconHtml = `
        <div style="
          width: ${size}px;
          height: ${size}px;
          background: #4461F2;
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

      L.marker([location.latitude, location.longitude], { icon })
        .addTo(map)
        .bindPopup(
          `
          <div style="padding: 8px;">
            <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">
              Service Location
            </div>
            <div style="font-size: 13px; color: #6B7280;">
              ${location.address}
            </div>
          </div>
        `,
          { closeButton: false }
        )
        .openPopup();
    },
    [location]
  );

  const handleGetDirections = () => {
    openGoogleMapsNavigation({
      latitude: location.latitude,
      longitude: location.longitude,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn('space-y-3', className)}
    >
      <Card>
        <CardContent className="p-4">
          {/* Map */}
          <BaseMap
            center={{
              latitude: location.latitude,
              longitude: location.longitude,
            }}
            zoom={15}
            height="h-[300px]"
            interactive={false}
            zoomControl={false}
            onMapReady={handleMapReady}
            className="rounded-lg mb-4"
          />

          {/* Address Details */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-neutral-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-neutral-900">{location.address}</p>
                <div className="flex items-center gap-2 mt-1 text-sm text-neutral-600">
                  <span>{location.city}</span>
                  {location.postalCode && (
                    <>
                      <span>•</span>
                      <span>{location.postalCode}</span>
                    </>
                  )}
                </div>
                {location.landmark && (
                  <p className="mt-1 text-sm text-neutral-500">Near {location.landmark}</p>
                )}
              </div>
            </div>

            {/* Navigation Button */}
            {showNavigation && (
              <Button
                variant="outline"
                size="md"
                onClick={handleGetDirections}
                className="w-full"
              >
                <Navigation className="w-4 h-4 mr-2" />
                Get Directions
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
