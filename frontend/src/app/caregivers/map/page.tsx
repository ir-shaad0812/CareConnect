/**
 * Caregiver Discovery Page
 * Implementation of the CaregiverDiscoveryMap component with real data
 */

'use client';

import { useState, useEffect } from 'react';
import { CaregiverDiscoveryMap } from '@/modules/property/components/legacy';
import type { CaregiverLocation } from '@/types/map.types';
import { Loader2, MapPin, AlertCircle } from 'lucide-react';

export default function CaregiverDiscoveryPage() {
  const [caregivers, setCaregivers] = useState<CaregiverLocation[]>([]);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setSelectedCaregiver] = useState<CaregiverLocation | null>(null);

  useEffect(() => {
    // Get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        () => {
          // Default to a central location if geolocation fails
          setUserLocation({ latitude: 40.7128, longitude: -74.0060 }); // NYC
        }
      );
    } else {
      setUserLocation({ latitude: 40.7128, longitude: -74.0060 }); // NYC
    }

    // Fetch caregivers from API
    const fetchCaregivers = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/caregivers/locations');
        if (!response.ok) throw new Error('Failed to fetch caregivers');
        const data = await response.json();
        if (data.success && data.caregivers) {
          setCaregivers(data.caregivers);
        }
      } catch (err) {
        console.error('Failed to fetch caregivers:', err);
        setError('Unable to load caregivers. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCaregivers();
  }, []);

  const handleCaregiverClick = (caregiver: CaregiverLocation) => {
    setSelectedCaregiver(caregiver);
    console.log('Selected caregiver:', caregiver);
  };

  if (isLoading || !userLocation) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-primary-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading caregivers near you...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Unable to Load Map</h2>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-neutral-900 mb-2">
            Find Caregivers Near You
          </h1>
          <p className="text-lg text-neutral-600">
            Discover qualified caregivers in your area with our interactive map
          </p>
        </div>

        {caregivers.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Caregivers Found</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              There are currently no caregivers with location data available. 
              Check back later or try expanding your search area.
            </p>
          </div>
        ) : (
          <CaregiverDiscoveryMap
            caregivers={caregivers}
            userLocation={userLocation}
            initialRadius={10}
            onCaregiverClick={handleCaregiverClick}
          />
        )}
      </div>
    </div>
  );
}
