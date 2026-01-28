"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import {
  MapPin,
  Crosshair,
  Loader2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Navigation,
  ShieldCheck,
} from "lucide-react";
import LocationAutocomplete from "@/components/features/location/LocationAutocomplete";
import locationApiService, {
  type LocationSuggestion,
} from "@/modules/property/services";

const DEFAULT_CENTER = { lat: 27.7172, lng: 85.3240 }; // Kathmandu, Nepal
const DEFAULT_ZOOM = 13;
const VERIFIED_DISTANCE_KM = 3;

export interface LocationData {
  locationName?: string;
  placeId?: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  selectedCoordinates?: {
    lat: number;
    lng: number;
  };
  gpsCoordinates?: {
    lat: number;
    lng: number;
  };
  distanceKm?: number;
  gpsVerified?: boolean;
  trustScore?: number;
  accuracy: number;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  capturedAt: string;
}

interface LocationPickerProps {
  onLocationSelect: (location: LocationData | null) => void;
  initialLocation?: LocationData | null;
  className?: string;
}

interface MapComponentProps {
  center: { lat: number; lng: number };
  markerPosition: { lat: number; lng: number };
  onMarkerDrag: (lat: number, lng: number) => void;
  onMapClick: (lat: number, lng: number) => void;
}

type LeafletContainerElement = HTMLDivElement & { _leaflet_id?: number };

const haversineDistanceKm = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
};

function MapComponent({
  center,
  markerPosition,
  onMarkerDrag,
  onMapClick,
}: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);
  const markerRef = useRef<unknown>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const onMarkerDragRef = useRef(onMarkerDrag);
  const onMapClickRef = useRef(onMapClick);

  useEffect(() => {
    onMarkerDragRef.current = onMarkerDrag;
  }, [onMarkerDrag]);

  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    let disposed = false;
    const container = mapRef.current as LeafletContainerElement;

    const initMap = async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      if (disposed) return;

      delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

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
              <path d="M20 0C8.954 0 0 8.954 0 20c0 14 20 32 20 32s20-18 20-32C40 8.954 31.046 0 20 0z" fill="#1D4ED8"/>
              <circle cx="20" cy="18" r="8" fill="white"/>
            </svg>
          </div>
        `,
        iconSize: [40, 52],
        iconAnchor: [20, 52],
      });

      // Leaflet stores instance metadata on the container element. Reset it for
      // StrictMode/HMR remounts to avoid "Map container is already initialized".
      if (container._leaflet_id) {
        delete container._leaflet_id;
      }
      container.innerHTML = "";

      const map = L.map(container, {
        center: [center.lat, center.lng],
        zoom: DEFAULT_ZOOM,
        zoomControl: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      L.control.zoom({ position: "topright" }).addTo(map);

      const marker = L.marker([markerPosition.lat, markerPosition.lng], {
        draggable: true,
        icon: customIcon,
      }).addTo(map);

      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        onMarkerDragRef.current(pos.lat, pos.lng);
      });

      map.on("click", (e: { latlng: { lat: number; lng: number } }) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        onMapClickRef.current(lat, lng);
      });

      if (disposed) {
        map.off();
        map.remove();
        return;
      }

      mapInstanceRef.current = map;
      markerRef.current = marker;
      setIsMapReady(true);
    };

    void initMap();

    return () => {
      disposed = true;
      const map = mapInstanceRef.current as { remove: () => void } | null;
      if (map) {
        const mapWithOff = map as { off?: () => void; remove: () => void };
        mapWithOff.off?.();
        map.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }

      container.innerHTML = "";
      if (container._leaflet_id) {
        delete container._leaflet_id;
      }
      setIsMapReady(false);
    };
  }, []);

  useEffect(() => {
    const marker = markerRef.current as { setLatLng: (latLng: [number, number]) => void } | null;
    if (marker && isMapReady) {
      marker.setLatLng([markerPosition.lat, markerPosition.lng]);
    }
  }, [markerPosition.lat, markerPosition.lng, isMapReady]);

  useEffect(() => {
    const map = mapInstanceRef.current as {
      setView: (centerValue: [number, number], zoom: number) => void;
    } | null;

    if (map && isMapReady) {
      map.setView([center.lat, center.lng], DEFAULT_ZOOM);
    }
  }, [center.lat, center.lng, isMapReady]);

  return (
    <div
      ref={mapRef}
      className="h-full w-full overflow-hidden rounded-xl"
      style={{ minHeight: "300px" }}
    />
  );
}

export default function LocationPicker({
  onLocationSelect,
  initialLocation,
  className = "",
}: LocationPickerProps) {
  const [status, setStatus] = useState<
    "idle" | "locating" | "geocoding" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [center, setCenter] = useState(
    initialLocation?.coordinates || DEFAULT_CENTER
  );
  const [markerPosition, setMarkerPosition] = useState(
    initialLocation?.coordinates || DEFAULT_CENTER
  );
  const [locationData, setLocationData] = useState<LocationData | null>(
    initialLocation || null
  );
  const [accuracy, setAccuracy] = useState<number>(initialLocation?.accuracy || 0);
  const [selectedCoordinates, setSelectedCoordinates] = useState<
    { lat: number; lng: number } | undefined
  >(initialLocation?.selectedCoordinates || initialLocation?.coordinates);
  const [gpsCoordinates, setGpsCoordinates] = useState<
    { lat: number; lng: number } | undefined
  >(initialLocation?.gpsCoordinates);

  const buildAndEmitLocation = useCallback(
    async (
      selected: { lat: number; lng: number },
      meta?: { locationName?: string; placeId?: string }
    ) => {
      setStatus("geocoding");

      const geocoded = await locationApiService.reverseGeocode(selected.lat, selected.lng);
      const distanceKm =
        gpsCoordinates && selected
          ? haversineDistanceKm(
              selected.lat,
              selected.lng,
              gpsCoordinates.lat,
              gpsCoordinates.lng
            )
          : undefined;
      const gpsVerified =
        typeof distanceKm === "number" ? distanceKm <= VERIFIED_DISTANCE_KM : false;

      const trustScore =
        20 +
        (gpsVerified ? 40 : 0) +
        (accuracy > 0 && accuracy <= 100 ? 10 : 0);

      const newLocationData: LocationData = {
        ...(meta?.locationName ? { locationName: meta.locationName } : {}),
        ...(meta?.placeId ? { placeId: meta.placeId } : {}),
        coordinates: selected,
        selectedCoordinates: selected,
        ...(gpsCoordinates ? { gpsCoordinates } : {}),
        ...(typeof distanceKm === "number" ? { distanceKm } : {}),
        gpsVerified,
        trustScore,
        accuracy,
        address: geocoded.address,
        city: geocoded.city,
        state: geocoded.state,
        country: geocoded.country,
        postalCode: geocoded.postalCode,
        capturedAt: new Date().toISOString(),
      };

      setLocationData(newLocationData);
      onLocationSelect(newLocationData);
      setStatus("success");
    },
    [accuracy, gpsCoordinates, onLocationSelect]
  );

  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setErrorMessage("Geolocation is not supported by your browser");
      setStatus("error");
      return;
    }

    setStatus("locating");
    setErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy: rawAccuracy } = position.coords;
        const gpsPoint = { lat: latitude, lng: longitude };

        setAccuracy(rawAccuracy);
        setGpsCoordinates(gpsPoint);

        const finalSelected = selectedCoordinates || gpsPoint;
        setCenter(finalSelected);
        setMarkerPosition(finalSelected);

        await buildAndEmitLocation(finalSelected);
      },
      (error) => {
        let message = "Unable to get your location";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message =
              "Location permission denied. Please enable location access in your browser settings.";
            break;
          case error.POSITION_UNAVAILABLE:
            message = "Location information is unavailable. Please try again.";
            break;
          case error.TIMEOUT:
            message = "Location request timed out. Please try again.";
            break;
        }
        setErrorMessage(message);
        setStatus("error");
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  }, [buildAndEmitLocation, selectedCoordinates]);

  const handlePositionChange = useCallback(
    async (lat: number, lng: number) => {
      const selected = { lat, lng };
      setSelectedCoordinates(selected);
      setMarkerPosition(selected);
      setCenter(selected);
      await buildAndEmitLocation(selected);
    },
    [buildAndEmitLocation]
  );

  const handleAutocompleteSelect = useCallback(
    async (suggestion: LocationSuggestion) => {
      const selected = { lat: suggestion.lat, lng: suggestion.lng };
      setSelectedCoordinates(selected);
      setCenter(selected);
      setMarkerPosition(selected);

      await buildAndEmitLocation(selected, {
        locationName: suggestion.displayName,
        placeId: suggestion.placeId,
      });
    },
    [buildAndEmitLocation]
  );

  const clearLocation = useCallback(() => {
    setLocationData(null);
    setMarkerPosition(DEFAULT_CENTER);
    setCenter(DEFAULT_CENTER);
    setStatus("idle");
    setAccuracy(0);
    setSelectedCoordinates(undefined);
    setGpsCoordinates(undefined);
    onLocationSelect(null);
  }, [onLocationSelect]);

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="rounded-2xl border border-slate-200 bg-linear-to-br from-slate-50 via-white to-blue-50 p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
              <MapPin className="h-5 w-5 text-blue-700" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Location Authenticity Check</h3>
              <p className="text-xs text-slate-500">
                Search your address, then confirm with live GPS for higher trust
              </p>
            </div>
          </div>

          <motion.button
            type="button"
            onClick={getCurrentLocation}
            disabled={status === "locating" || status === "geocoding"}
            whileTap={{ scale: 0.96 }}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              status === "locating" || status === "geocoding"
                ? "cursor-not-allowed bg-slate-100 text-slate-400"
                : "bg-blue-600 text-white shadow-md shadow-blue-600/30 hover:bg-blue-700"
            }`}
          >
            {status === "locating" || status === "geocoding" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {status === "locating" ? "Locating..." : "Resolving..."}
              </>
            ) : (
              <>
                <Crosshair className="h-4 w-4" />
                Use Current GPS
              </>
            )}
          </motion.button>
        </div>

        <div className="mt-4 space-y-1">
          <p className="text-xs font-medium text-slate-600">Search and pick your address</p>
          <LocationAutocomplete onSelect={handleAutocompleteSelect} />
        </div>
      </div>

      {status === "error" && errorMessage && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <div className="flex-1">
            <p className="text-sm text-red-600">{errorMessage}</p>
            <button
              type="button"
              onClick={getCurrentLocation}
              className="mt-1 text-xs text-red-600 underline"
            >
              Try again
            </button>
          </div>
        </motion.div>
      )}

      <div className="relative overflow-hidden rounded-xl border-2 border-slate-200 bg-slate-100">
        <div className="h-75">
          <MapComponent
            center={center}
            markerPosition={markerPosition}
            onMarkerDrag={handlePositionChange}
            onMapClick={handlePositionChange}
          />
        </div>

        {status === "idle" && !locationData && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/45">
            <div className="px-6 text-center text-white">
              <Navigation className="mx-auto mb-3 h-12 w-12 opacity-80" />
              <p className="text-sm font-medium">Search address or select directly on map</p>
              <p className="mt-1 text-xs opacity-80">Then tap Use Current GPS for strong verification</p>
            </div>
          </div>
        )}

        {(status === "locating" || status === "geocoding") && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80">
            <div className="text-center">
              <Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin text-blue-600" />
              <p className="text-sm text-slate-600">
                {status === "locating" ? "Getting GPS location..." : "Fetching formatted address..."}
              </p>
            </div>
          </div>
        )}
      </div>

      {locationData && status === "success" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 text-emerald-700">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm font-semibold">Location Captured</span>
            </div>
            <button
              type="button"
              onClick={clearLocation}
              className="text-xs text-slate-600 underline"
            >
              Clear
            </button>
          </div>

          <div className="rounded-lg border border-emerald-100 bg-white p-3">
            <p className="text-sm font-medium leading-relaxed text-slate-800">
              {locationData.address}
            </p>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
              <span>Lat: {locationData.coordinates.lat.toFixed(6)}</span>
              <span>Lng: {locationData.coordinates.lng.toFixed(6)}</span>
              {locationData.accuracy > 0 && <span>GPS Accuracy: ±{Math.round(locationData.accuracy)}m</span>}
              {typeof locationData.distanceKm === "number" && (
                <span>GPS Distance: {locationData.distanceKm.toFixed(2)} km</span>
              )}
            </div>
          </div>

          {typeof locationData.distanceKm === "number" && (
            <div
              className={`flex items-center gap-2 rounded-lg border p-2 text-xs ${
                locationData.gpsVerified
                  ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                  : "border-amber-300 bg-amber-100 text-amber-800"
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              {locationData.gpsVerified
                ? "GPS and selected location match. Auto-verification confidence is high."
                : `GPS and selected location differ by over ${VERIFIED_DISTANCE_KM} km. Admin review will validate.`}
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-emerald-700">
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Drag marker or click map to fine-tune location anytime</span>
          </div>
        </motion.div>
      )}

      <div className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 p-3">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
        <p className="text-xs text-blue-700">
          Your location evidence is encrypted and used only for account trust and safety checks.
        </p>
      </div>
    </div>
  );
}

