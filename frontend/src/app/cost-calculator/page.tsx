"use client";

import Link from "next/link";
import { ArrowLeft, Calculator, DollarSign, Clock, MapPin } from "lucide-react";
import { Navbar, Footer } from "@/components";

export default function CostCalculatorPage() {
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
              <Calculator className="w-8 h-8 text-primary-500" />
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Cost of Care Calculator
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Estimate the cost of care based on your specific needs, location, and schedule.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="bg-[#F0F5FF] rounded-2xl p-8 text-center hover:shadow-lg transition-shadow">
              <DollarSign className="w-10 h-10 text-green-500 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">Cost Estimates</h3>
              <p className="text-sm text-gray-600">
                Get personalized cost estimates tailored to your care requirements.
              </p>
            </div>
            <div className="bg-[#F0F5FF] rounded-2xl p-8 text-center hover:shadow-lg transition-shadow">
              <Clock className="w-10 h-10 text-primary-500 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">Flexible Scheduling</h3>
              <p className="text-sm text-gray-600">
                Compare costs for hourly, daily, and live-in care arrangements.
              </p>
            </div>
            <div className="bg-[#F0F5FF] rounded-2xl p-8 text-center hover:shadow-lg transition-shadow">
              <MapPin className="w-10 h-10 text-purple-500 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">Location-Based</h3>
              <p className="text-sm text-gray-600">
                Regional pricing to give you the most accurate cost estimates.
              </p>
            </div>
          </div>

          <div className="text-center text-gray-500 text-sm">
            <p>Interactive cost calculator coming soon.</p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
