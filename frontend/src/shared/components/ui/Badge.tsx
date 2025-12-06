// ============================================
// BADGE COMPONENT
// ============================================

import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/shared/lib';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md';
}

const variantStyles = {
  default: 'bg-gray-100 text-gray-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
};

const sizeStyles = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'sm', ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center font-medium rounded-full',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    />
  )
);

Badge.displayName = 'Badge';

// Status badge helper for common statuses
export function getStatusBadgeVariant(
  status: string
): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  const statusMap: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
    active: 'success',
    completed: 'success',
    confirmed: 'success',
    verified: 'success',
    pending: 'warning',
    pending_approval: 'warning',
    in_progress: 'info',
    cancelled: 'danger',
    rejected: 'danger',
    suspended: 'danger',
    deleted: 'danger',
  };
  return statusMap[status] || 'default';
}
