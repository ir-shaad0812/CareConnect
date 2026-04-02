"use client";

import Link from "next/link";
import { ArrowLeft, Building2, Gift, Users } from "lucide-react";
import { Navbar, Footer } from "@/components";

export default function EmployerBenefitsPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <section className="py-16 lg:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/home"
            className="inline-flex items-center gap-2 text-sm text-primary-500 hover:text-[#2F4BDB] mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          <div className="text-center mb-16">
            <div className="w-16 h-16 mx-auto mb-6 bg-linear-to-br from-primary-500/10 to-secondary-500/10 rounded-2xl flex items-center justify-center">
              <Building2 className="w-8 h-8 text-primary-500" />
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Employer-Sponsored Benefits
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Offer care benefits to your employees and improve workplace satisfaction.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="bg-[#F0F5FF] rounded-2xl p-8 text-center hover:shadow-lg transition-shadow">
              <Building2 className="w-10 h-10 text-primary-500 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">Corporate Plans</h3>
              <p className="text-sm text-gray-600">
                Flexible care benefit packages designed for businesses of all sizes.
              </p>
            </div>
            <div className="bg-[#F0F5FF] rounded-2xl p-8 text-center hover:shadow-lg transition-shadow">
              <Gift className="w-10 h-10 text-purple-500 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">Employee Perks</h3>
              <p className="text-sm text-gray-600">
                Subsidized care services as an employee benefit to boost retention.
              </p>
            </div>
            <div className="bg-[#F0F5FF] rounded-2xl p-8 text-center hover:shadow-lg transition-shadow">
              <Users className="w-10 h-10 text-green-500 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">Team Support</h3>
              <p className="text-sm text-gray-600">
                Help your team balance work and caregiving responsibilities.
              </p>
            </div>
          </div>

          <div className="text-center text-gray-500 text-sm">
            <p>Employer benefits program details coming soon.</p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
