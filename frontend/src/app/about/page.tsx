"use client";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Link from "next/link";
import Image from "next/image";
import Newsletter from "@/components/ui/Newsletter";
import { ImageCarouselSection, careConnectCards } from "@/components/ui/ImageCarouselSection";

// Team member data
const TEAM_MEMBERS = [
  {
    name: "Sarah Johnson",
    role: "Founder & CEO",
    bio: "Former healthcare professional with 15 years of experience in elderly care. Founded CareConnect to bridge the gap between families and quality caregivers.",
    image: "/team/sarah.jpg",
    social: {
      linkedin: "#",
      twitter: "#"
    }
  },
  {
    name: "Dr. Michael Chen",
    role: "Chief Medical Advisor",
    bio: "Board-certified geriatrician with expertise in senior care and dementia management. Ensures our caregivers meet the highest medical standards.",
    image: "/team/michael.jpg",
    social: {
      linkedin: "#",
      twitter: "#"
    }
  },
  {
    name: "Emily Rodriguez",
    role: "Head of Operations",
    bio: "Expert in building scalable care networks. Previously managed operations for a national home care agency.",
    image: "/team/emily.jpg",
    social: {
      linkedin: "#",
      twitter: "#"
    }
  },
  {
    name: "David Kim",
    role: "Technology Lead",
    bio: "Tech innovator passionate about using technology to improve healthcare accessibility. Built platforms serving millions of users.",
    image: "/team/david.jpg",
    social: {
      linkedin: "#",
      twitter: "#"
    }
  }
];

// Company values
const VALUES = [
  {
    icon: "💌",
    title: "Compassion First",
    description: "Every decision we make is guided by genuine care for families and caregivers alike.",
    color: "from-red-500 to-pink-500"
  },
  {
    icon: "🛡️",
    title: "Trust & Safety",
    description: "Rigorous background checks and verification ensure peace of mind for everyone.",
    color: "from-blue-500 to-cyan-500"
  },
  {
    icon: "🌟",
    title: "Excellence",
    description: "We continuously raise the bar for quality in professional caregiving services.",
    color: "from-yellow-500 to-orange-500"
  },
  {
    icon: "🤝",
    title: "Community",
    description: "Building meaningful connections between caregivers and the families they serve.",
    color: "from-green-500 to-emerald-500"
  },
  {
    icon: "💡",
    title: "Innovation",
    description: "Leveraging technology to make finding and providing care simpler and more efficient.",
    color: "from-primary-500 to-secondary-500"
  },
  {
    icon: "🌈",
    title: "Inclusivity",
    description: "Embracing diversity and ensuring care is accessible to families of all backgrounds.",
    color: "from-indigo-500 to-primary-500"
  }
];

// Stats
const STATS = [
  { value: "50K+", label: "Families Served" },
  { value: "10K+", label: "Verified Caregivers" },
  { value: "500+", label: "Cities Covered" },
  { value: "98%", label: "Satisfaction Rate" }
];

// Milestones
const MILESTONES = [
  { year: "2019", title: "Founded", description: "CareConnect was born from a personal experience of finding quality care for aging parents." },
  { year: "2020", title: "First 1,000 Users", description: "Reached our first milestone of connecting 1,000 families with trusted caregivers." },
  { year: "2021", title: "Series A Funding", description: "Secured $5M to expand our platform and caregiver verification process." },
  { year: "2022", title: "National Expansion", description: "Expanded to 200+ cities across the country with localized support." },
  { year: "2023", title: "AI Matching", description: "Launched AI-powered matching to connect families with the perfect caregiver." },
  { year: "2024", title: "10K Caregivers", description: "Celebrated 10,000 verified caregivers on our platform." }
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-linear-to-b from-gray-50 to-white">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative pt-24 pb-16 overflow-hidden">
        {/* Background Decorations */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-linear-to-br from-[#F0F5FF] to-pink-100 rounded-full opacity-60 blur-3xl" />
          <div className="absolute top-1/2 -left-40 w-80 h-80 bg-linear-to-br from-blue-100 to-cyan-100 rounded-full opacity-60 blur-3xl" />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <span className="inline-block px-4 py-2 bg-[#F0F5FF] text-primary-500 font-medium rounded-full text-sm mb-6">
              About CareConnect
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Connecting Hearts,
              <span className="block bg-linear-to-r from-primary-500 to-secondary-500 bg-clip-text text-transparent">
                Caring Together
              </span>
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              We&apos;re on a mission to make quality caregiving accessible to everyone. 
              Our platform connects families with verified, compassionate caregivers 
              who truly make a difference.
            </p>
          </div>
        </div>
      </section>
      
      {/* Stats Section */}
      <section className="py-12 bg-linear-to-r from-primary-500 to-secondary-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-white mb-2">
                  {stat.value}
                </div>
                <div className="text-blue-200 font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Our Story Section - Born from a Personal Journey */}
      <section className="py-20 bg-linear-to-br from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left - Founder Image */}
            <div className="relative order-2 lg:order-1">
              <div className="relative z-10">
                {/* Decorative SVG Shape */}
                <div className="absolute -top-8 -left-8 w-full h-full">
                  <Image 
                    src="/about-uspage/Combined-Shape.svg" 
                    alt="Decorative Shape" 
                    width={500}
                    height={500}
                    className="w-full h-auto opacity-20"
                  />
                </div>
                {/* Founder Image */}
                <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-white">
                  <Image 
                    src="/about-uspage/personalimage1.jpg" 
                    alt="CareTaker Platform Founder" 
                    width={500}
                    height={600}
                    className="w-full h-auto object-cover"
                  />
                </div>
              </div>
              {/* Decorative elements */}
              <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-linear-to-br from-[#FFAF00] to-[#FF8F00] rounded-2xl -z-10 opacity-80" />
              <div className="absolute -top-6 -right-6 w-24 h-24 bg-linear-to-br from-primary-500 to-secondary-500 rounded-2xl -z-10 opacity-80" />
            </div>
            
            {/* Right - Founder Message */}
            <div className="order-1 lg:order-2">
              <span className="inline-block px-3 py-1 bg-orange-100 text-orange-600 font-medium rounded-full text-sm mb-4">
                Our Story
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Born from a Personal Journey
              </h2>
              
              {/* Founder Message Quote */}
              <div className="relative bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
                <div className="absolute -top-4 left-8 text-6xl text-primary-500 opacity-30">&ldquo;</div>
                <div className="space-y-4 text-gray-700 leading-relaxed italic">
                  <p>
                    Our mission is to make trusted caregiving accessible, transparent, and human-centered.
                  </p>
                  <p>
                    Built from a deep understanding of real caregiving challenges, our CareTaker platform connects families seeking care with qualified, verified caregivers—whether for children, adults, or elderly loved ones.
                  </p>
                  <p>
                    By combining smart technology with a simple, intuitive experience, we empower caregivers to find meaningful work and help families receive reliable care with confidence.
                  </p>
                  <p>
                    Through secure communication, flexible scheduling, transparent payments, and strong verification standards, we aim to elevate caregiving into a dignified, professional, and trusted service ecosystem.
                  </p>
                  <p>
                    This platform is not just about services—it&apos;s about care, trust, and improving quality of life for everyone involved.
                  </p>
                </div>
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="font-bold text-gray-900 text-lg">— Founder, CareTaker Platform</p>
                </div>
                <div className="absolute -bottom-4 right-8 text-6xl text-primary-500 opacity-30">&rdquo;</div>
              </div>
              
              <Link 
                href="/how-it-works"
                className="inline-flex items-center gap-2 mt-8 px-6 py-3 bg-primary-500 hover:bg-[#2F4BDB] text-white font-medium rounded-xl transition-all shadow-lg hover:shadow-xl"
              >
                Learn How It Works
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>
      
      {/* Values Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block px-3 py-1 bg-green-100 text-green-600 font-medium rounded-full text-sm mb-4">
              What We Believe
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Our Core Values
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              These principles guide everything we do, from how we build our platform 
              to how we support our community.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {VALUES.map((value, index) => (
              <div 
                key={index}
                className="group bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-[#E1E6EF]"
              >
                <div className={`w-16 h-16 rounded-2xl bg-linear-to-br ${value.color} flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  {value.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {value.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Timeline Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-600 font-medium rounded-full text-sm mb-4">
              Our Journey
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Key Milestones
            </h2>
          </div>
          
          <div className="relative">
            {/* Timeline Line */}
            <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-linear-to-b from-primary-500 to-[#FFAF00] rounded-full" />
            
            <div className="space-y-12">
              {MILESTONES.map((milestone, index) => (
                <div 
                  key={index}
                  className={`flex flex-col md:flex-row items-center gap-8 ${
                    index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                  }`}
                >
                  <div className={`flex-1 ${index % 2 === 0 ? 'md:text-right' : 'md:text-left'}`}>
                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
                      <div className="text-primary-500 font-bold text-lg mb-1">
                        {milestone.year}
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {milestone.title}
                      </h3>
                      <p className="text-gray-600">
                        {milestone.description}
                      </p>
                    </div>
                  </div>
                  
                  {/* Center Dot */}
                  <div className="hidden md:flex w-12 h-12 bg-white rounded-full border-4 border-primary-500 items-center justify-center shadow-lg z-10">
                    <div className="w-4 h-4 bg-primary-500 rounded-full" />
                  </div>
                  
                  <div className="flex-1 hidden md:block" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      
      {/* Team Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block px-3 py-1 bg-[#F0F5FF] text-primary-500 font-medium rounded-full text-sm mb-4">
              Meet the Team
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              The People Behind CareConnect
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Our diverse team brings together expertise in healthcare, technology, 
              and operations to build the best caregiving platform.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {TEAM_MEMBERS.map((member, index) => (
              <div 
                key={index}
                className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100"
              >
                <div className="h-56 bg-linear-to-br from-[#F0F5FF] to-pink-100 flex items-center justify-center">
                  <div className="w-32 h-32 rounded-full bg-linear-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white text-4xl font-bold shadow-lg group-hover:scale-110 transition-transform duration-300">
                    {member.name.charAt(0)}
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-bold text-gray-900">
                    {member.name}
                  </h3>
                  <p className="text-primary-500 font-medium text-sm mb-3">
                    {member.role}
                  </p>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {member.bio}
                  </p>
                  <div className="flex gap-3 mt-4">
                    <a href={member.social.linkedin} className="p-2 bg-gray-100 hover:bg-[#F0F5FF] rounded-lg transition-colors">
                      <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                      </svg>
                    </a>
                    <a href={member.social.twitter} className="p-2 bg-gray-100 hover:bg-[#F0F5FF] rounded-lg transition-colors">
                      <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
            {/* Newsletter Section */}
      <Newsletter />
      
      {/* Image Carousel Section */}
      <ImageCarouselSection
        title="Our Care Stories"
        subtitle="Real moments of compassion and connection from our CareConnect community"
        cards={careConnectCards}
      />
            {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative bg-linear-to-r from-primary-500 to-secondary-500 rounded-3xl p-12 md:p-16 overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-64 h-64 border-2 border-white rounded-full transform translate-x-1/3 -translate-y-1/3" />
              <div className="absolute bottom-0 left-0 w-48 h-48 border-2 border-white rounded-full transform -translate-x-1/3 translate-y-1/3" />
            </div>
            
            <div className="relative z-10 text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Ready to Find Your Perfect Caregiver?
              </h2>
              <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
                Join thousands of families who have found trusted, compassionate 
                caregivers through CareConnect.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link 
                  href="/caregivers"
                  className="px-8 py-4 bg-white text-primary-500 font-bold rounded-xl hover:bg-[#F0F5FF] transition-all shadow-lg hover:shadow-xl"
                >
                  Find Caregivers
                </Link>
                <Link 
                  href="/register?role=caregiver"
                  className="px-8 py-4 border-2 border-white text-white font-bold rounded-xl hover:bg-white/10 transition-all"
                >
                  Become a Caregiver
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <Footer />
    </div>
  );
}
