/**
 * Caregiver Service Area Selector
 * Allows caregivers to set their service radius
 * Displays circular overlay on map
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { BaseMap } from './BaseMap';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Slider } from '@/components/ui/Slider';
import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import type L from 'leaflet';

export interface ServiceAreaSelectorProps {
  /** Caregiver's base location */
  baseLocation: { latitude: number; longitude: number };
  /** Initial service radius in km */
  initialRadius?: number;
  /** Callback when radius changes */
  onRadiusChange?: (radius: number) => void;
  /** Additional className */
  className?: string;
}

export function ServiceAreaSelector({
  baseLocation,
  initialRadius = 10,
  onRadiusChange,
  className,
}: ServiceAreaSelectorProps) {
  const [radius, setRadius] = useState(initialRadius);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [serviceCircle, setServiceCircle] = useState<L.Circle | null>(null);
  const leafletRef = useRef<typeof L | null>(null);

  const handleMapReady = useCallback(
    async (map: L.Map) => {
      // Dynamically import Leaflet
      if (!leafletRef.current) {
        leafletRef.current = (await import('leaflet')).default;
      }
      const L = leafletRef.current;
      
      setMapInstance(map);

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

      const newMarker = L.marker([baseLocation.latitude, baseLocation.longitude], {
        icon,
      })
        .addTo(map)
        .bindPopup('<strong>Your Base Location</strong>', { closeButton: false })
        .openPopup();

      void newMarker;

      // Add initial service circle
      const circle = L.circle([baseLocation.latitude, baseLocation.longitude], {
        radius: radius * 1000, // Convert km to meters
        color: '#4461F2',
        fillColor: '#4461F2',
        fillOpacity: 0.15,
        weight: 2,
      }).addTo(map);

      setServiceCircle(circle);

      // Fit bounds to circle
      map.fitBounds(circle.getBounds(), { padding: [50, 50] });
    },
    [baseLocation, radius]
  );

  // Update circle when radius changes
  useEffect(() => {
    if (!mapInstance || !serviceCircle) return;

    try {
      serviceCircle.setRadius(radius * 1000);
      const bounds = serviceCircle.getBounds();
      if (bounds) {
        mapInstance.fitBounds(bounds, { padding: [50, 50] });
      }
    } catch {
      // Circle may not be attached to map yet during re-renders
    }
  }, [radius, mapInstance, serviceCircle]);

  const handleRadiusChange = (newRadius: number) => {
    setRadius(newRadius);
    onRadiusChange?.(newRadius);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn('space-y-4', className)}
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Set Your Service Area</CardTitle>
          <p className="text-sm text-neutral-500 mt-1">
            Define how far you're willing to travel for care services
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Radius Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-neutral-700">Service Radius</label>
              <span className="text-2xl font-bold text-blue-600">{radius} km</span>
            </div>
            <Slider
              min={1}
              max={50}
              step={1}
              value={radius}
              onValueChange={handleRadiusChange}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-neutral-500">
              <span>1 km</span>
              <span>50 km</span>
            </div>
          </div>

          {/* Map */}
          <BaseMap
            center={baseLocation}
            zoom={12}
            height="h-[400px]"
            onMapReady={handleMapReady}
            className="rounded-lg"
          />

          {/* Info Card */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="flex-1 text-sm">
                <p className="font-medium text-blue-900">Coverage Area</p>
                <p className="text-blue-700 mt-1">
                  You'll be visible to care seekers within {radius} km of your base location.
                  Larger radius means more opportunities but longer travel times.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
