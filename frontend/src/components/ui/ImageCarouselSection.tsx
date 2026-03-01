"use client";

import React from "react";
import { motion, type Variants } from "framer-motion";
import { Heart, Home, Handshake, Sparkles } from "lucide-react";
import { ImageSwiper, type CardData } from "./ImageSwiper";

// Animation Variants
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { y: 30, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 12,
    },
  },
};

interface ImageCarouselSectionProps {
  title?: string;
  subtitle?: string;
  cards: CardData[];
  cardWidth?: number;
  cardHeight?: number;
  className?: string;
  autoSwipeInterval?: number; // Auto swipe interval in milliseconds
  enableAutoSwipe?: boolean; // Enable/disable auto swipe
}

export const ImageCarouselSection: React.FC<ImageCarouselSectionProps> = ({
  title = "Our Care Stories",
  subtitle = "Real moments of compassion and connection from our CareConnect community",
  cards,
  cardWidth = 380,
  cardHeight = 480,
  className = "",
  autoSwipeInterval = 4000, // Default 4 seconds
  enableAutoSwipe = true,
}) => {
  return (
    <section
      className={`relative w-full py-12 sm:py-16 lg:py-24 overflow-hidden bg-linear-to-b from-white via-[#F8F5FF]/20 to-[#F0F5FF]/30 ${className}`}
    >
      {/* Background Decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 -left-40 w-[400px] h-[400px] bg-linear-to-br from-primary-500/5 to-secondary-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 -right-40 w-[500px] h-[500px] bg-linear-to-tl from-secondary-500/5 to-primary-500/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
      >
        {/* Header */}
        <motion.div className="text-center mb-12" variants={itemVariants}>
          <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#F8F5FF] text-secondary-500 font-medium rounded-full text-sm mb-4 border border-secondary-500/10">
            <Sparkles className="w-4 h-4" /> Community Gallery
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            {title.split(" ").slice(0, -1).join(" ")}{" "}
            <span className="bg-linear-to-r from-primary-500 to-secondary-500 bg-clip-text text-transparent">
              {title.split(" ").slice(-1)}
            </span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            {subtitle}
          </p>
        </motion.div>

        {/* Swiper Container */}
        <motion.div
          className="flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-12 xl:gap-16"
          variants={itemVariants}
        >
          {/* Image Swiper */}
          <div className="relative shrink-0">
            {/* Glow effect behind the cards */}
            <div className="absolute inset-0 bg-linear-to-br from-primary-500/25 to-secondary-500/25 rounded-3xl blur-3xl scale-90 -z-10" />
            
            <ImageSwiper
              cards={cards}
              cardWidth={cardWidth}
              cardHeight={cardHeight}
              className="relative z-10"
              autoSwipeInterval={autoSwipeInterval}
              enableAutoSwipe={enableAutoSwipe}
            />
          </div>

          {/* Side Content */}
          <div className="max-w-sm lg:max-w-md text-center lg:text-left px-4 sm:px-0">
            <div className="space-y-4 sm:space-y-6">
              {/* Feature 1 */}
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-linear-to-br from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-[#4461F2]/20">
                  <Heart className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm sm:text-base mb-0.5 sm:mb-1">Compassionate Care</h3>
                  <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">
                    Every caregiver brings warmth and dedication to their work
                  </p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-linear-to-br from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-[#4461F2]/20">
                  <Home className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm sm:text-base mb-0.5 sm:mb-1">Home-Based Support</h3>
                  <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">
                    Professional care delivered in the comfort of your home
                  </p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-linear-to-br from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-[#4461F2]/20">
                  <Handshake className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm sm:text-base mb-0.5 sm:mb-1">Trusted Connections</h3>
                  <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">
                    Building meaningful relationships between families and caregivers
                  </p>
                </div>
              </div>
            </div>

            {/* Swipe Instruction */}
            <div className="mt-6 sm:mt-8 flex items-center justify-center lg:justify-start gap-2 text-xs sm:text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
                <span>Auto-playing • Swipe to explore manually</span>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
};

// Default card data for CareConnect
export const careConnectCards: CardData[] = [
  {
    id: 1,
    imageUrl: "/about-uspage/1697-Home-care-industry_Hero_Desktop@2x-1.jpg",
    title: "Home Care Excellence",
  },
  {
    id: 2,
    imageUrl: "/about-uspage/2187-Sign-up-form_image-update_employee-app-360-funnel_313x534px-3.webp",
    title: "Easy Onboarding",
  },
  {
    id: 3,
    imageUrl: "/about-uspage/2188-HR-hub-page-update-04@2x.webp",
    title: "Professional Team",
  },
  {
    id: 4,
    imageUrl: "/about-uspage/2188-HR-hub-page-update-05@2x.webp",
    title: "Quality Assurance",
  },
  {
    id: 5,
    imageUrl: "/about-uspage/3-SBP-INFORMATIVE-COMPONENT@2x-1.webp",
    title: "Trusted Platform",
  },
  {
    id: 6,
    imageUrl: "/about-uspage/3_Desktop_1697@2x-1.png",
    title: "Caring Community",
  },
  {
    id: 7,
    imageUrl: "/about-uspage/ing-newest.jpg",
    title: "Happy Families",
  },
];

export default ImageCarouselSection;
