"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Shield, 
  Star,
  Heart,
  ChevronDown,
  ArrowRight,
  Sparkles,
  Play,
  CheckCircle2,
  Users,
  Clock,
  Award,
  FileText,
  UserCheck
} from "lucide-react";
import { ResponsiveJourneyStepper, JourneyStep } from "@/components/ui/JourneyStepper";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

// ============================================
// JOURNEY STEPS DATA
// ============================================

const FAMILY_STEPS: JourneyStep[] = [
  {
    id: "search",
    title: "Search & Request",
    description: "Browse verified caregivers and submit a booking request",
    emoji: "🔍",
    badge: { text: "Start Here", variant: "new" },
  },
  {
    id: "review",
    title: "Request Accepted",
    description: "Caregiver accepts your request; agreement is then required",
    emoji: "👍",
    badge: { text: "Pro Tip", variant: "pro" },
  },
  {
    id: "connect",
    title: "Agreement Required",
    description: "Both parties must accept the agreement to lock the booking",
    emoji: "📄",
  },
  {
    id: "book",
    title: "Payment & Start Care",
    description: "Complete payment to unlock chat and begin care sessions",
    emoji: "💳",
    badge: { text: "Easy!", variant: "epic" },
  },
];

const CAREGIVER_STEPS: JourneyStep[] = [
  {
    id: "register",
    title: "Create Profile",
    description: "Sign up and build your professional caregiver profile",
    emoji: "📝",
    badge: { text: "Free", variant: "new" },
  },
  {
    id: "verify",
    title: "Get Verified",
    description: "Complete background checks and document verification",
    emoji: "✅",
    badge: { text: "Trust Badge", variant: "pro" },
  },
  {
    id: "match",
    title: "Get Matched",
    description: "Connect with families looking for your expertise",
    emoji: "🤝",
  },
  {
    id: "earn",
    title: "Earn & Grow",
    description: "Build your reputation and grow your care business",
    emoji: "🌟",
    badge: { text: "Success!", variant: "win" },
  },
];

// ============================================
// FEATURES DATA
// ============================================

const FEATURES = [
  {
    icon: Shield,
    title: "Background Verified",
    description: "All caregivers undergo comprehensive background screening and identity verification",
    color: "from-blue-500 to-indigo-600",
  },
  {
    icon: Shield,
    title: "Secure Messaging",
    description: "Built-in encrypted chat that unlocks after confirmation and payment",
    color: "from-purple-500 to-pink-500",
  },
  {
    icon: Clock,
    title: "Smart Scheduling",
    description: "Flexible booking with clear request, agreement, and payment milestones",
    color: "from-emerald-500 to-teal-500",
  },
  {
    icon: Star,
    title: "Trusted Reviews",
    description: "Authentic ratings and feedback from real families in your community",
    color: "from-amber-500 to-orange-500",
  },
  {
    icon: Shield,
    title: "Secure Payments",
    description: "Escrow-protected payments with automatic invoicing and payment tracking",
    color: "from-rose-500 to-red-500",
  },
  {
    icon: Heart,
    title: "Care Quality",
    description: "Ongoing quality assurance and support for the best care experience",
    color: "from-cyan-500 to-blue-500",
  },
];

// ============================================
// FAQ DATA
// ============================================

const FAQS = [
  {
    question: "How are caregivers verified?",
    answer: "All caregivers undergo a comprehensive verification process including identity verification, background checks, reference checks, and credential verification. We also verify all certifications and training documents.",
  },
  {
    question: "How does the booking process work?",
    answer: "Search for caregivers, send a booking request, and wait for caregiver acceptance. After acceptance, both parties must accept the agreement. The booking is then locked for payment, and chat unlocks once payment is completed.",
  },
  {
    question: "What if I need to cancel a booking?",
    answer: "You can cancel bookings up to 24 hours before the scheduled time for a full refund. Late cancellations may be subject to a cancellation fee as outlined in our policy.",
  },
  {
    question: "How do I become a caregiver on CareConnect?",
    answer: "Sign up as a caregiver, complete your profile with your experience and qualifications, submit required documents for verification, and once approved, you can start accepting bookings.",
  },
  {
    question: "Is my payment information secure?",
    answer: "Absolutely. We use industry-standard encryption and secure payment processing. We never store your complete payment details on our servers.",
  },
];

// ============================================
// STATS DATA
// ============================================

const STATS = [
  { value: "10,000+", label: "Active Caregivers", icon: Users },
  { value: "50,000+", label: "Families Served", icon: Heart },
  { value: "4.9", label: "Average Rating", icon: Star },
  { value: "24/7", label: "Support Available", icon: Clock },
];

// ============================================
// COMPONENTS
// ============================================

// Animated Stat Card
const StatCard = ({ stat, index }: { stat: typeof STATS[0]; index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay: index * 0.1, duration: 0.5 }}
    className="relative group"
  >
    <div className="absolute inset-0 bg-linear-to-r from-primary-500 to-secondary-500 rounded-2xl blur-xl opacity-0 group-hover:opacity-30 transition-opacity duration-300" />
    <div className="relative bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-lg transition-shadow">
      <stat.icon className="w-8 h-8 text-primary-500 mb-3" />
      <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
      <div className="text-sm text-gray-500">{stat.label}</div>
    </div>
  </motion.div>
);

// Feature Card
const FeatureCard = ({ feature, index }: { feature: typeof FEATURES[0]; index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay: index * 0.1, duration: 0.5 }}
    className="group"
  >
    <div className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300">
      <div className={`w-12 h-12 rounded-xl bg-linear-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
        <feature.icon className="w-6 h-6 text-white" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
      <p className="text-gray-500 text-sm leading-relaxed">{feature.description}</p>
    </div>
  </motion.div>
);

// FAQ Accordion
const FAQAccordion = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="space-y-3">
      {FAQS.map((faq, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.1 }}
          className="border border-gray-200 rounded-xl overflow-hidden bg-white"
        >
          <button
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
            className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors"
          >
            <span className="font-medium text-gray-900">{faq.question}</span>
            <motion.div
              animate={{ rotate: openIndex === index ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-5 h-5 text-gray-500" />
            </motion.div>
          </button>
          <AnimatePresence>
            {openIndex === index && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="px-5 pb-5 text-gray-600 text-sm leading-relaxed">
                  {faq.answer}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ))}
    </div>
  );
};

// Tab Switcher
const TabSwitcher = ({ activeTab, onTabChange }: { activeTab: "families" | "caregivers"; onTabChange: (tab: "families" | "caregivers") => void }) => (
  <div className="inline-flex bg-gray-100 rounded-full p-1.5">
    <motion.button
      onClick={() => onTabChange("families")}
      className={`relative px-6 py-2.5 rounded-full text-sm font-medium transition-colors ${
        activeTab === "families" ? "text-white" : "text-gray-600 hover:text-gray-900"
      }`}
    >
      {activeTab === "families" && (
        <motion.div
          layoutId="tab-bg"
          className="absolute inset-0 bg-linear-to-r from-primary-500 to-secondary-500 rounded-full"
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      )}
      <span className="relative z-10 flex items-center gap-2">
        <Users className="w-4 h-4" />
        For Families
      </span>
    </motion.button>
    <motion.button
      onClick={() => onTabChange("caregivers")}
      className={`relative px-6 py-2.5 rounded-full text-sm font-medium transition-colors ${
        activeTab === "caregivers" ? "text-white" : "text-gray-600 hover:text-gray-900"
      }`}
    >
      {activeTab === "caregivers" && (
        <motion.div
          layoutId="tab-bg"
          className="absolute inset-0 bg-linear-to-r from-primary-500 to-secondary-500 rounded-full"
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      )}
      <span className="relative z-10 flex items-center gap-2">
        <Heart className="w-4 h-4" />
        For Caregivers
      </span>
    </motion.button>
  </div>
);

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export default function HowItWorksPage() {
  const [activeTab, setActiveTab] = useState<"families" | "caregivers">("families");

  return (
    <main className="min-h-screen bg-[#FAFBFC]">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-linear-to-b from-white to-[#FAFBFC]" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary-500/10 rounded-full blur-3xl" />
        <div className="absolute top-40 right-10 w-96 h-96 bg-secondary-500/10 rounded-full blur-3xl" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-sm border border-gray-100 mb-6"
            >
              <Sparkles className="w-4 h-4 text-primary-500" />
              <span className="text-sm font-medium text-gray-600">Trusted by 50,000+ families</span>
            </motion.div>

            {/* Heading */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Finding Care Made{" "}
              <span className="text-transparent bg-clip-text bg-linear-to-r from-primary-500 to-secondary-500">
                Simple
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              Whether you&apos;re a family seeking quality care or a caregiver ready to make a difference,
              CareConnect guides you every step of the way.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-4">
              <motion.a
                href="/search"
                className="inline-flex items-center gap-2 bg-linear-to-r from-primary-500 to-secondary-500 text-white px-6 py-3 rounded-full font-medium shadow-lg shadow-[#4461F2]/25 hover:shadow-xl hover:shadow-[#4461F2]/30 transition-shadow"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Find Caregivers
                <ArrowRight className="w-4 h-4" />
              </motion.a>
              <motion.a
                href="#journey"
                className="inline-flex items-center gap-2 bg-white text-gray-700 px-6 py-3 rounded-full font-medium border border-gray-200 hover:bg-gray-50 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Play className="w-4 h-4" />
                Watch How It Works
              </motion.a>
            </div>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16">
            {STATS.map((stat, index) => (
              <StatCard key={stat.label} stat={stat} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* Journey Section */}
      <section id="journey" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Your Journey with CareConnect
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto mb-8">
              Follow these simple steps to find the perfect care or start your caregiving career
            </p>
            
            {/* Tab Switcher */}
            <TabSwitcher activeTab={activeTab} onTabChange={setActiveTab} />
          </motion.div>

          {/* Journey Stepper */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <ResponsiveJourneyStepper
                steps={activeTab === "families" ? FAMILY_STEPS : CAREGIVER_STEPS}
                autoPlay
                autoPlayInterval={4000}
                showConfetti
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Why Choose CareConnect?
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              We&apos;ve built every feature with your family&apos;s safety and peace of mind in focus
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, index) => (
              <FeatureCard key={feature.title} feature={feature} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* Process Breakdown Section */}
      <section className="py-20 bg-linear-to-br from-primary-500/5 to-secondary-500/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
                Safety & Trust at Every Step
              </h2>
              <p className="text-gray-600 mb-8 leading-relaxed">
                We understand that inviting a caregiver into your home requires trust. 
                That&apos;s why we&apos;ve implemented rigorous verification processes to ensure 
                every caregiver on our platform meets our high standards.
              </p>

              <div className="space-y-4">
                {[
                  "Multi-level background verification",
                  "Identity and document verification",
                  "Reference checks from previous employers",
                  "Ongoing quality monitoring",
                  "Secure in-app communication after confirmation",
                  "Protected payment processing",
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    </div>
                    <span className="text-gray-700">{item}</span>
                  </motion.div>
                ))}
              </div>

              <motion.a
                href="/search"
                className="inline-flex items-center gap-2 mt-8 bg-gray-900 text-white px-6 py-3 rounded-full font-medium hover:bg-gray-800 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Start Your Search
                <ArrowRight className="w-4 h-4" />
              </motion.a>
            </motion.div>

            {/* Right Illustration */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="relative bg-white rounded-3xl p-8 shadow-xl">
                {/* Shield Icon */}
                <div className="absolute -top-6 -right-6 w-16 h-16 bg-linear-to-br from-primary-500 to-secondary-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <Shield className="w-8 h-8 text-white" />
                </div>

                {/* Verification Steps */}
                <div className="space-y-4">
                  {[
                    { icon: FileText, label: "Document Verification", status: "Verified" },
                    { icon: UserCheck, label: "Identity Check", status: "Verified" },
                    { icon: Shield, label: "Background Check", status: "Verified" },
                    { icon: Award, label: "Certification Review", status: "Verified" },
                  ].map((step, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <step.icon className="w-5 h-5 text-primary-500" />
                        <span className="font-medium text-gray-700">{step.label}</span>
                      </div>
                      <span className="text-sm font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                        {step.status}
                      </span>
                    </motion.div>
                  ))}
                </div>

                {/* Trust Score */}
                <div className="mt-6 p-4 bg-linear-to-r from-primary-500/10 to-secondary-500/10 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Trust Score</span>
                    <span className="text-sm font-bold text-primary-500">98%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-linear-to-r from-primary-500 to-secondary-500"
                      initial={{ width: 0 }}
                      whileInView={{ width: "98%" }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, delay: 0.5 }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-gray-600">
              Got questions? We&apos;ve got answers.
            </p>
          </motion.div>

          <FAQAccordion />
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-3xl bg-linear-to-r from-primary-500 to-secondary-500 p-12 text-center"
          >
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 w-40 h-40 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
              <div className="absolute bottom-0 right-0 w-60 h-60 bg-white rounded-full translate-x-1/2 translate-y-1/2" />
            </div>

            <div className="relative z-10">
              <motion.div
                initial={{ scale: 0.9 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ type: "spring", stiffness: 200 }}
              >
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                  Ready to Get Started?
                </h2>
                <p className="text-white/90 max-w-2xl mx-auto mb-8">
                  Join thousands of families and caregivers who trust CareConnect for quality care connections.
                </p>

                <div className="flex flex-wrap items-center justify-center gap-4">
                  <motion.a
                    href="/search"
                    className="inline-flex items-center gap-2 bg-white text-primary-500 px-8 py-4 rounded-full font-semibold shadow-lg hover:shadow-xl transition-shadow"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Find a Caregiver
                    <ArrowRight className="w-5 h-5" />
                  </motion.a>
                  <motion.a
                    href="/register?role=caregiver"
                    className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white px-8 py-4 rounded-full font-semibold border border-white/20 hover:bg-white/20 transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Become a Caregiver
                    <Heart className="w-5 h-5" />
                  </motion.a>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
