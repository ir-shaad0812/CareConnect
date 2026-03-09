"use client";

import React, { useState } from "react";
import { motion, type Variants } from "framer-motion";
import { Mail, Check, Loader2, Heart, Users, Shield } from "lucide-react";

// Animation Variants for Framer Motion
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
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

const pulseVariants: Variants = {
  initial: { scale: 1 },
  animate: {
    scale: [1, 1.02, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

// Newsletter Component
const Newsletter = () => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes("@")) {
      setStatus("error");
      setErrorMessage("Please enter a valid email address");
      return;
    }

    setStatus("loading");
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    setStatus("success");
    setEmail("");
    
    // Reset after 3 seconds
    setTimeout(() => {
      setStatus("idle");
    }, 3000);
  };

  return (
    <section className="relative w-full py-20 lg:py-28 overflow-hidden bg-linear-to-b from-white via-[#F0F5FF]/30 to-white">
      {/* Background Decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-linear-to-br from-primary-500/10 to-secondary-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] bg-linear-to-tr from-secondary-500/10 to-primary-500/10 rounded-full blur-3xl" />
        
        {/* Decorative dots pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.02]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="newsletterDots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="2" fill="#4461F2" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#newsletterDots)" />
        </svg>
      </div>

      <motion.div
        className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
      >
        {/* Badge */}
        <motion.div variants={itemVariants}>
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-[#F0F5FF] text-primary-500 font-medium rounded-full text-sm mb-6 border border-primary-500/10">
            <Heart className="w-4 h-4" />
            Stay Connected with CareConnect
          </span>
        </motion.div>

        {/* Heading */}
        <motion.h2
          className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight tracking-tight text-gray-900 mb-6"
          variants={itemVariants}
        >
          Join Our Caring
          <span className="block bg-linear-to-r from-primary-500 to-secondary-500 bg-clip-text text-transparent">
            Community Today
          </span>
        </motion.h2>

        {/* Subheading */}
        <motion.p
          className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed mb-10"
          variants={itemVariants}
        >
          Get exclusive updates on caregiving tips, new features, and special offers. 
          Be the first to know when we expand to new cities near you.
        </motion.p>

        {/* Email Form */}
        <motion.form
          className="max-w-xl mx-auto mb-10"
          onSubmit={handleSubmit}
          variants={itemVariants}
        >
          <motion.div
            className={`relative flex flex-col sm:flex-row items-center bg-white p-2 rounded-2xl shadow-xl border-2 transition-all duration-300 ${
              status === "error"
                ? "border-red-300 ring-2 ring-red-100"
                : status === "success"
                ? "border-green-300 ring-2 ring-green-100"
                : "border-[#E1E6EF] focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-[#4461F2]/20"
            }`}
            variants={pulseVariants}
            initial="initial"
            animate={status === "idle" ? "animate" : "initial"}
          >
            <Mail className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-primary-500/60 hidden sm:block" />

            <input
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (status === "error") setStatus("idle");
              }}
              disabled={status === "loading" || status === "success"}
              className="w-full sm:w-auto flex-grow bg-transparent sm:pl-12 px-4 py-4 text-gray-900 placeholder:text-gray-400 outline-none text-center sm:text-left disabled:opacity-50 font-medium"
              required
            />

            <button
              type="submit"
              disabled={status === "loading" || status === "success"}
              className={`w-full sm:w-auto mt-2 sm:mt-0 px-8 py-4 font-semibold rounded-xl transition-all duration-300 shadow-lg flex items-center justify-center gap-2 ${
                status === "success"
                  ? "bg-green-500 text-white"
                  : status === "loading"
                  ? "bg-primary-500/80 text-white cursor-wait"
                  : "bg-linear-to-r from-primary-500 to-secondary-500 text-white hover:shadow-xl hover:shadow-[#4461F2]/25 hover:-translate-y-0.5 active:translate-y-0"
              }`}
            >
              {status === "loading" ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Subscribing...</span>
                </>
              ) : status === "success" ? (
                <>
                  <Check className="w-5 h-5" />
                  <span>Subscribed!</span>
                </>
              ) : (
                <span>Get Notified</span>
              )}
            </button>
          </motion.div>

          {/* Error Message */}
          {status === "error" && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-500 text-sm mt-3"
            >
              {errorMessage}
            </motion.p>
          )}

          {/* Success Message */}
          {status === "success" && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-green-600 text-sm mt-3 font-medium"
            >
              Welcome to the CareConnect family! Check your inbox for confirmation.
            </motion.p>
          )}
        </motion.form>

        {/* Social Proof */}
        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-8"
          variants={itemVariants}
        >
          {/* Avatar Stack */}
          <div className="flex items-center gap-3">
            <div className="flex -space-x-3">
              {[
                "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face",
                "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
                "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
                "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face",
              ].map((src, index) => (
                <img
                  key={index}
                  className="inline-block h-10 w-10 rounded-full ring-3 ring-white shadow-md object-cover"
                  src={src}
                  alt={`Community member ${index + 1}`}
                />
              ))}
              <div className="inline-flex h-10 w-10 rounded-full ring-3 ring-white shadow-md bg-linear-to-br from-primary-500 to-secondary-500 items-center justify-center text-white text-xs font-bold">
                +5K
              </div>
            </div>
            <div className="text-left">
              <p className="font-bold text-gray-900">10,000+</p>
              <p className="text-sm text-gray-500">Happy subscribers</p>
            </div>
          </div>

          {/* Divider */}
          <div className="hidden sm:block w-px h-12 bg-gray-200" />

          {/* Trust Indicators */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Shield className="w-4 h-4 text-green-500" />
              <span>No spam, ever</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users className="w-4 h-4 text-primary-500" />
              <span>Unsubscribe anytime</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default Newsletter;
