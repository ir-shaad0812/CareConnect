// ============================================
// AVATAR COMPONENT
// ============================================

'use client';

import { forwardRef, type ImgHTMLAttributes } from 'react';
import Image from 'next/image';
import { cn } from '@/shared/lib';
import { getInitials } from '@/shared/lib';

export interface AvatarProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

const sizeStyles = {
  xs: 'h-6 w-6 text-xs',
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
};

const sizePx = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
};

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, name, size = 'md', alt, ...props }, ref) => {
    const initials = name ? getInitials(name) : '';
    const displayAlt = alt || name || 'Avatar';

    return (
      <div
        ref={ref}
        className={cn(
          'relative flex items-center justify-center rounded-full overflow-hidden',
          'bg-primary-100 text-primary-600 font-medium',
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {src ? (
          <Image
            src={src}
            alt={displayAlt}
            width={sizePx[size]}
            height={sizePx[size]}
            className="object-cover w-full h-full"
          />
        ) : (
          <span>{initials || '?'}</span>
        )}
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';
