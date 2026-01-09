/**
 * Admin Dashboard Map
 * Displays all caregivers with clustering, filtering, and statistics
 * Optimized for large datasets with performance in mind
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { BaseMap } from './BaseMap';
import { roleColors } from './mapConstants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import type { CaregiverLocation, CaregiverRole } from '@/types/map.types';
import { Users, UserCheck, UserX, MapPin, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type L from 'leaflet';

export interface AdminDashboardMapProps {
  /** Array of all caregivers */
  caregivers: CaregiverLocation[];
  /** Default center for map */
  defaultCenter: { latitude: number; longitude: number };
  /** Callback when caregiver marker is clicked */
  onCaregiverClick?: (caregiver: CaregiverLocation) => void;
  /** Additional className */
  className?: string;
}

type FilterStatus = 'all' | 'active' | 'inactive';
type FilterRole = 'all' | CaregiverRole;

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
  const [filteredCaregivers, setFilteredCaregivers] = useState(caregivers);
  const leafletRef = useRef<typeof L | null>(null);

  // Filter caregivers based on status and role
  useEffect(() => {
    let filtered = caregivers;

    if (filterStatus !== 'all') {
      filtered = filtered.filter((c) =>
        filterStatus === 'active' ? c.isActive : !c.isActive
      );
    }

    if (filterRole !== 'all') {
      filtered = filtered.filter((c) => c.role === filterRole);
    }

    setFilteredCaregivers(filtered);
  }, [caregivers, filterStatus, filterRole]);

  // Setup markers and clustering
  useEffect(() => {
    if (!mapInstance) return;

    const setupMarkers = async () => {
      // Dynamically import Leaflet and marker cluster
      if (!leafletRef.current) {
        leafletRef.current = (await import('leaflet')).default;
        await import('leaflet.markercluster/dist/MarkerCluster.css');
        await import('leaflet.markercluster/dist/MarkerCluster.Default.css');
        await import('leaflet.markercluster');
      }
      const L = leafletRef.current;

      // Remove existing cluster group
      if (markerClusterGroupRef.current) {
        mapInstance.removeLayer(markerClusterGroupRef.current);
      }

      // Create new marker cluster group with custom options
      const clusterGroup = L.markerClusterGroup({
        chunkedLoading: true,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: true,
        zoomToBoundsOnClick: true,
        maxClusterRadius: 60,
        iconCreateFunction: (cluster) => {
          const markers = cluster.getAllChildMarkers();
          const activeCount = markers.filter((m: any) => m.options.isActive).length;
          const size = 50;

          return L.divIcon({
            html: `
              <div style="
                width: ${size}px;
                height: ${size}px;
                background: linear-gradient(135deg, #4461F2 0%, #8B54F7 100%);
                border-radius: 50%;
                border: 3px solid white;
                box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
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

      // Add markers to cluster group
      for (const caregiver of filteredCaregivers) {
        const color = roleColors[caregiver.role] || '#4461F2';
        const isActive = caregiver.isActive !== undefined ? caregiver.isActive : true;
        const size = 36;

        const iconHtml = `
          <div style="
            width: ${size}px;
            height: ${size}px;
            background: ${isActive ? color : '#9CA3AF'};
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 3px solid white;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
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

        const icon = L.divIcon({
          html: iconHtml,
          className: 'custom-marker-icon',
          iconSize: [size, size],
          iconAnchor: [size / 2, size],
          popupAnchor: [0, -size],
        });

        const marker = L.marker([caregiver.latitude, caregiver.longitude], {
          icon,
          isActive: caregiver.isActive,
        } as any);

        // Create detailed popup
        const popupContent = createAdminPopupContent(caregiver);
        marker.bindPopup(popupContent, {
          maxWidth: 320,
          className: 'admin-custom-popup',
        });

        marker.on('click', () => {
          onCaregiverClick?.(caregiver);
        });

        clusterGroup.addLayer(marker);
      }

      mapInstance.addLayer(clusterGroup);
      markerClusterGroupRef.current = clusterGroup;

      // Fit bounds if we have caregivers
      if (filteredCaregivers.length > 0) {
        const bounds = L.latLngBounds(
          filteredCaregivers.map((c) => [c.latitude, c.longitude] as L.LatLngExpression)
        );
        mapInstance.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      }
    };

    setupMarkers();

    return () => {
      if (markerClusterGroupRef.current && mapInstance) {
        mapInstance.removeLayer(markerClusterGroupRef.current);
      }
    };
  }, [mapInstance, filteredCaregivers, onCaregiverClick]);

  const handleMapReady = useCallback((map: L.Map) => {
    setMapInstance(map);
  }, []);

  // Calculate statistics
  const stats = calculateStatistics(filteredCaregivers);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          icon={Users}
          label="Total Caregivers"
          value={stats.total}
          bgColor="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatCard
          icon={UserCheck}
          label="Active"
          value={stats.active}
          bgColor="bg-green-50"
          iconColor="text-green-600"
        />
        <StatCard
          icon={UserX}
          label="Inactive"
          value={stats.inactive}
          bgColor="bg-orange-50"
          iconColor="text-orange-600"
        />
        <StatCard
          icon={TrendingUp}
          label="Avg Rating"
          value={stats.avgRating.toFixed(1)}
          bgColor="bg-purple-50"
          iconColor="text-purple-600"
        />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-neutral-600">
              <MapPin className="w-4 h-4" />
              <span className="font-medium">
                Showing {filteredCaregivers.length} of {caregivers.length} caregivers
              </span>
            </div>

            <div className="flex-1" />

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-neutral-700">Status:</label>
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                className="w-[120px]"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-neutral-700">Role:</label>
              <Select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value as FilterRole)}
                className="w-[180px]"
              >
                <option value="all">All Roles</option>
                <option value="Nurse">Nurse</option>
                <option value="Child Care">Child Care</option>
                <option value="Elder Care">Elder Care</option>
                <option value="Physiotherapy">Physiotherapy</option>
                <option value="Personal Care">Personal Care</option>
                <option value="Disability Support">Disability Support</option>
                <option value="Mental Health Support">Mental Health Support</option>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Map */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Geographic Distribution</CardTitle>
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

      {/* Role Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Distribution by Role</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(stats.byRole).map(([role, count]) => (
              <div
                key={role}
                className="flex items-center justify-between p-3 rounded-lg bg-neutral-50"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ background: roleColors[role as CaregiverRole] || '#4461F2' }}
                  />
                  <span className="text-sm font-medium text-neutral-700">{role}</span>
                </div>
                <span className="text-sm font-bold text-neutral-900">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Stat Card Component
 */
interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  bgColor: string;
  iconColor: string;
}

function StatCard({ icon: Icon, label, value, bgColor, iconColor }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className={cn('p-3 rounded-lg', bgColor)}>
            <Icon className={cn('w-6 h-6', iconColor)} />
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-600">{label}</p>
            <p className="text-2xl font-bold text-neutral-900">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Create admin popup content
 */
function createAdminPopupContent(caregiver: CaregiverLocation): string {
  const statusColor = caregiver.isActive ? '#10B981' : '#F59E0B';
  const statusText = caregiver.isActive ? 'Active' : 'Inactive';

  return `
    <div style="padding: 12px;">
      <div style="display: flex; align-items: center; justify-content: between; gap: 8px; margin-bottom: 8px;">
        <div style="font-weight: 600; font-size: 16px; color: #1f2937;">
          ${caregiver.name}
        </div>
        <div style="
          display: inline-block;
          padding: 2px 8px;
          background: ${statusColor};
          color: white;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
        ">${statusText}</div>
      </div>
      
      <div style="margin-bottom: 8px;">
        <span style="
          display: inline-block;
          padding: 4px 10px;
          background: ${roleColors[caregiver.role] || '#4461F2'};
          color: white;
          border-radius: 4px;
          font-size: 13px;
          font-weight: 500;
        ">${caregiver.role}</span>
      </div>

      <div style="display: grid; gap: 6px; padding: 8px; background: #F9FAFB; border-radius: 6px; font-size: 13px;">
        ${caregiver.rating ? `
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #6B7280;">Rating:</span>
            <span style="font-weight: 600; color: #1F2937;">⭐ ${caregiver.rating}</span>
          </div>
        ` : ''}
        ${caregiver.completedBookings ? `
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #6B7280;">Bookings:</span>
            <span style="font-weight: 600; color: #1F2937;">${caregiver.completedBookings}</span>
          </div>
        ` : ''}
        ${caregiver.responseRate ? `
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #6B7280;">Response Rate:</span>
            <span style="font-weight: 600; color: #1F2937;">${caregiver.responseRate}%</span>
          </div>
        ` : ''}
        ${caregiver.hourlyRate ? `
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #6B7280;">Rate:</span>
            <span style="font-weight: 600; color: #4461F2;">Rs. ${caregiver.hourlyRate?.toLocaleString()}/hr</span>
          </div>
        ` : ''}
      </div>

      <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #E5E7EB; font-size: 11px; color: #9CA3AF;">
        ID: ${caregiver.id}
      </div>
    </div>
  `;
}

/**
 * Calculate statistics
 */
function calculateStatistics(
  filteredCaregivers: CaregiverLocation[]
) {
  const total = filteredCaregivers.length;
  const active = filteredCaregivers.filter((c) => c.isActive).length;
  const inactive = total - active;

  const ratingsSum = filteredCaregivers.reduce(
    (sum, c) => sum + (c.rating || 0),
    0
  );
  const avgRating = total > 0 ? ratingsSum / total : 0;

  const byRole: Record<string, number> = {};
  filteredCaregivers.forEach((c) => {
    byRole[c.role] = (byRole[c.role] || 0) + 1;
  });

  return {
    total,
    active,
    inactive,
    avgRating,
    byRole,
  };
}
