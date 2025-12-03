// ============================================
// USE GEOLOCATION HOOK
// Browser geolocation with status tracking
// ============================================

'use client';

import { useState, useCallback } from 'react';
import type { Coordinates } from '../types';

type GeolocationStatus = 'idle' | 'loading' | 'success' | 'error';

interface GeolocationState {
  coordinates: Coordinates | null;
  accuracy: number | null;
  status: GeolocationStatus;
  error: string | null;
}

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

interface UseGeolocationReturn extends GeolocationState {
  getCurrentPosition: () => void;
  clearPosition: () => void;
}

const defaultOptions: UseGeolocationOptions = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 0,
};

export function useGeolocation(options: UseGeolocationOptions = {}): UseGeolocationReturn {
  const [state, setState] = useState<GeolocationState>({
    coordinates: null,
    accuracy: null,
    status: 'idle',
    error: null,
  });

  const mergedOptions = { ...defaultOptions, ...options };

  const getCurrentPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: 'Geolocation is not supported by your browser',
      }));
      return;
    }

    setState((prev) => ({ ...prev, status: 'loading', error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          coordinates: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
          accuracy: position.coords.accuracy,
          status: 'success',
          error: null,
        });
      },
      (error) => {
        let errorMessage = 'Unable to get your location';

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied. Please enable location access.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
        }

        setState((prev) => ({
          ...prev,
          status: 'error',
          error: errorMessage,
        }));
      },
      mergedOptions
    );
  }, [mergedOptions]);

  const clearPosition = useCallback(() => {
    setState({
      coordinates: null,
      accuracy: null,
      status: 'idle',
      error: null,
    });
  }, []);

  return {
    ...state,
    getCurrentPosition,
    clearPosition,
  };
}
