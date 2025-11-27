"use client";

import Link from "next/link";
import { ArrowLeft, Receipt, FileText, Shield } from "lucide-react";
import { Navbar, Footer } from "@/components";

export default function PayrollPage() {
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
              <Receipt className="w-8 h-8 text-primary-500" />
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Payroll & Compliance
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Simplified tax, payroll, and compliance solutions for household employers.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="bg-[#F0F5FF] rounded-2xl p-8 text-center hover:shadow-lg transition-shadow">
              <Receipt className="w-10 h-10 text-primary-500 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">Payroll Management</h3>
              <p className="text-sm text-gray-600">
                Automated payroll processing for household employees with direct deposit.
              </p>
            </div>
            <div className="bg-[#F0F5FF] rounded-2xl p-8 text-center hover:shadow-lg transition-shadow">
              <FileText className="w-10 h-10 text-purple-500 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">Tax Filing</h3>
              <p className="text-sm text-gray-600">
                Simplified tax preparation and filing for household employers.
              </p>
            </div>
            <div className="bg-[#F0F5FF] rounded-2xl p-8 text-center hover:shadow-lg transition-shadow">
              <Shield className="w-10 h-10 text-green-500 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">Compliance</h3>
              <p className="text-sm text-gray-600">
                Stay compliant with local and federal employment regulations.
              </p>
            </div>
          </div>

          <div className="text-center text-gray-500 text-sm">
            <p>Payroll and compliance tools coming soon.</p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
