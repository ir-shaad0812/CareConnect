'use client';

import { useState, useEffect } from 'react';
import { ServiceAreaSelector } from '@/modules/property/components/legacy';
import { Button } from '@/components/ui/Button';
import apiClient from '@/services/api/client';

// Default to Kathmandu, Nepal until geolocation resolves
const DEFAULT_LOCATION = { latitude: 27.7172, longitude: 85.324 };

export default function ServiceAreaSetupPage() {
  const [serviceRadius, setServiceRadius] = useState(10);
  const [isSaving, setIsSaving] = useState(false);
  const [userLocation, setUserLocation] = useState(DEFAULT_LOCATION);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Try to resolve the user's actual location from browser geolocation
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      },
      () => {
        // Permission denied or unavailable — keep default
      }
    );
  }, []);

  const handleRadiusChange = (radius: number) => {
    setServiceRadius(radius);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const response = await apiClient.patch<{ success: boolean }>('/users/profile', {
        serviceRadius,
      });
      setSaveMessage(response.success ? 'Service area saved successfully.' : 'Failed to save. Please try again.');
    } catch {
      setSaveMessage('Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">
            Configure Your Service Area
          </h1>
          <p className="text-neutral-600">
            Define how far you&apos;re willing to travel for caregiving services
          </p>
        </div>

        <ServiceAreaSelector
          baseLocation={userLocation}
          initialRadius={serviceRadius}
          onRadiusChange={handleRadiusChange}
        />

        <div className="mt-6 flex items-center justify-end gap-4">
          {saveMessage && (
            <p className={`text-sm ${saveMessage.includes('success') ? 'text-green-600' : 'text-red-500'}`}>
              {saveMessage}
            </p>
          )}
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Service Area'}
          </Button>
        </div>
      </div>
    </div>
  );
}
