"use client";

import { useEffect, useRef } from "react";

interface LocationProofMapProps {
  lat: number;
  lng: number;
  address: string;
  accuracy?: number;
}

export default function LocationProofMap({
  lat,
  lng,
  address,
  accuracy,
}: LocationProofMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Clean up previous map instance
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const initMap = async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      // Fix default marker icon issue in Next.js
      delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      // Create custom marker icon
      const customIcon = L.divIcon({
        className: "custom-marker",
        html: `
          <div style="
            width: 40px;
            height: 40px;
            position: relative;
            transform: translate(-50%, -100%);
          ">
            <svg viewBox="0 0 40 52" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 0C8.954 0 0 8.954 0 20c0 14 20 32 20 32s20-18 20-32C40 8.954 31.046 0 20 0z" fill="#10B981"/>
              <circle cx="20" cy="18" r="8" fill="white"/>
            </svg>
          </div>
        `,
        iconSize: [40, 52],
        iconAnchor: [20, 52],
      });

      // Initialize map
      const map = L.map(mapRef.current!, {
        center: [lat, lng],
        zoom: 16,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      // Add tile layer (OpenStreetMap)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Add marker
      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);

      // Add popup with address
      marker.bindPopup(
        `
        <div style="min-width: 200px;">
          <strong style="display: block; margin-bottom: 4px;">Captured Location</strong>
          <p style="margin: 0; color: #666; font-size: 12px; line-height: 1.4;">${address}</p>
          ${
            accuracy
              ? `<p style="margin: 4px 0 0; color: #888; font-size: 11px;">Accuracy: ±${Math.round(accuracy)}m</p>`
              : ""
          }
        </div>
      `,
        { maxWidth: 300 }
      );

      // Add accuracy circle if available
      if (accuracy && accuracy > 0) {
        L.circle([lat, lng], {
          radius: accuracy,
          color: "#10B981",
          fillColor: "#10B981",
          fillOpacity: 0.1,
          weight: 2,
        }).addTo(map);
      }

      mapInstanceRef.current = map;
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [lat, lng, address, accuracy]);

  return (
    <div className="relative">
      <div
        ref={mapRef}
        className="w-full h-[300px] rounded-xl overflow-hidden border border-gray-200"
      />

      {/* Coordinates overlay */}
      <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-md">
        <div className="flex items-center gap-3 text-xs">
          <span className="text-gray-500">
            <strong className="text-gray-700">Lat:</strong> {lat.toFixed(6)}
          </span>
          <span className="text-gray-500">
            <strong className="text-gray-700">Lng:</strong> {lng.toFixed(6)}
          </span>
        </div>
      </div>

      {/* Open in Google Maps button */}
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-md text-xs font-medium text-gray-700 hover:bg-white transition-colors flex items-center gap-1.5"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
        Open in Maps
      </a>
    </div>
  );
}
