/**
 * BaseMap Component
 * Reusable Leaflet map wrapper with production-grade configuration
 * Client-side only to avoid SSR/hydration issues
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import type { Coordinates } from '@/types/map.types';
import { cn } from '@/lib/utils';

// Import Leaflet types only (not the library itself)
import type L from 'leaflet';

export interface BaseMapProps {
  /** Initial center coordinates */
  center: Coordinates;
  /** Initial zoom level (1-18) */
  zoom?: number;
  /** Map height class name */
  height?: string;
  /** Additional className */
  className?: string;
  /** Disable all interactions */
  interactive?: boolean;
  /** Show zoom controls */
  zoomControl?: boolean;
  /** Callback when map is ready */
  onMapReady?: (map: L.Map) => void;
  /** Children render prop with map instance */
  children?: (map: L.Map | null) => React.ReactNode;
}

export function BaseMap({
  center,
  zoom = 13,
  height = 'h-[500px]',
  className,
  interactive = true,
  zoomControl = true,
  onMapReady,
  children,
}: BaseMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const isInitializingRef = useRef(false); // guard against StrictMode async double-init
  const isMountedRef = useRef(true);
  const [isMapReady, setIsMapReady] = useState(false);

  useEffect(() => {
    isMountedRef.current = true;

    // Guard: already initialized or currently initializing
    if (mapInstanceRef.current || isInitializingRef.current) return;
    // Guard: container must exist
    if (!mapContainerRef.current) return;
    // Guard: Leaflet marks an initialized container with _leaflet_id
    if ((mapContainerRef.current as HTMLElement & { _leaflet_id?: number })._leaflet_id) return;

    isInitializingRef.current = true;

    const initMap = async () => {
      const leaflet = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');

      // Bail out if unmounted during async load (StrictMode cleanup fired)
      if (!isMountedRef.current || !mapContainerRef.current) {
        isInitializingRef.current = false;
        return;
      }
      // Bail if container was already claimed by another Leaflet instance
      if ((mapContainerRef.current as HTMLElement & { _leaflet_id?: number })._leaflet_id) {
        isInitializingRef.current = false;
        return;
      }

      // Fix Leaflet default icon path issues
      delete (leaflet.Icon.Default.prototype as any)._getIconUrl;
      leaflet.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      const map = leaflet.map(mapContainerRef.current, {
        center: [center.latitude, center.longitude],
        zoom,
        zoomControl,
        dragging: interactive,
        touchZoom: interactive,
        scrollWheelZoom: interactive,
        doubleClickZoom: interactive,
        boxZoom: interactive,
        keyboard: interactive,
      });

      leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
      isInitializingRef.current = false;

      if (isMountedRef.current) {
        setIsMapReady(true);
        onMapReady?.(map);
      }
    };

    initMap().catch(() => { isInitializingRef.current = false; });

    return () => {
      isMountedRef.current = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      isInitializingRef.current = false;
      setIsMapReady(false);
    };
  }, [center.latitude, center.longitude, zoom, interactive, zoomControl, onMapReady]);

  return (
    <div className={cn('relative w-full rounded-lg overflow-hidden', height, className)}>
      <div ref={mapContainerRef} className="w-full h-full" />
      {isMapReady && children?.(mapInstanceRef.current)}
    </div>
  );
}

/**
 * Custom marker icon generator - must be called after Leaflet is loaded
 */
export async function createCustomIcon(options: {
  color?: string;
  isActive?: boolean;
  size?: number;
}): Promise<L.DivIcon> {
  const leaflet = (await import('leaflet')).default;
  const { color = '#4461F2', isActive = true, size = 40 } = options;

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

  return leaflet.divIcon({
    html: iconHtml,
    className: 'custom-marker-icon',
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
}

// Re-export roleColors from mapConstants for backwards compatibility
export { roleColors } from './mapConstants';
