/**
 * Slider Component (shadcn/ui style)
 */

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SliderProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  min?: number;
  max?: number;
  step?: number;
  value?: number;
  onValueChange?: (value: number) => void;
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, min = 0, max = 100, step = 1, value, onValueChange, ...props }, ref) => {
    return (
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onValueChange?.(Number(e.target.value))}
        className={cn(
          'w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer',
          'dark:bg-neutral-700',
          '[&::-webkit-slider-thumb]:appearance-none',
          '[&::-webkit-slider-thumb]:w-5',
          '[&::-webkit-slider-thumb]:h-5',
          '[&::-webkit-slider-thumb]:rounded-full',
          '[&::-webkit-slider-thumb]:bg-neutral-900',
          '[&::-webkit-slider-thumb]:cursor-pointer',
          '[&::-webkit-slider-thumb]:shadow-md',
          'dark:[&::-webkit-slider-thumb]:bg-neutral-50',
          '[&::-moz-range-thumb]:w-5',
          '[&::-moz-range-thumb]:h-5',
          '[&::-moz-range-thumb]:rounded-full',
          '[&::-moz-range-thumb]:bg-neutral-900',
          '[&::-moz-range-thumb]:cursor-pointer',
          '[&::-moz-range-thumb]:border-0',
          '[&::-moz-range-thumb]:shadow-md',
          'dark:[&::-moz-range-thumb]:bg-neutral-50',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Slider.displayName = 'Slider';

export { Slider };
