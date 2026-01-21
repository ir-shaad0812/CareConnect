/**
 * Booking Confirmation Page
 * Displays booking confirmation with map location
 */

'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { BookingConfirmationMap } from '@/modules/property/components/legacy';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import type { BookingLocation } from '@/types/map.types';
import { CheckCircle, Calendar, Clock, Banknote, Loader2, AlertCircle, MapPin } from 'lucide-react';
import { bookingService } from '@/services';

interface BookingDetails {
  id: string;
  date: string;
  time: string;
  duration: string;
  totalCost: number;
  caregiver: {
    name: string;
    specialty: string;
    rating: number;
    reviews: number;
    avatar?: string;
  };
  location?: BookingLocation;
}

export default function BookingConfirmationPage() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('bookingId');
  
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBooking = async () => {
      if (!bookingId) {
        setError('No booking ID provided');
        setIsLoading(false);
        return;
      }

      try {
        const response = await bookingService.getBookingById(bookingId);
        if (response.success && response.data?.booking) {
          const b = response.data.booking;
          const bAny = b as unknown as Record<string, unknown>;
          const schedule = bAny.schedule as { startDate?: string; startTime?: string; endTime?: string; totalHours?: number } | undefined;
          const caregiver = bAny.caregiverId as { fullName?: string; rating?: number; reviewCount?: number; avatar?: string } | undefined;
          const location = bAny.location as { coordinates?: { lat?: number; lng?: number }; address?: string; city?: string; postalCode?: string } | undefined;
          setBooking({
            id: b._id,
            date: schedule?.startDate ? new Date(schedule.startDate).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }) : '',
            time: schedule?.startTime && schedule?.endTime ? `${schedule.startTime} - ${schedule.endTime}` : '',
            duration: schedule?.totalHours ? `${schedule.totalHours} hours` : '',
            totalCost: (bAny.totalAmount as number) || 0,
            caregiver: {
              name: caregiver?.fullName || 'Caregiver',
              specialty: (bAny.serviceType as string) || 'Care Service',
              rating: caregiver?.rating || 0,
              reviews: caregiver?.reviewCount || 0,
              ...(caregiver?.avatar ? { avatar: caregiver.avatar } : {}),
            },
            ...(location ? {
              location: {
                latitude: location.coordinates?.lat || 0,
                longitude: location.coordinates?.lng || 0,
                address: location.address || '',
                city: location.city || '',
                postalCode: location.postalCode || '',
              }
            } : {}),
          });
        }
      } catch (err) {
        console.error('Failed to fetch booking:', err);
        setError('Unable to load booking details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-primary-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Booking Not Found</h2>
          <p className="text-gray-500 mb-4">{error || 'Unable to load booking details'}</p>
          <a
            href="/dashboard"
            className="inline-flex px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Success Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">
            Booking Confirmed!
          </h1>
          <p className="text-neutral-600">
            Your booking has been successfully confirmed. Details below.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Booking Details */}
          <Card>
            <CardHeader>
              <CardTitle>Booking Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-neutral-600" />
                <div>
                  <p className="text-sm text-neutral-500">Date</p>
                  <p className="font-medium">{booking.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-neutral-600" />
                <div>
                  <p className="text-sm text-neutral-500">Time</p>
                  <p className="font-medium">{booking.time}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Banknote className="w-5 h-5 text-neutral-600" />
                <div>
                  <p className="text-sm text-neutral-500">Total Cost</p>
                  <p className="font-medium">Rs. {booking.totalCost.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Caregiver Info */}
          <Card>
            <CardHeader>
              <CardTitle>Caregiver</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center overflow-hidden">
                  {booking.caregiver.avatar ? (
                    <img src={booking.caregiver.avatar} alt={booking.caregiver.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl">👩‍⚕️</span>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{booking.caregiver.name}</h3>
                  <p className="text-sm text-neutral-600">{booking.caregiver.specialty}</p>
                  {booking.caregiver.rating > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-yellow-500">⭐</span>
                      <span className="text-sm font-medium">
                        {booking.caregiver.rating.toFixed(1)} ({booking.caregiver.reviews} reviews)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Service Location Map */}
        <div className="mt-6">
          <h2 className="text-xl font-semibold text-neutral-900 mb-4">
            Service Location
          </h2>
          {booking.location ? (
            <BookingConfirmationMap
              location={booking.location}
              showNavigation={true}
            />
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Location details not available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
