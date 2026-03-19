"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  size?: "sm" | "md" | "lg";
  readOnly?: boolean;
  showValue?: boolean;
  count?: number;
  label?: string;
}

const SIZES = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
};

export function StarRating({
  value,
  onChange,
  size = "md",
  readOnly = false,
  showValue = false,
  count,
  label,
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState(0);

  const displayValue = hoverValue || value;

  return (
    <div className="flex items-center gap-2">
      {label && (
        <span className="text-sm text-gray-600 min-w-[100px]">{label}</span>
      )}
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= displayValue;
          const isHalf = star - 0.5 <= displayValue && star > displayValue;

          return (
            <motion.button
              key={star}
              type="button"
              disabled={readOnly}
              onClick={() => onChange?.(star)}
              onMouseEnter={() => !readOnly && setHoverValue(star)}
              onMouseLeave={() => !readOnly && setHoverValue(0)}
              whileHover={readOnly ? {} : { scale: 1.2 }}
              whileTap={readOnly ? {} : { scale: 0.9 }}
              className={`${readOnly ? "cursor-default" : "cursor-pointer"} focus:outline-none`}
            >
              <svg
                className={`${SIZES[size]} transition-colors duration-150`}
                viewBox="0 0 24 24"
                fill={isFilled ? "#F59E0B" : isHalf ? "url(#halfGrad)" : "none"}
                stroke={isFilled || isHalf ? "#F59E0B" : "#D1D5DB"}
                strokeWidth={1.5}
              >
                {isHalf && (
                  <defs>
                    <linearGradient id="halfGrad">
                      <stop offset="50%" stopColor="#F59E0B" />
                      <stop offset="50%" stopColor="transparent" />
                    </linearGradient>
                  </defs>
                )}
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                />
              </svg>
            </motion.button>
          );
        })}
      </div>
      {showValue && (
        <span className="text-sm font-semibold text-gray-700">
          {value.toFixed(1)}
        </span>
      )}
      {count !== undefined && (
        <span className="text-sm text-gray-500">
          ({count} {count === 1 ? "review" : "reviews"})
        </span>
      )}
    </div>
  );
}

export default StarRating;
