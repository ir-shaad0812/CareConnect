"use client";

import Image from "next/image";
import Link from "next/link";
import { Mail, Phone, Facebook, Instagram, Youtube, Linkedin } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <>
      {/* CTA Section */}
      <section className="bg-linear-to-br from-gray-50 to-blue-50 py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-linear-to-r from-[#0d9488] to-[#14b8a6] rounded-3xl overflow-hidden relative">
            <div className="flex flex-col lg:flex-row items-center justify-between p-8 lg:p-12">
              {/* Left Content */}
              <div className="text-white mb-8 lg:mb-0 lg:max-w-md z-10">
                <h2 className="text-3xl lg:text-4xl font-bold mb-4">
                  Join our amazing platform today!
                </h2>
                <Link
                  href="/register"
                  className="inline-block bg-white text-[#0d9488] font-semibold px-8 py-3 rounded-full hover:bg-gray-100 transition-colors shadow-lg"
                >
                  Register for Free
                </Link>
              </div>
              
              {/* Right Image */}
              <div className="relative w-full lg:w-auto flex justify-center lg:justify-end">
                <div className="relative w-64 h-48 lg:w-80 lg:h-56">
                  <Image
                    src="/login/Register/Happy_faces.png"
                    alt="Happy people using CareConnect"
                    fill
                    sizes="(max-width: 1024px) 256px, 320px"
                    className="object-contain"
                  />
                </div>
              </div>
            </div>
            
            {/* Decorative Wave */}
            <div className="absolute bottom-0 left-0 right-0 h-20 opacity-10">
              <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-full">
                <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V95.8C57.1,118.92,156.63,69.08,321.39,56.44Z" fill="white"></path>
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Main Footer */}
      <footer className="bg-[#0d9488] text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 mb-10">
            
            {/* Logo & Social */}
            <div className="col-span-2 md:col-span-1">
              <div className="mb-4">
                <Logo variant="white" showText href="/home" priority={false} />
              </div>
              <p className="text-white/80 text-sm mb-4">Connecting Hearts, Providing Care</p>
              
              {/* Social Media Icons */}
              <div className="flex items-center gap-3">
                <a 
                  href="https://facebook.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                  aria-label="Facebook"
                >
                  <Facebook className="w-4 h-4" />
                </a>
                <a 
                  href="https://instagram.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                  aria-label="Instagram"
                >
                  <Instagram className="w-4 h-4" />
                </a>
                <a 
                  href="https://youtube.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                  aria-label="YouTube"
                >
                  <Youtube className="w-4 h-4" />
                </a>
                <a 
                  href="https://linkedin.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                  aria-label="LinkedIn"
                >
                  <Linkedin className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* CareConnect Section */}
            <div>
              <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">CareConnect</h4>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <Link href="/about" className="text-white/80 hover:text-white transition-colors">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="/profile/caregiver" className="text-white/80 hover:text-white transition-colors">
                    Profile
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/bookings" className="text-white/80 hover:text-white transition-colors">
                    Bookings
                  </Link>
                </li>
                <li>
                  <Link href="/caregivers" className="text-white/80 hover:text-white transition-colors">
                    Caregivers
                  </Link>
                </li>
                <li>
                  <Link href="/search" className="text-white/80 hover:text-white transition-colors">
                    Careseekers
                  </Link>
                </li>
                <li>
                  <Link href="/how-it-works" className="text-white/80 hover:text-white transition-colors">
                    Help
                  </Link>
                </li>
                <li>
                  <Link href="/messages" className="text-white/80 hover:text-white transition-colors">
                    Chat
                  </Link>
                </li>
              </ul>
            </div>

            {/* Our Offerings Section */}
            <div>
              <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">Our Offerings</h4>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <Link href="/search?service=elderly" className="text-white/80 hover:text-white transition-colors">
                    Elderly Care
                  </Link>
                </li>
                <li>
                  <Link href="/search?service=child" className="text-white/80 hover:text-white transition-colors">
                    Child Care
                  </Link>
                </li>
                <li>
                  <Link href="/search?service=special" className="text-white/80 hover:text-white transition-colors">
                    Special Needs
                  </Link>
                </li>
                <li>
                  <Link href="/search?service=personal" className="text-white/80 hover:text-white transition-colors">
                    Personal Care
                  </Link>
                </li>
                <li>
                  <Link href="/search?type=live-in" className="text-white/80 hover:text-white transition-colors">
                    Live-in Care
                  </Link>
                </li>
                <li>
                  <Link href="/search?type=hourly" className="text-white/80 hover:text-white transition-colors">
                    Hourly Care
                  </Link>
                </li>
              </ul>
            </div>

            {/* Users Section */}
            <div>
              <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">Users</h4>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <Link href="/register?role=caregiver" className="text-white/80 hover:text-white transition-colors">
                    Caregivers
                  </Link>
                </li>
                <li>
                  <Link href="/register?role=careseeker" className="text-white/80 hover:text-white transition-colors">
                    Care-seekers
                  </Link>
                </li>
                <li>
                  <Link href="/admin/login" className="text-white/80 hover:text-white transition-colors">
                    Admin
                  </Link>
                </li>
              </ul>
            </div>

            {/* Terms Section */}
            <div>
              <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">Terms & Conditions</h4>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <Link href="/cookies-policy" className="text-white/80 hover:text-white transition-colors">
                    Cookies Policy
                  </Link>
                </li>
                <li>
                  <Link href="/privacy-policy" className="text-white/80 hover:text-white transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/copyright-policy" className="text-white/80 hover:text-white transition-colors">
                    Copyright Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms-of-service" className="text-white/80 hover:text-white transition-colors">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>

            {/* Let's Connect Section */}
            <div>
              <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">Let&apos;s Connect!</h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <a 
                    href="mailto:irshad.aalam0812@gmail.com" 
                    className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
                  >
                    <Mail className="w-4 h-4 shrink-0" />
                    <span className="break-all">irshad.aalam0812@gmail.com</span>
                  </a>
                </li>
                <li>
                  <a 
                    href="mailto:support@careconnect.com" 
                    className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
                  >
                    <Mail className="w-4 h-4 shrink-0" />
                    <span className="break-all">support@careconnect.com</span>
                  </a>
                </li>
                <li>
                  <a 
                    href="tel:+977-9826756408" 
                    className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
                  >
                    <Phone className="w-4 h-4 shrink-0" />
                    <span>+977-9826756408</span>
                  </a>
                </li>
                <li>
                  <a 
                    href="tel:+977-9702647314" 
                    className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
                  >
                    <Phone className="w-4 h-4 shrink-0" />
                    <span>+977-9702647314</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Copyright */}
          <div className="pt-8 border-t border-white/20 text-center text-sm text-white/70">
            © CareConnect - Nepal {currentYear}
          </div>
        </div>
      </footer>
    </>
  );
};

export default Footer;
