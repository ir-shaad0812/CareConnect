/**
 * Landing Page Decorative Map
 * Non-interactive map for visual storytelling
 * Abstract caregiver locations with animations
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type L from 'leaflet';

export interface DecorativeMapProps {
  /** Height of the map */
  height?: string;
  /** Additional className */
  className?: string;
}

export function DecorativeMap({ height = 'h-[600px]', className }: DecorativeMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initMap = async () => {
      const leaflet = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');

      if (!mapContainerRef.current) return;

      // Center on a generic location
      const center: [number, number] = [27.7172, 85.324];

      // Initialize map with limited interaction
      const map = leaflet.map(mapContainerRef.current, {
        center,
        zoom: 12,
        zoomControl: false,
        dragging: false,
        touchZoom: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        attributionControl: false,
      });

      // Add tile layer with reduced opacity
      leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        opacity: 0.4,
      }).addTo(map);

      // Add floating caregiver markers with animation
      const caregiverPoints = [
        [27.7172, 85.324],
        [27.7089, 85.3206],
        [27.7103, 85.3123],
        [27.7215, 85.3341],
        [27.7052, 85.3162],
        [27.7135, 85.3285],
        [27.7198, 85.3157],
        [27.7065, 85.3298],
      ];

      caregiverPoints.forEach((point, index) => {
        setTimeout(() => {
          const icon = leaflet.divIcon({
            html: `
              <div class="animate-pulse" style="
                width: 30px;
                height: 30px;
                background: linear-gradient(135deg, #4461F2 0%, #8B54F7 100%);
                border-radius: 50%;
                border: 3px solid white;
                box-shadow: 0 8px 16px rgba(68, 97, 242, 0.3);
                animation: float 3s ease-in-out infinite;
                animation-delay: ${index * 0.2}s;
              "></div>
            `,
            className: 'decorative-marker',
            iconSize: [30, 30],
            iconAnchor: [15, 15],
          });

          leaflet.marker(point as [number, number], { icon }).addTo(map);
        }, index * 100);
      });

      mapInstanceRef.current = map;
      setIsLoaded(true);
    };

    initMap();

    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
      className={cn('relative w-full rounded-2xl overflow-hidden', height, className)}
    >
      <div ref={mapContainerRef} className="w-full h-full" />
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-linear-to-t from-white/90 via-white/50 to-transparent pointer-events-none" />
      
      {/* Floating Badge */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10"
      >
        <div className="bg-white/95 backdrop-blur-sm px-6 py-3 rounded-full shadow-xl border border-neutral-200">
          <p className="text-sm font-semibold text-neutral-900">
            🌍 <span className="text-blue-600">500+</span> Caregivers Near You
          </p>
        </div>
      </motion.div>

      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }
      `}</style>
    </motion.div>
  );
}
