import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import { Navbar, Footer } from "@/components";

export default function PrivacyPolicyPage() {
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
              <Lock className="w-6 h-6 text-primary-500" />
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">Privacy Policy</h1>
          </div>
          <div className="prose prose-gray max-w-none">
            <p className="text-gray-600 mb-6">Last updated: {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
            <div className="space-y-6 text-gray-600 leading-relaxed">
              <section><h2 className="text-xl font-semibold text-gray-900 mb-3">1. Information We Collect</h2><p>We collect information you provide directly, such as when you create an account, complete a profile, or communicate with other users. This includes your name, email, phone number, location, and care preferences.</p></section>
              <section><h2 className="text-xl font-semibold text-gray-900 mb-3">2. How We Use Your Information</h2><p>We use your information to provide and improve our services, match caregivers with care seekers, process payments, and communicate important updates about your account.</p></section>
              <section><h2 className="text-xl font-semibold text-gray-900 mb-3">3. Data Security</h2><p>We implement industry-standard security measures including encryption, secure servers, and regular security audits to protect your personal information.</p></section>
              <section><h2 className="text-xl font-semibold text-gray-900 mb-3">4. Contact Us</h2><p>If you have questions about this Privacy Policy, please contact us at <a href="mailto:irshad.aalam0812@gmail.com" className="text-primary-500 hover:underline">irshad.aalam0812@gmail.com</a>.</p></section>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
