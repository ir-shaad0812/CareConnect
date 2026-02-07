import Link from "next/link";
import { ArrowLeft, Copyright } from "lucide-react";
import { Navbar, Footer } from "@/components";

export default function CopyrightPolicyPage() {
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
              <Copyright className="w-6 h-6 text-primary-500" />
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">Copyright Policy</h1>
          </div>
          <div className="prose prose-gray max-w-none">
            <p className="text-gray-600 mb-6">Last updated: {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
            <div className="space-y-6 text-gray-600 leading-relaxed">
              <section><h2 className="text-xl font-semibold text-gray-900 mb-3">Ownership</h2><p>All content on CareConnect, including text, graphics, logos, and software, is the property of CareConnect Nepal and is protected by copyright laws.</p></section>
              <section><h2 className="text-xl font-semibold text-gray-900 mb-3">Permitted Use</h2><p>You may access and use CareConnect content for personal, non-commercial purposes only. Any reproduction, distribution, or modification of our content without written permission is prohibited.</p></section>
              <section><h2 className="text-xl font-semibold text-gray-900 mb-3">Reporting Violations</h2><p>If you believe your copyrighted work has been used without authorization on our platform, please contact us at <a href="mailto:irshad.aalam0812@gmail.com" className="text-primary-500 hover:underline">irshad.aalam0812@gmail.com</a>.</p></section>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
