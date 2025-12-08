import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { Navbar, Footer } from "@/components";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <section className="py-16 lg:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/home" className="inline-flex items-center gap-2 text-sm text-primary-500 hover:text-[#2F4BDB] mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-linear-to-br from-primary-500/10 to-secondary-500/10 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary-500" />
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">Terms of Service</h1>
          </div>
          <div className="prose prose-gray max-w-none">
            <p className="text-gray-600 mb-6">Last updated: {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
            <div className="space-y-6 text-gray-600 leading-relaxed">
              <section><h2 className="text-xl font-semibold text-gray-900 mb-3">1. Acceptance of Terms</h2><p>By accessing or using CareConnect, you agree to be bound by these Terms of Service. If you do not agree, please do not use our platform.</p></section>
              <section><h2 className="text-xl font-semibold text-gray-900 mb-3">2. Use of Services</h2><p>CareConnect provides a platform to connect care seekers with caregivers. We do not employ caregivers directly and are not responsible for the care services provided.</p></section>
              <section><h2 className="text-xl font-semibold text-gray-900 mb-3">3. User Responsibilities</h2><p>You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.</p></section>
              <section><h2 className="text-xl font-semibold text-gray-900 mb-3">4. Limitation of Liability</h2><p>CareConnect shall not be liable for any indirect, incidental, or consequential damages arising from your use of or inability to use the platform.</p></section>
              <section><h2 className="text-xl font-semibold text-gray-900 mb-3">5. Contact</h2><p>For questions about these terms, contact us at <a href="mailto:irshad.aalam0812@gmail.com" className="text-primary-500 hover:underline">irshad.aalam0812@gmail.com</a>.</p></section>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
