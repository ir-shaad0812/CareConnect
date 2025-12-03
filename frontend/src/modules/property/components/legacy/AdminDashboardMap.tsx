/**
 * Admin Dashboard Map
 * Displays caregivers and care-seekers with clustering, filtering, and statistics.
 */

'use client';

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  type ElementType,
} from 'react';
import { motion } from 'framer-motion';
import { BaseMap } from './BaseMap';
import { roleColors } from './mapConstants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import type { CaregiverLocation, CaregiverRole } from '@/types/map.types';
import { Users, UserCheck, ShieldCheck, MapPin, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import type L from 'leaflet';

export interface AdminDashboardMapProps {
  /** Array of all map users */
  caregivers: CaregiverLocation[];
  /** Default center for map */
  defaultCenter: { latitude: number; longitude: number };
  /** Callback when marker is clicked */
  onCaregiverClick?: (caregiver: CaregiverLocation) => void;
  /** Additional className */
  className?: string;
}

type FilterStatus = 'all' | 'active' | 'inactive';
type FilterRole = 'all' | CaregiverRole;
type FilterUserType = 'all' | 'caregiver' | 'careseeker';
type FilterVerification = 'all' | 'verified' | 'unverified';

export function AdminDashboardMap({
  caregivers,
  defaultCenter,
  onCaregiverClick,
  className,
}: AdminDashboardMapProps) {
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const markerClusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterRole, setFilterRole] = useState<FilterRole>('all');
  const [filterUserType, setFilterUserType] = useState<FilterUserType>('all');
  const [filterVerification, setFilterVerification] =
    useState<FilterVerification>('all');
  const leafletRef = useRef<typeof L | null>(null);

  const roleOptions = useMemo(() => {
    const uniqueRoles = Array.from(new Set(caregivers.map((caregiver) => caregiver.role)));
    return ['all', ...uniqueRoles.sort()] as FilterRole[];
  }, [caregivers]);

  const filteredCaregivers = useMemo(() => {
    return caregivers.filter((caregiver) => {
      if (filterStatus === 'active' && !caregiver.isActive) {
        return false;
      }

      if (filterStatus === 'inactive' && caregiver.isActive) {
        return false;
      }

      if (filterRole !== 'all' && caregiver.role !== filterRole) {
        return false;
      }

      const userType = caregiver.userType || 'caregiver';
      if (filterUserType !== 'all' && userType !== filterUserType) {
        return false;
      }

      if (filterVerification === 'verified' && !caregiver.isVerified) {
        return false;
      }

      if (filterVerification === 'unverified' && caregiver.isVerified) {
        return false;
      }

      return true;
    });
  }, [
    caregivers,
    filterStatus,
    filterRole,
    filterUserType,
    filterVerification,
  ]);

  useEffect(() => {
    if (!mapInstance) return;

    const setupMarkers = async () => {
      if (!leafletRef.current) {
        leafletRef.current = (await import('leaflet')).default;
        await import('leaflet.markercluster/dist/MarkerCluster.css');
        await import('leaflet.markercluster/dist/MarkerCluster.Default.css');
        await import('leaflet.markercluster');
      }
      const leaflet = leafletRef.current;

      if (markerClusterGroupRef.current) {
        mapInstance.removeLayer(markerClusterGroupRef.current);
      }

      const clusterGroup = leaflet.markerClusterGroup({
        chunkedLoading: true,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: true,
        zoomToBoundsOnClick: true,
        maxClusterRadius: 60,
        iconCreateFunction: (cluster) => {
          const markers = cluster.getAllChildMarkers() as Array<
            L.Marker & { options: { isActive?: boolean } }
          >;
          const activeCount = markers.filter((marker) => marker.options?.isActive).length;
          const size = 50;

          return leaflet.divIcon({
            html: `
              <div style="
                width: ${size}px;
                height: ${size}px;
                background: linear-gradient(135deg, #0f766e 0%, #c27c2f 100%);
                border-radius: 50%;
                border: 3px solid white;
                box-shadow: 0 8px 14px -6px rgb(15 118 110 / 0.45);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: bold;
              ">
                <div style="font-size: 18px;">${markers.length}</div>
                <div style="font-size: 9px; margin-top: -2px;">${activeCount} active</div>
              </div>
            `,
            className: 'custom-cluster-icon',
            iconSize: [size, size],
          });
        },
      });

      for (const caregiver of filteredCaregivers) {
        const color = roleColors[caregiver.role] || '#0f766e';
        const isActive = caregiver.isActive !== undefined ? caregiver.isActive : true;
        const size = 36;
        const isVerified = caregiver.isVerified === true;
        const markerShadow = isVerified
          ? '0 0 0 4px rgba(21, 128, 61, 0.22), 0 8px 14px -6px rgba(0, 0, 0, 0.35)'
          : '0 8px 14px -6px rgba(0, 0, 0, 0.25)';

        const iconHtml = `
          <div style="
            width: ${size}px;
            height: ${size}px;
            background: ${isActive ? color : '#9CA3AF'};
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 3px solid white;
            box-shadow: ${markerShadow};
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

        const icon = leaflet.divIcon({
          html: iconHtml,
          className: 'custom-marker-icon',
          iconSize: [size, size],
          iconAnchor: [size / 2, size],
          popupAnchor: [0, -size],
        });

        const marker = leaflet.marker([caregiver.latitude, caregiver.longitude], {
          icon,
          isActive: caregiver.isActive,
        } as L.MarkerOptions & { isActive?: boolean });

        marker.bindPopup(createAdminPopupContent(caregiver), {
          maxWidth: 340,
          className: 'admin-custom-popup',
        });

        marker.on('click', () => {
          onCaregiverClick?.(caregiver);
        });

        clusterGroup.addLayer(marker);
      }

      mapInstance.addLayer(clusterGroup);
      markerClusterGroupRef.current = clusterGroup;

      if (filteredCaregivers.length > 0) {
        const bounds = leaflet.latLngBounds(
          filteredCaregivers.map((caregiver) => [
            caregiver.latitude,
            caregiver.longitude,
          ] as L.LatLngExpression)
        );
        mapInstance.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      }
    };

    void setupMarkers();

    return () => {
      if (markerClusterGroupRef.current && mapInstance) {
        mapInstance.removeLayer(markerClusterGroupRef.current);
      }
    };
  }, [mapInstance, filteredCaregivers, onCaregiverClick]);

  const handleMapReady = useCallback((map: L.Map) => {
    setMapInstance(map);
  }, []);

  const stats = calculateStatistics(filteredCaregivers);

  return (
    <div className={cn('space-y-4', className)}>
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          icon={Users}
          label="Total Profiles"
          value={stats.total}
          bgColor="bg-[#ecfdf5]"
          iconColor="text-[#0f766e]"
        />
        <StatCard
          icon={Heart}
          label="Caregivers"
          value={stats.caregivers}
          bgColor="bg-[#fff7ed]"
          iconColor="text-[#c2410c]"
        />
        <StatCard
          icon={UserCheck}
          label="Care-seekers"
          value={stats.careSeekers}
          bgColor="bg-[#eef2ff]"
          iconColor="text-[#4338ca]"
        />
        <StatCard
          icon={ShieldCheck}
          label="Verified"
          value={stats.verified}
          bgColor="bg-[#f0fdf4]"
          iconColor="text-[#15803d]"
        />
      </div>

      <Card className="border-[#e8dbc1] dark:border-[#e8dbc1] bg-white dark:bg-white text-neutral-900 dark:text-neutral-900">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-[#6f563b]">
              <MapPin className="w-4 h-4 text-[#0f766e]" />
              <span className="font-medium">
                Showing {filteredCaregivers.length} of {caregivers.length} mapped users
              </span>
            </div>

            <div className="flex-1" />

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-[#5b4632]">Status:</label>
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                className="w-32 border-[#e8dbc1] bg-white text-neutral-900 dark:border-[#e8dbc1] dark:bg-white dark:text-neutral-900"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-[#5b4632]">Type:</label>
              <Select
                value={filterUserType}
                onChange={(e) => setFilterUserType(e.target.value as FilterUserType)}
                className="w-40 border-[#e8dbc1] bg-white text-neutral-900 dark:border-[#e8dbc1] dark:bg-white dark:text-neutral-900"
              >
                <option value="all">All Users</option>
                <option value="caregiver">Caregivers</option>
                <option value="careseeker">Care-seekers</option>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-[#5b4632]">Verification:</label>
              <Select
                value={filterVerification}
                onChange={(e) =>
                  setFilterVerification(e.target.value as FilterVerification)
                }
                className="w-40 border-[#e8dbc1] bg-white text-neutral-900 dark:border-[#e8dbc1] dark:bg-white dark:text-neutral-900"
              >
                <option value="all">All</option>
                <option value="verified">Verified</option>
                <option value="unverified">Unverified</option>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-[#5b4632]">Role:</label>
              <Select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value as FilterRole)}
                className="w-44 border-[#e8dbc1] bg-white text-neutral-900 dark:border-[#e8dbc1] dark:bg-white dark:text-neutral-900"
              >
                <option value="all">All Roles</option>
                {roleOptions
                  .filter((role) => role !== 'all')
                  .map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="border-[#e8dbc1] dark:border-[#e8dbc1] bg-white dark:bg-white text-neutral-900 dark:text-neutral-900">
          <CardHeader>
            <CardTitle className="text-xl text-[#2b2218]">Geographic Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <BaseMap
              center={defaultCenter}
              zoom={12}
              height="h-[600px]"
              onMapReady={handleMapReady}
            />
          </CardContent>
        </Card>
      </motion.div>

      <Card className="border-[#e8dbc1] dark:border-[#e8dbc1] bg-white dark:bg-white text-neutral-900 dark:text-neutral-900">
        <CardHeader>
          <CardTitle className="text-lg text-[#2b2218]">Distribution by Role</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(stats.byRole).map(([role, count]) => (
              <div
                key={role}
                className="flex items-center justify-between p-3 rounded-lg bg-[#fffaf2] border border-[#efe2cc]"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ background: roleColors[role as CaregiverRole] || '#0f766e' }}
                  />
                  <span className="text-sm font-medium text-[#5b4632]">{role}</span>
                </div>
                <span className="text-sm font-bold text-[#2b2218]">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface StatCardProps {
  icon: ElementType;
  label: string;
  value: string | number;
  bgColor: string;
  iconColor: string;
}

function StatCard({ icon: Icon, label, value, bgColor, iconColor }: StatCardProps) {
  return (
    <Card className="border-[#e8dbc1] dark:border-[#e8dbc1] bg-white dark:bg-white text-neutral-900 dark:text-neutral-900">
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className={cn('p-3 rounded-lg', bgColor)}>
            <Icon className={cn('w-6 h-6', iconColor)} />
          </div>
          <div>
            <p className="text-sm font-medium text-[#6f563b]">{label}</p>
            <p className="text-2xl font-bold text-[#2b2218]">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function createAdminPopupContent(caregiver: CaregiverLocation): string {
  const statusColor = caregiver.isActive ? '#10B981' : '#F59E0B';
  const statusText = caregiver.isActive ? 'Active' : 'Inactive';
  const verificationColor = caregiver.isVerified ? '#15803D' : '#B45309';
  const verificationText = caregiver.isVerified ? 'Verified' : 'Unverified';
  const userType = caregiver.userType === 'careseeker' ? 'Care-seeker' : 'Caregiver';
  const locationSource = caregiver.locationSource
    ? caregiver.locationSource.replace(/_/g, ' ')
    : 'recorded location';
  const locationParts = [caregiver.city, caregiver.state, caregiver.country].filter(Boolean);
  const locationText = locationParts.length > 0 ? locationParts.join(', ') : 'Location available';

  return `
    <div style="padding: 12px; min-width: 260px;">
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px;">
        <div style="font-weight: 600; font-size: 16px; color: #1f2937;">
          ${caregiver.name}
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="
            display: inline-block;
            padding: 2px 8px;
            background: ${statusColor};
            color: white;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
          ">${statusText}</span>
          <span style="
            display: inline-block;
            padding: 2px 8px;
            background: ${verificationColor};
            color: white;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
          ">${verificationText}</span>
        </div>
      </div>

      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
        <span style="
          display: inline-block;
          padding: 4px 10px;
          background: ${roleColors[caregiver.role] || '#0f766e'};
          color: white;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
        ">${caregiver.role}</span>
        <span style="font-size: 12px; color: #6b7280;">${userType}</span>
      </div>

      <div style="display: grid; gap: 6px; padding: 8px; background: #F9FAFB; border-radius: 6px; font-size: 13px;">
        <div style="display: flex; justify-content: space-between; gap: 12px;">
          <span style="color: #6B7280;">Source:</span>
          <span style="font-weight: 600; color: #1F2937; text-transform: capitalize;">${locationSource}</span>
        </div>
        <div style="display: flex; justify-content: space-between; gap: 12px;">
          <span style="color: #6B7280;">Area:</span>
          <span style="font-weight: 600; color: #1F2937; text-align: right;">${locationText}</span>
        </div>
        ${caregiver.rating ? `
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #6B7280;">Rating:</span>
            <span style="font-weight: 600; color: #1F2937;">${caregiver.rating.toFixed(1)}</span>
          </div>
        ` : ''}
        ${caregiver.responseRate ? `
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #6B7280;">Completion:</span>
            <span style="font-weight: 600; color: #1F2937;">${caregiver.responseRate}%</span>
          </div>
        ` : ''}
        ${caregiver.lastRecordedAt ? `
          <div style="display: flex; justify-content: space-between; gap: 12px;">
            <span style="color: #6B7280;">Last Record:</span>
            <span style="font-weight: 600; color: #1F2937; text-align: right;">${new Date(caregiver.lastRecordedAt).toLocaleString()}</span>
          </div>
        ` : ''}
      </div>

      <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #E5E7EB; font-size: 11px; color: #9CA3AF;">
        ID: ${caregiver.id}
      </div>
    </div>
  `;
}

function calculateStatistics(filteredCaregivers: CaregiverLocation[]) {
  const total = filteredCaregivers.length;
  const caregivers = filteredCaregivers.filter(
    (caregiver) => caregiver.userType !== 'careseeker'
  ).length;
  const careSeekers = filteredCaregivers.filter(
    (caregiver) => caregiver.userType === 'careseeker'
  ).length;
  const verified = filteredCaregivers.filter((caregiver) => caregiver.isVerified).length;

  const byRole: Record<string, number> = {};
  filteredCaregivers.forEach((caregiver) => {
    byRole[caregiver.role] = (byRole[caregiver.role] || 0) + 1;
  });

  return {
    total,
    caregivers,
    careSeekers,
    verified,
    byRole,
  };
}
