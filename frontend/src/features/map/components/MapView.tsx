'use client';

import { useEffect, useRef } from 'react';
import type { Coordinates } from '../types';
import { MAP_CONFIG } from '../types';

interface MapViewProps {
  center: Coordinates;
  zoom?: number;
  marker?: Coordinates;
  className?: string;
}

export function MapView({ center, zoom = MAP_CONFIG.DEFAULT_ZOOM, marker, className }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);
  const markerRef = useRef<unknown>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) {
      return;
    }

    const initMap = async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');

      delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      const map = L.map(mapRef.current!, {
        center: [center.lat, center.lng],
        zoom,
        zoomControl: true,
      });

      L.tileLayer(MAP_CONFIG.TILE_URL, {
        attribution: MAP_CONFIG.TILE_ATTRIBUTION,
        maxZoom: MAP_CONFIG.MAX_ZOOM,
      }).addTo(map);

      if (marker) {
        markerRef.current = L.marker([marker.lat, marker.lng]).addTo(map);
      }

      mapInstanceRef.current = map;
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        try {
          const map = mapInstanceRef.current as any;
          if (map && typeof map.remove === 'function') {
            map.remove();
          }
        } catch (error) {
          console.error('Error removing map instance:', error);
        }
      }
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, [center.lat, center.lng, marker, zoom]);

  useEffect(() => {
    const map = mapInstanceRef.current as {
      setView: (centerValue: [number, number], zoomValue?: number) => void;
    } | null;
    const mapMarker = markerRef.current as {
      setLatLng: (position: [number, number]) => void;
    } | null;

    if (map) {
      map.setView([center.lat, center.lng], zoom);
    }

    if (marker && mapMarker) {
      mapMarker.setLatLng([marker.lat, marker.lng]);
    }
  }, [center.lat, center.lng, marker, zoom]);

  return (
    <div
      ref={mapRef}
      className={className || 'h-full w-full min-h-65 overflow-hidden rounded-lg'}
    />
  );
}
