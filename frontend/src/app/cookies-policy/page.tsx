import Link from "next/link";
import { ArrowLeft, Cookie } from "lucide-react";
import { Navbar, Footer } from "@/components";

export default function CookiesPolicyPage() {
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
              <Cookie className="w-6 h-6 text-primary-500" />
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">Cookies Policy</h1>
          </div>
          <div className="prose prose-gray max-w-none">
            <p className="text-gray-600 mb-6">Last updated: {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
            <div className="space-y-6 text-gray-600 leading-relaxed">
              <section><h2 className="text-xl font-semibold text-gray-900 mb-3">What Are Cookies</h2><p>Cookies are small text files stored on your device when you visit our website. They help us provide a better user experience by remembering your preferences and login status.</p></section>
              <section><h2 className="text-xl font-semibold text-gray-900 mb-3">How We Use Cookies</h2><p>We use essential cookies for authentication and security, analytics cookies to understand how users interact with our platform, and preference cookies to remember your settings.</p></section>
              <section><h2 className="text-xl font-semibold text-gray-900 mb-3">Managing Cookies</h2><p>You can manage or disable cookies through your browser settings. Note that disabling certain cookies may affect the functionality of our platform.</p></section>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
