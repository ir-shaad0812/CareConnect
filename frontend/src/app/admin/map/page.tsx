/**
 * Admin Dashboard Map Page
 * Implementation of the AdminDashboardMap component with real data
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminDashboardMap } from '@/modules/property/components/legacy';
import type { CaregiverLocation, CaregiverRole } from '@/types/map.types';
import {
  Loader2,
  MapPin,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  Users,
  Heart,
  Activity,
} from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import adminService, {
  type AdminMapLocationsResponse,
  type AdminMapParticipant,
  type AdminMapRecord,
} from '@/services/api/admin.service';

const serviceTypeRoleMap: Record<string, CaregiverRole> = {
  elderly_care: 'Elder Care',
  child_care: 'Child Care',
  disability_care: 'Disability Support',
  special_needs: 'Disability Support',
  post_surgery: 'Nurse',
  physiotherapy: 'Physiotherapy',
  companionship: 'Mental Health Support',
  personal_care: 'Personal Care',
};

type MapSummary = AdminMapLocationsResponse['summary'];
const DEFAULT_CENTER = { latitude: 40.7128, longitude: -74.0060 }; // NYC default

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const normalizeVerificationStatus = (
  value: string | null | undefined
): 'pending' | 'verified' | 'rejected' | 'unknown' => {
  const normalized = (value || '').toLowerCase();

  if (normalized === 'verified') {
    return 'verified';
  }

  if (normalized === 'rejected') {
    return 'rejected';
  }

  if (normalized === 'pending') {
    return 'pending';
  }

  return 'unknown';
};

const mapServiceTypeToRole = (serviceTypes: string[] = []): CaregiverRole => {
  const firstType = serviceTypes[0];
  if (!firstType) {
    return 'Personal Care';
  }

  const normalizedType = firstType.trim().toLowerCase().replace(/\s+/g, '_');
  return serviceTypeRoleMap[normalizedType] || 'Personal Care';
};

const resolveRole = (participant: AdminMapParticipant): CaregiverRole => {
  if (participant.userType === 'careseeker') {
    return 'Care Seeker';
  }

  return mapServiceTypeToRole(participant.serviceTypes);
};

const normalizeParticipant = (
  participant: AdminMapParticipant
): CaregiverLocation | null => {
  const latitude = toFiniteNumber(participant.location?.coordinates?.lat);
  const longitude = toFiniteNumber(participant.location?.coordinates?.lng);

  if (latitude === null || longitude === null) {
    return null;
  }

  const normalized: CaregiverLocation = {
    id: participant.userId,
    name: participant.fullName || 'Unknown User',
    role: resolveRole(participant),
    userType: participant.userType,
    latitude,
    longitude,
    isActive: participant.isActive,
    isVerified: participant.isVerified,
    verificationStatus: normalizeVerificationStatus(participant.verificationStatus),
  };

  const responseRate = toFiniteNumber(participant.completionPercentage);
  if (responseRate !== null) {
    normalized.responseRate = responseRate;
  }

  if (participant.location?.source) {
    normalized.locationSource = participant.location.source;
  }

  const rating = toFiniteNumber(participant.rating);
  if (rating !== null) {
    normalized.rating = rating;
  }

  const profileImage = participant.profileImage;
  if (typeof profileImage === 'string' && profileImage.trim().length > 0) {
    normalized.profileImage = profileImage;
  }

  if (participant.lastRecord?.capturedAt) {
    normalized.lastRecordedAt = participant.lastRecord.capturedAt;
  }

  if (participant.location?.address) {
    normalized.address = participant.location.address;
  }

  if (participant.location?.city) {
    normalized.city = participant.location.city;
  }

  if (participant.location?.state) {
    normalized.state = participant.location.state;
  }

  if (participant.location?.country) {
    normalized.country = participant.location.country;
  }

  return normalized;
};

const buildFallbackSummary = (
  users: CaregiverLocation[],
  records: AdminMapRecord[]
): MapSummary => {
  return {
    totalUsers: users.length,
    caregivers: users.filter((user) => user.userType !== 'careseeker').length,
    careSeekers: users.filter((user) => user.userType === 'careseeker').length,
    verifiedUsers: users.filter((user) => user.isVerified).length,
    activeUsers: users.filter((user) => user.isActive).length,
    records: records.length,
  };
};

const formatRecordTimestamp = (value: string | null | undefined): string => {
  if (!value) {
    return 'Unknown time';
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return 'Unknown time';
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsedDate);
};

const getEventLabel = (eventType: AdminMapRecord['eventType']) => {
  switch (eventType) {
    case 'service_start':
      return 'Service Started';
    case 'service_ping':
      return 'Live GPS Ping';
    case 'service_end':
      return 'Service Ended';
    case 'submit':
    default:
      return 'Location Submitted';
  }
};

const sortRecordsByTime = (records: AdminMapRecord[]) => {
  return [...records].sort((a, b) => {
    const aTime = new Date(a.capturedAt).getTime();
    const bTime = new Date(b.capturedAt).getTime();
    return bTime - aTime;
  });
};

export default function AdminMapDashboard() {
  const [mapUsers, setMapUsers] = useState<CaregiverLocation[]>([]);
  const [locationRecords, setLocationRecords] = useState<AdminMapRecord[]>([]);
  const [summary, setSummary] = useState<MapSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userNameMap = useMemo(() => {
    return new Map(mapUsers.map((user) => [user.id, user.name]));
  }, [mapUsers]);

  const computedSummary = useMemo(() => {
    return summary || buildFallbackSummary(mapUsers, locationRecords);
  }, [summary, mapUsers, locationRecords]);

  const mapCenter = useMemo(() => {
    if (mapUsers.length === 0) {
      return DEFAULT_CENTER;
    }

    return {
      latitude: mapUsers[0].latitude,
      longitude: mapUsers[0].longitude,
    };
  }, [mapUsers]);

  const fetchMapData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const mapPayload = await adminService.getMapLocations({
        includeInactive: true,
        verifiedOnly: false,
        limitPerRole: 2000,
        recordsLimit: 500,
      });

      const participants = [...mapPayload.caregivers, ...mapPayload.careSeekers];
      const normalizedUsers = participants.flatMap((participant) => {
        const normalized = normalizeParticipant(participant);
        return normalized ? [normalized] : [];
      });

      const sortedRecords = sortRecordsByTime(mapPayload.records || []);

      setMapUsers(normalizedUsers);
      setLocationRecords(sortedRecords);
      setSummary(mapPayload.summary || buildFallbackSummary(normalizedUsers, sortedRecords));
    } catch (err) {
      console.error('Failed to fetch map locations:', err);
      setError('Unable to load caregiver and care-seeker map locations. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchMapData();
  }, [fetchMapData]);

  const handleUserClick = (user: CaregiverLocation) => {
    console.log('Admin viewing map user:', user);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#2b2218] mb-1">
              Care Network Geographic Dashboard
            </h1>
            <p className="text-[#7a5e40]">
              Monitor caregiver and care-seeker coverage, verified users, and recorded map activity.
            </p>
          </div>
          <button
            onClick={fetchMapData}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white bg-linear-to-r from-[#0f766e] to-[#c27c2f] hover:from-[#0c655e] hover:to-[#ac6d28] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          <div className="rounded-2xl border border-[#e8dbc1] bg-[#fffaf0] p-4">
            <p className="text-xs uppercase tracking-wide text-[#96724d]">Mapped Users</p>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-2xl font-semibold text-[#2b2218]">{computedSummary.totalUsers}</p>
              <Users className="w-5 h-5 text-[#0f766e]" />
            </div>
          </div>
          <div className="rounded-2xl border border-[#e8dbc1] bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-[#96724d]">Caregivers</p>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-2xl font-semibold text-[#2b2218]">{computedSummary.caregivers}</p>
              <Heart className="w-5 h-5 text-[#be4f28]" />
            </div>
          </div>
          <div className="rounded-2xl border border-[#e8dbc1] bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-[#96724d]">Care-seekers</p>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-2xl font-semibold text-[#2b2218]">{computedSummary.careSeekers}</p>
              <MapPin className="w-5 h-5 text-[#0f766e]" />
            </div>
          </div>
          <div className="rounded-2xl border border-[#e8dbc1] bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-[#96724d]">Verified Users</p>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-2xl font-semibold text-[#2b2218]">{computedSummary.verifiedUsers}</p>
              <ShieldCheck className="w-5 h-5 text-[#15803d]" />
            </div>
          </div>
          <div className="rounded-2xl border border-[#e8dbc1] bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-[#96724d]">Recorded Points</p>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-2xl font-semibold text-[#2b2218]">{computedSummary.records}</p>
              <Activity className="w-5 h-5 text-[#b45309]" />
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-10 h-10 text-primary-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-500">Loading map locations...</p>
            </div>
          </div>
        ) : mapUsers.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Mapped Locations</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              There are currently no caregivers or care-seekers with valid location data.
              Users appear here once they submit location proof or set a service location.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#e8dbc1] overflow-hidden">
            <AdminDashboardMap
              caregivers={mapUsers}
              defaultCenter={mapCenter}
              onCaregiverClick={handleUserClick}
            />
          </div>
        )}

        {!isLoading && locationRecords.length > 0 && (
          <div className="rounded-2xl border border-[#e8dbc1] bg-white p-5">
            <h2 className="text-lg font-semibold text-[#2b2218] mb-1">Recent Location Records</h2>
            <p className="text-sm text-[#7a5e40] mb-4">
              Latest recorded location events from caregivers and care-seekers.
            </p>
            <div className="space-y-3">
              {locationRecords.slice(0, 8).map((record) => (
                <div
                  key={record.recordId}
                  className="rounded-xl border border-[#efe3cd] bg-[#fffdf7] px-4 py-3 flex items-start justify-between gap-4"
                >
                  <div>
                    <p className="font-medium text-[#2b2218]">
                      {userNameMap.get(record.userId) || 'Unknown User'}
                    </p>
                    <p className="text-xs text-[#7a5e40]">
                      {getEventLabel(record.eventType)} • {record.coordinates.lat.toFixed(5)},{' '}
                      {record.coordinates.lng.toFixed(5)}
                    </p>
                  </div>
                  <p className="text-xs text-[#8c6f50] whitespace-nowrap">
                    {formatRecordTimestamp(record.capturedAt)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
