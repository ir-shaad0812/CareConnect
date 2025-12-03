/**
 * Navigation Button Component
 * Reusable button for opening Google Maps navigation
 */

'use client';

import { Button } from '@/components/ui/Button';
import { openGoogleMapsNavigation } from '@/lib/map-utils';
import type { Coordinates } from '@/types/map.types';
import { Navigation } from 'lucide-react';

export interface NavigationButtonProps {
  /** Destination coordinates */
  destination: Coordinates;
  /** Optional origin coordinates (defaults to user's current location) */
  origin?: Coordinates;
  /** Button label */
  label?: string;
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Full width button */
  fullWidth?: boolean;
  /** Additional className */
  className?: string;
}

export function NavigationButton({
  destination,
  origin,
  label = 'Get Directions',
  variant = 'outline',
  size = 'md',
  fullWidth = false,
  className,
}: NavigationButtonProps) {
  const handleClick = () => {
    openGoogleMapsNavigation(destination, origin);
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      className={`${className || ''} ${fullWidth ? 'w-full' : ''}`}
    >
      <Navigation className="w-4 h-4 mr-2" />
      {label}
    </Button>
  );
}
