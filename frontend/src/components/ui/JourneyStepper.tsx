"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";

// ============================================
// TYPES
// ============================================

export interface JourneyStep {
  id: string;
  title: string;
  description: string;
  icon?: React.ReactNode;
  emoji?: string;
  badge?: {
    text: string;
    variant: "new" | "pro" | "epic" | "win" | "default";
  };
}

export interface JourneyStepperProps {
  steps: JourneyStep[];
  activeStep?: number;
  onStepClick?: (index: number) => void;
  autoPlay?: boolean;
  autoPlayInterval?: number;
  showConfetti?: boolean;
  layout?: "curve" | "vertical";
  theme?: {
    primaryColor?: string;
    accentColor?: string;
    pathColor?: string;
    backgroundColor?: string;
  };
  className?: string;
}

// ============================================
// CONFETTI COMPONENT
// ============================================

const ConfettiPiece = ({ delay, x, color }: { delay: number; x: number; color: string }) => (
  <motion.div
    className="absolute w-2 h-2 rounded-sm"
    style={{ backgroundColor: color, left: `${x}%` }}
    initial={{ y: -20, opacity: 1, rotate: 0, scale: 1 }}
    animate={{
      y: [0, 400],
      opacity: [1, 1, 0],
      rotate: [0, 360, 720],
      scale: [1, 0.8, 0.5],
      x: [0, (Math.random() - 0.5) * 100],
    }}
    transition={{
      duration: 2.5,
      delay,
      ease: "easeOut",
    }}
  />
);

const Confetti = ({ show }: { show: boolean }) => {
  const colors = ["#4461F2", "#8B54F7", "#F59E0B", "#10B981", "#EF4444", "#EC4899"];
  const pieces = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    delay: Math.random() * 0.3,
    x: Math.random() * 100,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {pieces.map((piece) => (
            <ConfettiPiece key={piece.id} {...piece} />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
};

// ============================================
// FLOATING PARTICLES
// ============================================

const FloatingParticles = () => {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    size: Math.random() * 6 + 2,
    x: Math.random() * 100,
    y: Math.random() * 100,
    duration: Math.random() * 3 + 2,
    delay: Math.random() * 2,
    color: Math.random() > 0.5 ? "#4461F2" : "#EC4899",
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full opacity-40"
          style={{
            width: particle.size,
            height: particle.size,
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            backgroundColor: particle.color,
          }}
          animate={{
            y: [0, -20, 0],
            x: [0, 10, 0],
            opacity: [0.2, 0.5, 0.2],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};

// ============================================
// BADGE COMPONENT
// ============================================

const StepBadge = ({ text, variant }: { text: string; variant: string }) => {
  const variants: Record<string, string> = {
    new: "bg-linear-to-r from-amber-400 to-orange-500 text-white",
    pro: "bg-linear-to-r from-blue-500 to-indigo-600 text-white",
    epic: "bg-linear-to-r from-purple-500 to-pink-500 text-white",
    win: "bg-linear-to-r from-emerald-500 to-teal-500 text-white",
    default: "bg-gray-100 text-gray-600",
  };

  return (
    <motion.span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${variants[variant] || variants.default}`}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 15, delay: 0.2 }}
    >
      {text}
    </motion.span>
  );
};

// ============================================
// STEP CARD COMPONENT
// ============================================

interface StepCardProps {
  step: JourneyStep;
  isActive: boolean;
  isCompleted: boolean;
  onClick: () => void;
  position: { x: number; y: number };
  delay: number;
}

const StepCard = ({ step, isActive, isCompleted, onClick, position, delay }: StepCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(cardRef, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={cardRef}
      className="absolute"
      style={{ left: position.x, top: position.y }}
      initial={{ opacity: 0, scale: 0.8, y: 30 }}
      animate={isInView ? { opacity: 1, scale: 1, y: 0 } : {}}
      transition={{
        duration: 0.6,
        delay: delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <motion.div
        onClick={onClick}
        className={`
          relative bg-white rounded-2xl p-5 shadow-lg cursor-pointer
          border-2 transition-colors duration-300 min-w-[200px] max-w-[260px]
          ${isActive 
            ? "border-primary-500 shadow-[0_0_30px_rgba(68,97,242,0.2)]" 
            : "border-gray-100 hover:border-gray-200"
          }
        `}
        whileHover={{ scale: 1.03, y: -4 }}
        whileTap={{ scale: 0.98 }}
        animate={isActive ? { scale: 1.05 } : { scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        {/* Glow Effect for Active */}
        {isActive && (
          <motion.div
            className="absolute inset-0 rounded-2xl bg-linear-to-r from-primary-500/10 to-secondary-500/10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          />
        )}

        {/* Content */}
        <div className="relative z-10">
          {/* Header with Icon and Badge */}
          <div className="flex items-start justify-between mb-3">
            {/* Icon Container */}
            <motion.div
              className={`
                w-12 h-12 rounded-xl flex items-center justify-center text-2xl
                ${isActive 
                  ? "bg-linear-to-br from-primary-500 to-secondary-500 text-white shadow-lg shadow-[#4461F2]/30" 
                  : isCompleted
                    ? "bg-linear-to-br from-emerald-500 to-teal-500 text-white"
                    : "bg-gray-100 text-gray-600"
                }
              `}
              animate={isActive ? { rotate: [0, -5, 5, 0] } : {}}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              {step.icon || step.emoji || <Sparkles className="w-5 h-5" />}
            </motion.div>

            {/* Badge */}
            {step.badge && (
              <StepBadge text={step.badge.text} variant={step.badge.variant} />
            )}
          </div>

          {/* Title */}
          <h3 className={`font-semibold text-lg mb-1 transition-colors ${isActive ? "text-gray-900" : "text-gray-700"}`}>
            {step.title}
          </h3>

          {/* Description */}
          <p className="text-sm text-gray-500 leading-relaxed">
            {step.description}
          </p>

          {/* Completion Indicator */}
          {isCompleted && (
            <motion.div
              className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 15 }}
            >
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

// ============================================
// SVG CURVED PATH
// ============================================

interface CurvedPathProps {
  progress: number;
  positions: { x: number; y: number }[];
  pathColor?: string;
}

const CurvedPath = ({ progress, positions, pathColor = "#4461F2" }: CurvedPathProps) => {
  if (positions.length < 2) return null;

  // Generate smooth bezier curve path through all points
  const generatePath = () => {
    const cardCenterOffset = { x: 100, y: 60 }; // Approximate card center
    const points = positions.map(p => ({
      x: p.x + cardCenterOffset.x,
      y: p.y + cardCenterOffset.y,
    }));

    let path = `M ${points[0].x} ${points[0].y}`;
    
    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];
      const midX = (current.x + next.x) / 2;
      
      // Create smooth curves using quadratic bezier
      const cp1x = current.x + (midX - current.x) * 0.8;
      const cp1y = current.y;
      const cp2x = midX + (next.x - midX) * 0.2;
      const cp2y = next.y;
      
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
    }
    
    return path;
  };

  const pathD = generatePath();

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
      <defs>
        <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={pathColor} />
          <stop offset="100%" stopColor="#8B54F7" />
        </linearGradient>
      </defs>
      
      {/* Background Path */}
      <motion.path
        d={pathD}
        fill="none"
        stroke="#E5E7EB"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="8 8"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
      />
      
      {/* Animated Progress Path */}
      <motion.path
        d={pathD}
        fill="none"
        stroke="url(#pathGradient)"
        strokeWidth="3"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: progress }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
    </svg>
  );
};

// ============================================
// PROGRESS BAR
// ============================================

const ProgressBar = ({ progress }: { progress: number }) => (
  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-8">
    <motion.div
      className="h-full bg-linear-to-r from-primary-500 via-[#8B54F7] to-primary-500 bg-[length:200%_100%]"
      initial={{ width: 0 }}
      animate={{ 
        width: `${progress * 100}%`,
        backgroundPosition: ["0% 0%", "100% 0%"],
      }}
      transition={{ 
        width: { duration: 0.5, ease: "easeOut" },
        backgroundPosition: { duration: 2, repeat: Infinity, ease: "linear" },
      }}
    />
  </div>
);

// ============================================
// MAIN JOURNEY STEPPER COMPONENT
// ============================================

export function JourneyStepper({
  steps,
  activeStep = 0,
  onStepClick,
  autoPlay = false,
  autoPlayInterval = 3000,
  showConfetti = true,
  layout = "curve",
  theme = {},
  className = "",
}: JourneyStepperProps) {
  const [currentStep, setCurrentStep] = useState(activeStep);
  const [showConfettiEffect, setShowConfettiEffect] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: "-100px" });
  
  const { 
    primaryColor = "#4461F2",
    backgroundColor = "#FAFBFC",
  } = theme;

  // Calculate positions for curved layout
  const calculatePositions = () => {
    const positions: { x: number; y: number }[] = [];
    const totalSteps = steps.length;
    
    if (layout === "curve") {
      // Create a flowing curved layout
      const curveConfigs = [
        { x: 40, y: 350 },    // Bottom left - Discovery
        { x: 280, y: 150 },   // Upper middle - Learning
        { x: 620, y: 220 },   // Middle right - Creating
        { x: 900, y: 80 },    // Top right - Success
      ];
      
      for (let i = 0; i < totalSteps; i++) {
        if (i < curveConfigs.length) {
          positions.push(curveConfigs[i]);
        } else {
          // Fallback for additional steps
          positions.push({
            x: 100 + (i * 250),
            y: 150 + Math.sin(i * 0.8) * 100,
          });
        }
      }
    } else {
      // Vertical layout
      for (let i = 0; i < totalSteps; i++) {
        positions.push({
          x: 100,
          y: 80 + i * 180,
        });
      }
    }
    
    return positions;
  };

  const positions = calculatePositions();

  // Handle step click
  const handleStepClick = (index: number) => {
    setCurrentStep(index);
    onStepClick?.(index);
    
    // Show confetti on final step
    if (showConfetti && index === steps.length - 1) {
      setShowConfettiEffect(true);
      setTimeout(() => setShowConfettiEffect(false), 3000);
    }
  };

  // Auto-play functionality
  useEffect(() => {
    if (!autoPlay || !isInView) return;
    
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        const next = (prev + 1) % steps.length;
        if (showConfetti && next === steps.length - 1) {
          setShowConfettiEffect(true);
          setTimeout(() => setShowConfettiEffect(false), 3000);
        }
        return next;
      });
    }, autoPlayInterval);
    
    return () => clearInterval(interval);
  }, [autoPlay, autoPlayInterval, isInView, steps.length, showConfetti]);

  // Sync with external activeStep
  useEffect(() => {
    setCurrentStep(activeStep);
  }, [activeStep]);

  const progress = (currentStep + 1) / steps.length;

  return (
    <>
      <Confetti show={showConfettiEffect} />
      
      <div
        ref={containerRef}
        className={`relative w-full ${className}`}
        style={{ backgroundColor }}
      >
        {/* Progress Bar */}
        <ProgressBar progress={progress} />
        
        {/* Journey Container */}
        <div 
          className="relative overflow-hidden rounded-3xl border border-gray-100 bg-linear-to-br from-white to-gray-50/50"
          style={{ minHeight: layout === "curve" ? "520px" : `${steps.length * 180 + 100}px` }}
        >
          {/* Floating Particles Background */}
          <FloatingParticles />
          
          {/* Curved Path */}
          {layout === "curve" && (
            <CurvedPath 
              progress={progress} 
              positions={positions}
              pathColor={primaryColor}
            />
          )}
          
          {/* Step Cards */}
          {steps.map((step, index) => (
            <StepCard
              key={step.id}
              step={step}
              isActive={index === currentStep}
              isCompleted={index < currentStep}
              onClick={() => handleStepClick(index)}
              position={positions[index] || { x: 0, y: 0 }}
              delay={index * 0.15}
            />
          ))}
        </div>
        
        {/* Step Navigation Dots */}
        <div className="flex items-center justify-center gap-2 mt-6">
          {steps.map((_, index) => (
            <motion.button
              key={index}
              onClick={() => handleStepClick(index)}
              className={`rounded-full transition-all ${
                index === currentStep
                  ? "w-8 h-3 bg-linear-to-r from-primary-500 to-secondary-500"
                  : index < currentStep
                    ? "w-3 h-3 bg-emerald-500"
                    : "w-3 h-3 bg-gray-200 hover:bg-gray-300"
              }`}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              aria-label={`Go to step ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </>
  );
}

// ============================================
// VERTICAL JOURNEY STEPPER (Mobile Optimized)
// ============================================

export function VerticalJourneyStepper({
  steps,
  activeStep = 0,
  onStepClick,
  showConfetti = true,
  className = "",
}: Omit<JourneyStepperProps, "layout">) {
  const [currentStep, setCurrentStep] = useState(activeStep);
  const [showConfettiEffect, setShowConfettiEffect] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleStepClick = (index: number) => {
    setCurrentStep(index);
    onStepClick?.(index);
    
    if (showConfetti && index === steps.length - 1) {
      setShowConfettiEffect(true);
      setTimeout(() => setShowConfettiEffect(false), 3000);
    }
  };

  useEffect(() => {
    setCurrentStep(activeStep);
  }, [activeStep]);

  return (
    <>
      <Confetti show={showConfettiEffect} />
      
      <div ref={containerRef} className={`relative ${className}`}>
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;
          const isLast = index === steps.length - 1;

          return (
            <motion.div
              key={step.id}
              className="relative flex gap-4 pb-8"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
            >
              {/* Timeline Line */}
              {!isLast && (
                <div className="absolute left-6 top-14 w-0.5 h-[calc(100%-3.5rem)] bg-gray-200">
                  <motion.div
                    className="w-full bg-linear-to-b from-primary-500 to-secondary-500"
                    initial={{ height: 0 }}
                    animate={{ height: isCompleted ? "100%" : "0%" }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  />
                </div>
              )}

              {/* Step Icon */}
              <motion.div
                onClick={() => handleStepClick(index)}
                className={`
                  relative z-10 w-12 h-12 rounded-xl flex items-center justify-center text-xl cursor-pointer
                  ${isActive 
                    ? "bg-linear-to-br from-primary-500 to-secondary-500 text-white shadow-lg shadow-[#4461F2]/30" 
                    : isCompleted
                      ? "bg-emerald-500 text-white"
                      : "bg-gray-100 text-gray-500"
                  }
                `}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                {isCompleted ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step.icon || step.emoji || <Sparkles className="w-5 h-5" />
                )}
              </motion.div>

              {/* Step Content */}
              <motion.div
                onClick={() => handleStepClick(index)}
                className={`
                  flex-1 bg-white rounded-xl p-4 border-2 cursor-pointer transition-all
                  ${isActive 
                    ? "border-primary-500 shadow-lg shadow-[#4461F2]/10" 
                    : "border-gray-100 hover:border-gray-200"
                  }
                `}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-start justify-between mb-1">
                  <h3 className={`font-semibold ${isActive ? "text-gray-900" : "text-gray-700"}`}>
                    {step.title}
                  </h3>
                  {step.badge && (
                    <StepBadge text={step.badge.text} variant={step.badge.variant} />
                  )}
                </div>
                <p className="text-sm text-gray-500">{step.description}</p>
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </>
  );
}

// ============================================
// RESPONSIVE JOURNEY STEPPER
// ============================================

export function ResponsiveJourneyStepper(props: JourneyStepperProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  if (isMobile) {
    return <VerticalJourneyStepper {...props} />;
  }

  return <JourneyStepper {...props} />;
}

export default JourneyStepper;
