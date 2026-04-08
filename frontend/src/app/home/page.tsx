"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Search,
  ClipboardList,
  MessageCircle,
  Heart,
  Baby,
  Users,
  Stethoscope,
  Brain,
  Home,
  Moon,
  Shield,
  Star,
  CheckCircle,
  ArrowRight,
  BadgeCheck,
  Clock,
  MapPin,
  Quote,
  Zap,
  Award,
  TrendingUp,
  HeartHandshake,
  Sparkles,
} from "lucide-react";
import { Navbar, Footer } from "@/components";
import { useLanguage } from "@/context";
import { useAuth } from "@/hooks";
import { CARE_CATEGORIES } from "@/lib/constants";
import { caregiverService } from "@/services";
import {
  ImageCarouselSection,
  careConnectCards,
} from "@/components/ui/ImageCarouselSection";

// Icon mapping for care categories (replaces emojis)
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  childCare: <Baby className="w-7 h-7" />,
  seniorCare: <Users className="w-7 h-7" />,
  medicalCare: <Stethoscope className="w-7 h-7" />,
  specialNeeds: <Brain className="w-7 h-7" />,
  homeCare: <Home className="w-7 h-7" />,
  overnightCare: <Moon className="w-7 h-7" />,
};

type FeaturedCaregiver = {
  id: string;
  name: string;
  role: string;
  rating: number;
  reviews: number;
  hourlyRate: number;
  avatar: string;
  verified: boolean;
};

const FEATURED_CAREGIVERS_FALLBACK: FeaturedCaregiver[] = [
  {
    id: "1",
    name: "Sarah Johnson",
    role: "Senior Care",
    rating: 4.9,
    reviews: 127,
    hourlyRate: 25,
    avatar: "S",
    verified: true,
  },
  {
    id: "2",
    name: "Michael Chen",
    role: "Child Care",
    rating: 4.8,
    reviews: 98,
    hourlyRate: 22,
    avatar: "M",
    verified: true,
  },
  {
    id: "3",
    name: "Emily Davis",
    role: "Special Needs",
    rating: 5.0,
    reviews: 85,
    hourlyRate: 30,
    avatar: "E",
    verified: true,
  },
  {
    id: "4",
    name: "James Wilson",
    role: "Elderly Care",
    rating: 4.7,
    reviews: 156,
    hourlyRate: 28,
    avatar: "J",
    verified: true,
  },
];

// Framer Motion variants
const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: "easeOut" } },
};

export default function HomePage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const [featuredCaregivers, setFeaturedCaregivers] = useState<FeaturedCaregiver[]>(FEATURED_CAREGIVERS_FALLBACK);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    let isActive = true;

    const loadFeaturedCaregivers = async () => {
      try {
        const response = await caregiverService.getFeaturedCaregivers(8);
        const apiCaregivers = response.data?.caregivers || [];

        const mapped = apiCaregivers.map((cg, index) => {
          const fullName = cg.fullName || "Caregiver";
          return {
            id: cg._id || `featured-${index}`,
            name: fullName,
            role: (cg.serviceTypes?.[0] || "General Care").replace(/_/g, " "),
            rating: Number(cg.rating || 0),
            reviews: Number(cg.totalReviews || 0),
            hourlyRate: Number(cg.hourlyRate || 0),
            avatar: fullName.charAt(0).toUpperCase(),
            verified: Boolean(cg.backgroundCheckStatus === "passed" || cg.status === "active"),
          } satisfies FeaturedCaregiver;
        });

        if (isActive && mapped.length > 0) {
          setFeaturedCaregivers(mapped);
        }
      } catch {
        // Keep fallback list to preserve homepage UX when API is unavailable.
      }
    };

    loadFeaturedCaregivers();

    return () => {
      isActive = false;
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(
      `/search?q=${encodeURIComponent(searchQuery)}&category=${encodeURIComponent(selectedCategory)}`
    );
  };

  // How it works steps with lucide icons
  const howItWorksSteps = [
    {
      step: 1,
      title: "Create Account",
      description: "Sign up and tell us about your care needs — takes less than 2 minutes.",
      icon: <ClipboardList className="w-8 h-8 text-white" />,
    },
    {
      step: 2,
      title: "Find Caregivers",
      description: "Browse verified caregivers in your area, filtered by specialty and availability.",
      icon: <Search className="w-8 h-8 text-white" />,
    },
    {
      step: 3,
      title: "Book & Connect",
      description: "Book your preferred caregiver, sign an agreement, and start care securely.",
      icon: <MessageCircle className="w-8 h-8 text-white" />,
    },
    {
      step: 4,
      title: "Start Care",
      description: "Receive trusted care and track progress with confidence through daily logs.",
      icon: <Heart className="w-8 h-8 text-white" />,
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* ===== HERO SECTION ===== */}
      <section className="relative bg-linear-to-br from-[#F0F5FF] via-white to-[#F8F5FF] py-8 lg:py-16 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Right Content - Hero Visual (prioritized first on small screens) */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="order-1 lg:order-2 flex items-center justify-center relative"
            >
              <div className="relative max-w-140 w-full">
                {/* Main Map Image */}
                <Image
                  src="/home-page/map-high.png"
                  alt="CareConnect Global Network"
                  width={1400}
                  height={900}
                  priority
                  className="w-full h-auto rounded-3xl relative z-10"
                />

                {/* Floating Stat Cards - LEFT SIDE (top area) */}
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                  className="hidden sm:block absolute -top-20 left-0 bg-white/95 backdrop-blur-md rounded-2xl shadow-lg p-4 border border-[#E1E6EF] z-20"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary-500/10 rounded-xl">
                      <Shield className="w-5 h-5 text-primary-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {t.stats.trustedCommunity}
                      </p>
                      <p className="text-xs text-gray-500">Verified & Safe</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                  className="hidden sm:block absolute top-40 -left-12 bg-white/95 backdrop-blur-md rounded-2xl shadow-lg p-4 border border-[#E1E6EF] z-20"
                >
                  <div className="flex items-center gap-3">
                    <p className="text-xl font-bold text-gray-900">500+</p>
                    <p className="text-xs text-gray-500">
                      {t.stats.verifiedCaregivers}
                    </p>
                  </div>
                </motion.div>

                {/* Floating Stat Cards - RIGHT SIDE (bottom area) */}
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                  className="hidden sm:block absolute bottom-30 -right-4 bg-white/95 backdrop-blur-md rounded-2xl shadow-lg p-4 border border-[#E1E6EF] z-20"
                >
                  <p className="text-xl font-bold text-gray-900">10K+</p>
                  <p className="text-xs text-gray-500">
                    {t.stats.happyFamilies}
                  </p>
                </motion.div>

                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
                  className="hidden sm:block absolute top-70 -right-8 bg-white/95 backdrop-blur-md rounded-2xl shadow-lg p-4 border border-[#E1E6EF] z-20"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className="w-4 h-4 text-yellow-400 fill-yellow-400"
                        />
                      ))}
                    </div>
                    <span className="font-bold text-gray-900">4.9</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {t.stats.averageRating}
                  </p>
                </motion.div>
              </div>
            </motion.div>

            {/* Left Content */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="order-2 lg:order-1"
            >
              {/* Welcome Message for Logged-in Users */}
              {isMounted && user && (
                <motion.div
                  variants={fadeInUp}
                  className="mb-6 p-4 bg-linear-to-r from-primary-500/10 to-secondary-500/10 rounded-2xl border border-primary-500/20"
                >
                  <p className="text-lg text-gray-800">
                    Welcome{" "}
                    <span className="font-bold text-primary-500">
                      {user.fullName?.toUpperCase()}
                    </span>
                    , what would you like to do today?
                  </p>
                </motion.div>
              )}

              <motion.h1
                variants={fadeInUp}
                className="text-3xl sm:text-4xl lg:text-2xl xl:text-2xl font-bold text-gray-900 leading-tight mb-6"
              >
                {t.hero.title}{" "}
                <span className="text-primary-500">{t.hero.titleHighlight}</span>{" "}
                {t.hero.titleSuffix}
              </motion.h1>

              <motion.p
                variants={fadeInUp}
                className="text-lg text-gray-600 mb-8 max-w-xl"
              >
                {t.hero.subtitle}
              </motion.p>

              {/* Search Form */}
              <motion.form
                variants={fadeInUp}
                onSubmit={handleSearch}
                className="bg-white rounded-2xl shadow-xl p-2 border border-[#E1E6EF]"
              >
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder={t.hero.searchPlaceholder}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border-0 focus:ring-2 focus:ring-[#4461F2]/20 outline-none text-sm bg-[#F0F5FF] text-gray-900 placeholder:text-gray-400"
                    />
                  </div>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-4 py-3 rounded-xl border-0 focus:ring-2 focus:ring-[#4461F2]/20 outline-none text-sm bg-[#F0F5FF] text-gray-900 sm:w-48"
                  >
                    <option value="">{t.common.filter}</option>
                    <option value="child-care">{t.categories.childCare}</option>
                    <option value="senior-care">{t.categories.seniorCare}</option>
                    <option value="medical-care">{t.categories.medicalCare}</option>
                    <option value="special-needs">{t.categories.specialNeeds}</option>
                  </select>
                  <button
                    type="submit"
                    className="px-8 py-3 bg-primary-500 hover:bg-[#2F4BDB] text-white font-medium rounded-xl transition-colors shadow-lg shadow-[#4461F2]/25"
                  >
                    {t.hero.searchButton}
                  </button>
                </div>
              </motion.form>

              {/* Trust Badges */}
              <motion.div variants={fadeInUp} className="flex flex-wrap gap-6 mt-8">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-gray-600">
                    {t.trustBadges.backgroundChecked}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-gray-600">
                    {t.trustBadges.verifiedReviews}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-gray-600">
                    {t.trustBadges.securePayments}
                  </span>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== CARE CATEGORIES SECTION ===== */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={staggerContainer}
        className="py-16 lg:py-24 bg-white"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={fadeInUp} className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              {t.sections.browseCategories}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {t.sections.browseCategoriesSubtitle}
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {CARE_CATEGORIES.map((category, index) => (
              <motion.div key={index} variants={scaleIn}>
                <Link
                  href={`/caregivers?category=${category.titleKey
                    .toLowerCase()
                    .replace(" ", "-")}`}
                  className="group bg-white rounded-2xl p-6 border border-[#E1E6EF] hover:border-primary-500 hover:shadow-xl transition-all text-center block"
                >
                  <div className="w-14 h-14 mx-auto mb-3 bg-linear-to-br from-primary-500/10 to-secondary-500/10 rounded-2xl flex items-center justify-center text-primary-500 group-hover:from-primary-500 group-hover:to-secondary-500 group-hover:text-white transition-all duration-300">
                    {CATEGORY_ICONS[category.titleKey] || (
                      <Heart className="w-7 h-7" />
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-primary-500 transition-colors">
                    {t.categories[category.titleKey as keyof typeof t.categories]}
                  </h3>
                  <p className="text-xs text-gray-500">{category.description}</p>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ===== FEATURED CAREGIVERS SECTION ===== */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={staggerContainer}
        className="py-16 lg:py-24 bg-[#F0F5FF]"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={fadeInUp} className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
                {t.sections.featuredCaregivers}
              </h2>
              <p className="text-lg text-gray-600">
                {t.sections.featuredCaregiversSubtitle}
              </p>
            </div>
            <Link
              href="/caregivers"
              className="hidden sm:flex items-center gap-2 text-primary-500 hover:text-[#2F4BDB] font-medium transition-colors"
            >
              {t.common.viewAll}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredCaregivers.map((caregiver) => (
              <motion.div key={caregiver.id} variants={scaleIn}>
                <Link
                  href={`/caregiver/${caregiver.id}`}
                  className="bg-white rounded-2xl p-6 border border-[#E1E6EF] hover:shadow-xl transition-all group block"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 bg-linear-to-br from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center text-white text-xl font-bold group-hover:scale-110 transition-transform">
                      {caregiver.avatar}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">
                          {caregiver.name}
                        </h3>
                        {caregiver.verified && (
                          <BadgeCheck className="w-4 h-4 text-primary-500" />
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{caregiver.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex">
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {caregiver.rating}
                    </span>
                    <span className="text-sm text-gray-500">
                      ({caregiver.reviews} {t.sections.reviews})
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-[#E1E6EF]">
                    <span className="text-xl font-bold text-primary-500">
                      Rs. {caregiver.hourlyRate?.toLocaleString("en-NP") ?? 0}
                      <span className="text-sm font-normal text-gray-500">
                        /hr
                      </span>
                    </span>
                    <span className="px-3 py-1 bg-[#F0F5FF] text-primary-500 text-xs font-medium rounded-full">
                      {t.sections.available}
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-8 sm:hidden">
            <Link
              href="/caregivers"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-primary-500 font-medium rounded-xl border border-primary-500/30 hover:bg-[#F0F5FF] transition-colors"
            >
              {t.common.viewAll} {t.sections.caregivers}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </motion.section>

      {/* ===== HOW IT WORKS SECTION ===== */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={staggerContainer}
        className="py-20 lg:py-28 bg-white relative overflow-hidden"
      >
        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-[#F0F5FF] rounded-full blur-3xl opacity-50" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-[#F8F5FF] rounded-full blur-3xl opacity-50" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div variants={fadeInUp} className="text-center mb-16">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-[#F0F5FF] text-primary-500 rounded-full text-sm font-semibold mb-4">
              <Zap className="w-4 h-4" />
              Simple Process
            </span>
            <h2 className="text-3xl lg:text-5xl font-bold text-gray-900 mb-4">
              How It <span className="text-primary-500">Works</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Get professional care for your loved ones in 4 simple steps
            </p>
          </motion.div>

          {/* Steps with connecting line */}
          <div className="relative">
            <div className="hidden lg:block absolute top-20 left-[12%] right-[12%] h-1 bg-linear-to-r from-[#E1E6EF] via-[#4461F2] to-[#E1E6EF] rounded-full" />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
              {howItWorksSteps.map((item) => (
                <motion.div key={item.step} variants={scaleIn} className="relative group">
                  <div className="bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 border border-[#E1E6EF] hover:border-primary-500/30 hover:-translate-y-2 text-center h-full">
                    <div className="relative inline-block mb-6">
                      <div className="w-20 h-20 bg-linear-to-br from-primary-500 to-secondary-500 rounded-2xl flex items-center justify-center shadow-xl shadow-[#4461F2]/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                        {item.icon}
                      </div>
                      <span className="absolute -top-3 -right-3 w-10 h-10 bg-white border-2 border-primary-500 rounded-full flex items-center justify-center text-primary-500 font-bold text-lg shadow-lg">
                        {item.step}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-primary-500 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  {item.step < howItWorksSteps.length && (
                    <div className="hidden md:block lg:hidden absolute -right-4 top-1/2 -translate-y-1/2 text-primary-500/40">
                      <ArrowRight className="w-8 h-8" />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          <motion.div variants={fadeInUp} className="text-center mt-12">
            <Link
              href="/how-it-works"
              className="inline-flex items-center gap-2 px-8 py-4 bg-primary-500 hover:bg-[#2F4BDB] text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
            >
              {t.common.learnMore}
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </motion.section>

      {/* ===== TRUST VIDEO SECTION ===== */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={staggerContainer}
        className="py-16 lg:py-24 bg-linear-to-b from-white to-[#F0F5FF]"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Video */}
            <motion.div variants={scaleIn} className="relative">
              <div className="rounded-3xl overflow-hidden shadow-2xl border border-[#E1E6EF]">
                <video
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="w-full h-auto aspect-video object-cover"
                  poster="/home-page/map-high.png"
                >
                  <source
                    src="/videos/7ae81da5-ef17-4b1d-b668-f5a56a25e75a.iStock-693916458.mp4"
                    type="video/mp4"
                  />
                </video>
              </div>
              {/* Play indicator */}
              <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2 shadow-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs font-medium text-gray-700">Now playing</span>
              </div>
            </motion.div>

            {/* Content */}
            <motion.div variants={staggerContainer}>
              <motion.span
                variants={fadeInUp}
                className="inline-block px-4 py-2 bg-[#F0F5FF] text-primary-500 rounded-full text-sm font-semibold mb-4"
              >
                Why families trust us
              </motion.span>
              <motion.h2
                variants={fadeInUp}
                className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6"
              >
                Real care, real connections, real peace of mind
              </motion.h2>
              <motion.p
                variants={fadeInUp}
                className="text-lg text-gray-600 mb-8 leading-relaxed"
              >
                Every caregiver on CareConnect is thoroughly vetted, background-checked,
                and committed to providing compassionate, professional care for your
                loved ones.
              </motion.p>

              <motion.div variants={staggerContainer} className="space-y-4">
                <motion.div variants={fadeInUp} className="flex items-start gap-4">
                  <div className="shrink-0 p-2.5 bg-green-50 rounded-xl">
                    <Shield className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">
                      Background verified
                    </h4>
                    <p className="text-sm text-gray-600">
                      Every caregiver passes comprehensive background checks and
                      identity verification
                    </p>
                  </div>
                </motion.div>

                <motion.div variants={fadeInUp} className="flex items-start gap-4">
                  <div className="shrink-0 p-2.5 bg-blue-50 rounded-xl">
                    <Clock className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">
                      Available 24/7
                    </h4>
                    <p className="text-sm text-gray-600">
                      Find care whenever you need it with flexible scheduling
                      and real-time availability
                    </p>
                  </div>
                </motion.div>

                <motion.div variants={fadeInUp} className="flex items-start gap-4">
                  <div className="shrink-0 p-2.5 bg-purple-50 rounded-xl">
                    <MapPin className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">
                      Local caregivers
                    </h4>
                    <p className="text-sm text-gray-600">
                      Connect with trusted caregivers in your neighborhood for
                      convenient, reliable care
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* ===== WHY CHOOSE CARECONNECT ===== */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={staggerContainer}
        className="py-20 lg:py-28 bg-[#F0F5FF] relative overflow-hidden"
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-secondary-500/5 rounded-full blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div variants={fadeInUp} className="text-center mb-16">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500/10 text-primary-600 rounded-full text-sm font-semibold mb-4">
              <Sparkles className="w-4 h-4" />
              Why Families Choose Us
            </span>
            <h2 className="text-3xl lg:text-5xl font-bold text-gray-900 mb-4">
              Why Choose <span className="text-primary-500">CareConnect?</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              We&apos;ve built the most trusted caregiving platform with features that matter most to families.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Shield,
                color: "from-emerald-500 to-teal-500",
                lightBg: "bg-emerald-50",
                lightText: "text-emerald-600",
                title: "Compassionate Care",
                description: "Every caregiver brings warmth and dedication. We handpick professionals who genuinely love what they do — providing care that feels like family.",
              },
              {
                icon: Home,
                color: "from-blue-500 to-indigo-500",
                lightBg: "bg-blue-50",
                lightText: "text-blue-600",
                title: "Home-Based Support",
                description: "Professional care delivered in the comfort of your home. No disruptive transitions — your loved ones stay in familiar surroundings.",
              },
              {
                icon: HeartHandshake,
                color: "from-purple-500 to-violet-500",
                lightBg: "bg-purple-50",
                lightText: "text-purple-600",
                title: "Trusted Connections",
                description: "Building meaningful, lasting relationships between families and caregivers based on trust, transparency, and mutual respect.",
              },
              {
                icon: Award,
                color: "from-amber-500 to-orange-500",
                lightBg: "bg-amber-50",
                lightText: "text-amber-600",
                title: "Verified Professionals",
                description: "Rigorous background checks, credential verification, and ongoing training ensure you always have the highest quality caregivers.",
              },
              {
                icon: Zap,
                color: "from-rose-500 to-pink-500",
                lightBg: "bg-rose-50",
                lightText: "text-rose-600",
                title: "Instant Matching",
                description: "Our AI-powered system instantly matches you with the best caregivers based on your specific needs, location, and preferences.",
              },
              {
                icon: TrendingUp,
                color: "from-cyan-500 to-sky-500",
                lightBg: "bg-cyan-50",
                lightText: "text-cyan-600",
                title: "Real-Time Tracking",
                description: "Monitor care sessions in real-time with daily logs, photo updates, and transparent reporting — complete peace of mind.",
              },
            ].map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  variants={scaleIn}
                  custom={index}
                  className="group bg-white rounded-3xl p-7 border border-[#E1E6EF] hover:border-primary-200 hover:shadow-2xl hover:-translate-y-1 transition-all duration-500"
                >
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3 group-hover:text-primary-600 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed text-sm">
                    {feature.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.section>

      {/* ===== WHAT OUR USERS SAY (REVIEWS) ===== */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={staggerContainer}
        className="py-20 lg:py-28 bg-white relative overflow-hidden"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={fadeInUp} className="text-center mb-16">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-600 rounded-full text-sm font-semibold mb-4">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              Trusted by Thousands
            </span>
            <h2 className="text-3xl lg:text-5xl font-bold text-gray-900 mb-4">
              What Our <span className="text-primary-500">Users Say</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Real stories from families and caregivers who found connection through CareConnect.
            </p>
          </motion.div>

          {/* Platform Stats */}
          <motion.div variants={fadeInUp} className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
            {[
              { value: "4.9★", label: "Average Rating", sub: "From 2,000+ reviews" },
              { value: "500+", label: "Verified Caregivers", sub: "Background checked" },
              { value: "10K+", label: "Happy Families", sub: "Across Nepal" },
              { value: "98%", label: "Satisfaction Rate", sub: "Repeat bookings" },
            ].map((stat) => (
              <div key={stat.label} className="text-center bg-[#F0F5FF] rounded-2xl p-6 border border-primary-100">
                <p className="text-3xl font-extrabold text-primary-600 mb-1">{stat.value}</p>
                <p className="text-sm font-bold text-gray-900">{stat.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{stat.sub}</p>
              </div>
            ))}
          </motion.div>

          {/* Review Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                name: "Sita Sharma",
                role: "Care Seeker — Kathmandu",
                avatar: "S",
                avatarBg: "from-rose-400 to-pink-500",
                rating: 5,
                review: "CareConnect changed our lives. We found a wonderful caregiver for my elderly mother within hours. The tracking system gives us complete peace of mind.",
                tag: "Elder Care",
                verified: true,
              },
              {
                name: "Ram Prasad Thapa",
                role: "Care Seeker — Pokhara",
                avatar: "R",
                avatarBg: "from-blue-400 to-indigo-500",
                rating: 5,
                review: "The booking process was seamless, payments secure, and our caregiver is absolutely amazing with our special needs child. Highly recommended!",
                tag: "Child Care",
                verified: true,
              },
              {
                name: "Anita Gurung",
                role: "Caregiver — Lalitpur",
                avatar: "A",
                avatarBg: "from-emerald-400 to-teal-500",
                rating: 5,
                review: "As a caregiver, CareConnect has given me a platform to do meaningful work, earn fairly, and build lasting relationships with wonderful families.",
                tag: "Professional Caregiver",
                verified: true,
              },
              {
                name: "Bimal KC",
                role: "Care Seeker — Bhaktapur",
                avatar: "B",
                avatarBg: "from-amber-400 to-orange-500",
                rating: 5,
                review: "The real-time log reviews and dispute system make everything transparent. I always know what my caregiver is doing. Trust at every step.",
                tag: "Disability Care",
                verified: true,
              },
              {
                name: "Puja Adhikari",
                role: "Caregiver — Kathmandu",
                avatar: "P",
                avatarBg: "from-purple-400 to-violet-500",
                rating: 5,
                review: "I love how CareConnect verifies everything. My clients trust me from day one because the platform builds credibility for genuine caregivers.",
                tag: "Senior Care",
                verified: true,
              },
              {
                name: "Mohan Shrestha",
                role: "Care Seeker — Chitwan",
                avatar: "M",
                avatarBg: "from-cyan-400 to-sky-500",
                rating: 5,
                review: "Customer support is excellent, the app is intuitive, and finding the right caregiver was so much easier than I expected. 5 stars without hesitation.",
                tag: "Home Care",
                verified: true,
              },
            ].map((review, index) => (
              <motion.div
                key={review.name}
                variants={scaleIn}
                custom={index}
                className="group bg-white rounded-3xl p-7 border border-[#E1E6EF] hover:border-primary-200 hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 relative overflow-hidden"
              >
                {/* Quote decoration */}
                <div className="absolute top-4 right-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Quote className="w-16 h-16 text-primary-500" />
                </div>

                {/* Stars */}
                <div className="flex items-center gap-0.5 mb-4">
                  {[...Array(review.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>

                {/* Review Text */}
                <p className="text-gray-700 leading-relaxed text-sm mb-6 italic">
                  &ldquo;{review.review}&rdquo;
                </p>

                {/* Reviewer */}
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${review.avatarBg} flex items-center justify-center text-white font-bold shadow-lg`}>
                    {review.avatar}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold text-gray-900">{review.name}</p>
                      {review.verified && (
                        <BadgeCheck className="w-4 h-4 text-primary-500" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{review.role}</p>
                  </div>
                  <span className="ml-auto px-2.5 py-1 bg-primary-50 text-primary-600 text-[10px] font-bold rounded-full">
                    {review.tag}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* View All Reviews CTA */}
          <motion.div variants={fadeInUp} className="text-center mt-12">
            <Link
              href="/caregivers"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-primary-600 font-semibold rounded-xl border-2 border-primary-200 hover:border-primary-500 hover:bg-primary-50 transition-all"
            >
              Find Your Caregiver
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </motion.section>

      {/* ===== CTA SECTION ===== */}
      <section className="py-16 lg:py-24 bg-linear-to-br from-primary-500 to-secondary-500 relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.h2
              variants={fadeInUp}
              className="text-3xl lg:text-4xl font-bold text-white mb-6"
            >
              {t.cta.title}
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="text-xl text-white/90 mb-8 max-w-2xl mx-auto"
            >
              {t.cta.subtitle}
            </motion.p>
            <motion.div
              variants={fadeInUp}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              {isMounted && user ? (
                <Link
                  href="/caregivers"
                  className="px-8 py-4 bg-white text-primary-500 font-semibold rounded-xl hover:bg-gray-100 transition-colors shadow-lg"
                >
                  {t.cta.browseCaregivers}
                </Link>
              ) : (
                <>
                  <Link
                    href="/register"
                    className="px-8 py-4 bg-white text-primary-500 font-semibold rounded-xl hover:bg-gray-100 transition-colors shadow-lg"
                  >
                    {t.cta.getStarted}
                  </Link>
                  <Link
                    href="/register?role=caregiver"
                    className="px-8 py-4 bg-transparent text-white font-semibold rounded-xl border-2 border-white hover:bg-white/10 transition-colors"
                  >
                    {t.cta.becomeCaregiver}
                  </Link>
                </>
              )}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Image Carousel Section */}
      <ImageCarouselSection
        title="Our Care Stories"
        subtitle="Real moments of compassion and connection from our CareConnect community"
        cards={careConnectCards}
      />

      <Footer />
    </div>
  );
}
