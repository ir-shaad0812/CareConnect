import { API_CONFIG } from "@/lib/constants";
import { apiClient } from "./client";

export interface LocationSuggestion {
  displayName: string;
  lat: number;
  lng: number;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  placeId: string;
}

export interface ReverseGeocodeResult {
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}

export interface ServiceLocationPayload {
  coordinates: {
    lat: number;
    lng: number;
  };
  accuracy?: number;
  sessionId?: string;
  capturedAt?: string;
  source?: "gps" | "manual" | "system";
  notes?: string;
}

export interface ServiceSessionResponse {
  bookingId: string;
  sessionId: string;
  status?: string;
  checkIn?: unknown;
  checkOut?: unknown;
  completedAt?: string;
  acceptedAt?: string;
}

export interface ServiceTimelinePoint {
  eventType: "service_start" | "service_ping" | "service_end";
  gpsCoordinates?: { lat: number; lng: number };
  gpsAccuracy?: number;
  capturedAt: string;
  sessionId: string;
  sessionPhase: "start" | "live" | "end";
  bookingStatusSnapshot?: string;
  source?: "gps" | "manual" | "system";
  notes?: string;
  userId: string;
}

export interface ServiceTimelineResponse {
  bookingId: string;
  sessionId: string | null;
  points: ServiceTimelinePoint[];
}

class LocationApiService {
  async searchAddress(query: string): Promise<LocationSuggestion[]> {
    const params = new URLSearchParams({ q: query, limit: "8" });
    const response = await fetch(`${API_CONFIG.BASE_URL}/location/search?${params.toString()}`);
    const body = await response.json();

    if (!response.ok) {
      throw new Error(body?.message || "Failed to search location");
    }

    return (body?.data?.suggestions || []).map((item: Record<string, unknown>) => ({
      displayName: String(item.displayName || ""),
      lat: Number(item.lat),
      lng: Number(item.lng),
      city: (item.city as string | null) || null,
      state: (item.state as string | null) || null,
      country: (item.country as string | null) || null,
      postalCode: (item.postalCode as string | null) || null,
      placeId: String(item.placeId || ""),
    }));
  }

  async reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult> {
    const params = new URLSearchParams({ lat: String(lat), lng: String(lng) });
    const response = await fetch(`${API_CONFIG.BASE_URL}/location/reverse?${params.toString()}`);
    const body = await response.json();

    if (!response.ok) {
      throw new Error(body?.message || "Failed to reverse geocode");
    }

    return body?.data || {
      address: `${lat}, ${lng}`,
      city: "",
      state: "",
      country: "",
      postalCode: "",
    };
  }

  async startServiceSession(bookingId: string, payload: ServiceLocationPayload): Promise<ServiceSessionResponse> {
    const response = await apiClient.post<ServiceSessionResponse>(`/location/service/${bookingId}/start`, payload);
    if (!response.data) {
      throw new Error("Failed to start service session");
    }
    return response.data;
  }

  async trackServiceLocation(bookingId: string, payload: ServiceLocationPayload): Promise<ServiceSessionResponse> {
    const response = await apiClient.post<ServiceSessionResponse>(`/location/service/${bookingId}/ping`, payload);
    if (!response.data) {
      throw new Error("Failed to track service location");
    }
    return response.data;
  }

  async endServiceSession(bookingId: string, payload: ServiceLocationPayload): Promise<ServiceSessionResponse> {
    const response = await apiClient.post<ServiceSessionResponse>(`/location/service/${bookingId}/end`, payload);
    if (!response.data) {
      throw new Error("Failed to end service session");
    }
    return response.data;
  }

  async getServiceTimeline(bookingId: string, sessionId?: string): Promise<ServiceTimelineResponse> {
    const response = sessionId
      ? await apiClient.get<ServiceTimelineResponse>(`/location/service/${bookingId}/timeline`, {
        params: { sessionId },
      })
      : await apiClient.get<ServiceTimelineResponse>(`/location/service/${bookingId}/timeline`);

    if (!response.data) {
      throw new Error("Failed to load service timeline");
    }
    return response.data;
  }
}

const locationApiService = new LocationApiService();

export default locationApiService;
