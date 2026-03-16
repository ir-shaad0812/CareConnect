"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import Image from "next/image";

// ============================================
// TYPES
// ============================================

export interface Testimonial {
  id: string;
  name: string;
  avatar?: string;
  rating: number;
  review: string;
  role: "care_seeker" | "caregiver";
  verified: boolean;
  date?: string;
  serviceType?: string;
  // Card styling
  backgroundColor?: string;
  backgroundImage?: string;
  textColor?: string;
  // Position (will be calculated if not provided)
  initialX?: number;
  initialY?: number;
  rotation?: number;
}

interface ScatterTestimonialsProps {
  testimonials: Testimonial[];
  className?: string;
}

// ============================================
// STAR RATING COMPONENT
// ============================================

const StarRating = ({ rating, size = 16, color = "#FFD700" }: { rating: number; size?: number; color?: string }) => {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill={star <= rating ? color : "none"}
          stroke={star <= rating ? color : "#D1D5DB"}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  );
};

// ============================================
// AVATAR COMPONENT
// ============================================

const Avatar = ({ name, src, size = 40 }: { name: string; src?: string; size?: number }) => {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const colors = [
    "from-blue-500 to-indigo-600",
    "from-purple-500 to-pink-500",
    "from-emerald-500 to-teal-500",
    "from-amber-500 to-orange-500",
    "from-rose-500 to-red-500",
    "from-cyan-500 to-blue-500",
  ];

  const colorIndex = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;

  if (src) {
    return (
      <div
        className="relative rounded-full overflow-hidden ring-2 ring-white/50"
        style={{ width: size, height: size }}
      >
        <Image src={src} alt={name} fill className="object-cover" />
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center rounded-full bg-linear-to-br ${colors[colorIndex]} text-white font-semibold ring-2 ring-white/50`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials}
    </div>
  );
};

// ============================================
// DRAGGABLE TESTIMONIAL CARD
// ============================================

interface DraggableCardProps {
  testimonial: Testimonial;
  index: number;
  onDragStart: (id: string) => void;
  zIndex: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

const DraggableCard = ({ testimonial, index, onDragStart, zIndex, containerRef }: DraggableCardProps) => {
  const x = useMotionValue(testimonial.initialX || 0);
  const y = useMotionValue(testimonial.initialY || 0);
  
  const springConfig = { stiffness: 300, damping: 30 };
  const springX = useSpring(x, springConfig);
  const springY = useSpring(y, springConfig);
  
  const rotateZ = useMotionValue(testimonial.rotation || 0);
  const scale = useMotionValue(1);
  
  const [isDragging, setIsDragging] = useState(false);

  // Card background styles
  const getCardStyle = () => {
    if (testimonial.backgroundImage) {
      return {
        backgroundImage: `url(${testimonial.backgroundImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      };
    }
    return {
      backgroundColor: testimonial.backgroundColor || "#FFFFFF",
    };
  };

  const textColor = testimonial.textColor || (testimonial.backgroundColor ? "#FFFFFF" : "#1F2937");
  const isLightBg = !testimonial.backgroundColor || testimonial.backgroundColor === "#FFFFFF";

  const handleDragStart = () => {
    setIsDragging(true);
    onDragStart(testimonial.id);
    scale.set(1.05);
    rotateZ.set(0);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    scale.set(1);
    rotateZ.set(testimonial.rotation || (Math.random() - 0.5) * 6);
  };

  return (
    <motion.div
      className="absolute cursor-grab active:cursor-grabbing touch-none"
      style={{
        x: springX,
        y: springY,
        rotateZ,
        scale,
        zIndex,
      }}
      drag
      dragConstraints={containerRef}
      dragElastic={0.1}
      dragMomentum={true}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      whileHover={{ scale: 1.02 }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
    >
      <motion.div
        className={`
          relative w-[280px] sm:w-[320px] rounded-2xl p-5 overflow-hidden
          ${isDragging ? "shadow-2xl" : "shadow-xl"}
          transition-shadow duration-200
        `}
        style={getCardStyle()}
      >
        {/* Overlay for image backgrounds */}
        {testimonial.backgroundImage && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />
        )}

        {/* Content */}
        <div className="relative z-10">
          {/* Star Rating */}
          <div className="mb-3">
            <StarRating rating={testimonial.rating} color={isLightBg ? "#FFD700" : "#FFFFFF"} />
          </div>

          {/* Review Text */}
          <p
            className="text-sm leading-relaxed mb-4 line-clamp-4"
            style={{ color: textColor }}
          >
            &ldquo;{testimonial.review}&rdquo;
          </p>

          {/* Footer */}
          <div className="flex items-center gap-3">
            <Avatar
              name={testimonial.name}
              {...(testimonial.avatar !== undefined ? { src: testimonial.avatar } : {})}
              size={36}
            />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate" style={{ color: textColor }}>
                {testimonial.name}
              </p>
              <div className="flex items-center gap-2">
                {testimonial.verified && (
                  <span
                    className={`
                      inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded
                      ${isLightBg ? "bg-emerald-100 text-emerald-700" : "bg-white/20 text-white"}
                    `}
                  >
                    <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    VERIFIED
                  </span>
                )}
                <span
                  className="text-[10px] opacity-70 uppercase tracking-wide"
                  style={{ color: textColor }}
                >
                  {testimonial.role === "care_seeker" ? "Care Seeker" : "Caregiver"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ============================================
// MAIN SCATTER TESTIMONIALS COMPONENT
// ============================================

export function ScatterTestimonials({ testimonials, className = "" }: ScatterTestimonialsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cardOrder, setCardOrder] = useState<string[]>(testimonials.map((t) => t.id));
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Update container size
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Calculate initial positions for cards
  const getInitialPositions = (index: number, total: number) => {
    if (containerSize.width === 0) return { x: 0, y: 0, rotation: 0 };

    const cols = Math.ceil(Math.sqrt(total));
    const rows = Math.ceil(total / cols);
    
    const col = index % cols;
    const row = Math.floor(index / cols);
    
    const cellWidth = (containerSize.width - 350) / cols;
    const cellHeight = (containerSize.height - 200) / rows;
    
    const baseX = col * cellWidth + 50;
    const baseY = row * cellHeight + 50;
    
    // Add some randomness
    const randomX = (Math.random() - 0.5) * 60;
    const randomY = (Math.random() - 0.5) * 40;
    const rotation = (Math.random() - 0.5) * 12;

    return {
      x: baseX + randomX,
      y: baseY + randomY,
      rotation,
    };
  };

  // Bring card to front on drag
  const handleDragStart = (id: string) => {
    setCardOrder((prev) => {
      const filtered = prev.filter((cardId) => cardId !== id);
      return [...filtered, id];
    });
  };

  // Get z-index for each card
  const getZIndex = (id: string) => {
    return cardOrder.indexOf(id) + 1;
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-[600px] sm:h-[700px] lg:h-[800px] overflow-hidden ${className}`}
    >
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.03]">
        <svg className="w-full h-full">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#000" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Instruction Text */}
      <motion.div
        className="absolute top-4 left-4 text-sm text-gray-500 flex items-center gap-2 z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
        </svg>
        Drag Cards to Rearrange
      </motion.div>

      {/* Testimonial Cards */}
      {testimonials.map((testimonial, index) => {
        const pos = testimonial.initialX !== undefined
          ? { x: testimonial.initialX, y: testimonial.initialY || 0, rotation: testimonial.rotation || 0 }
          : getInitialPositions(index, testimonials.length);

        return (
          <DraggableCard
            key={testimonial.id}
            testimonial={{
              ...testimonial,
              initialX: pos.x,
              initialY: pos.y,
              rotation: pos.rotation,
            }}
            index={index}
            onDragStart={handleDragStart}
            zIndex={getZIndex(testimonial.id)}
            containerRef={containerRef}
          />
        );
      })}
    </div>
  );
}

// ============================================
// RATING BREAKDOWN COMPONENT
// ============================================

interface RatingBreakdownProps {
  ratings: { stars: number; count: number }[];
  totalReviews: number;
  averageRating: number;
}

export function RatingBreakdown({ ratings, totalReviews, averageRating }: RatingBreakdownProps) {
  const maxCount = Math.max(...ratings.map((r) => r.count));

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
      <div className="flex flex-col sm:flex-row gap-8">
        {/* Average Rating */}
        <div className="text-center sm:text-left">
          <div className="text-5xl font-bold text-gray-900 mb-2">{averageRating.toFixed(1)}</div>
          <StarRating rating={Math.round(averageRating)} size={20} />
          <p className="text-sm text-gray-500 mt-2">{totalReviews.toLocaleString()} verified reviews</p>
        </div>

        {/* Rating Distribution */}
        <div className="flex-1 space-y-2">
          {[5, 4, 3, 2, 1].map((stars) => {
            const rating = ratings.find((r) => r.stars === stars);
            const count = rating?.count || 0;
            const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;

            return (
              <div key={stars} className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-12">{stars} ★</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-linear-to-r from-primary-500 to-secondary-500 rounded-full"
                    initial={{ width: 0 }}
                    whileInView={{ width: `${percentage}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: (5 - stars) * 0.1 }}
                  />
                </div>
                <span className="text-sm text-gray-500 w-12 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================
// TRUST INDICATORS COMPONENT
// ============================================

export function TrustIndicators() {
  const indicators = [
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      title: "Verified Service",
      description: "Reviews only from completed bookings",
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
      title: "Secure Feedback",
      description: "Protected and private submissions",
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      title: "Real Users",
      description: "Authentic verified identities",
    },
  ];

  return (
    <div className="flex flex-wrap justify-center gap-6 sm:gap-10">
      {indicators.map((indicator, index) => (
        <motion.div
          key={indicator.title}
          className="flex items-center gap-3"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.1 }}
        >
          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
            {indicator.icon}
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">{indicator.title}</p>
            <p className="text-xs text-gray-500">{indicator.description}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ============================================
// REVIEW FILTER TABS
// ============================================

interface ReviewFilterTabsProps {
  activeTab: "all" | "care_seekers" | "caregivers";
  onTabChange: (tab: "all" | "care_seekers" | "caregivers") => void;
  counts: { all: number; care_seekers: number; caregivers: number };
}

export function ReviewFilterTabs({ activeTab, onTabChange, counts }: ReviewFilterTabsProps) {
  const tabs = [
    { id: "all" as const, label: "All Reviews", count: counts.all },
    { id: "care_seekers" as const, label: "From Care Seekers", count: counts.care_seekers },
    { id: "caregivers" as const, label: "From Caregivers", count: counts.caregivers },
  ];

  return (
    <div className="inline-flex bg-gray-100 rounded-xl p-1.5">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`
            relative px-4 py-2 rounded-lg text-sm font-medium transition-all
            ${activeTab === tab.id ? "text-white" : "text-gray-600 hover:text-gray-900"}
          `}
        >
          {activeTab === tab.id && (
            <motion.div
              layoutId="review-tab-bg"
              className="absolute inset-0 bg-linear-to-r from-primary-500 to-secondary-500 rounded-lg"
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-2">
            {tab.label}
            <span
              className={`
                px-1.5 py-0.5 rounded text-xs
                ${activeTab === tab.id ? "bg-white/20" : "bg-gray-200"}
              `}
            >
              {tab.count}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}

// ============================================
// FEEDBACK INFO PANEL
// ============================================

export function FeedbackInfoPanel() {
  return (
    <motion.div
      className="bg-linear-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-linear-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white shrink-0">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">How Our Review System Works</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Reviews appear only after a booking is marked &quot;Completed&quot;
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Both parties can rate each other: Care Seeker ↔ Caregiver
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Feedback becomes visible once service and verification are complete
            </li>
          </ul>
        </div>
      </div>
    </motion.div>
  );
}

export default ScatterTestimonials;
