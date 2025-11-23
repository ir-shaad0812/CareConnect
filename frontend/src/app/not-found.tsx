"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Home, Mail, ArrowLeft } from "lucide-react";
import { API_CONFIG } from "@/lib/constants";

export default function NotFound() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tracked, setTracked] = useState(false);

  // Silent broken link tracking
  useEffect(() => {
    if (tracked) return;

    const trackBrokenLink = async () => {
      try {
        const referrer = document.referrer || "Direct";
        const fullUrl = window.location.href;
        const timestamp = new Date().toISOString();
        const userAgent = navigator.userAgent;

        await fetch(`${API_CONFIG.BASE_URL}/track/404`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: fullUrl,
            path: pathname,
            query: searchParams.toString(),
            referrer,
            timestamp,
            userAgent,
          }),
        }).catch(() => {
          // fail silently - don't break UX if tracking fails
        });

        setTracked(true);
      } catch {
        // tracking failed, but user experience continues normally
      }
    };

    // small delay to avoid blocking page render
    const timer = setTimeout(trackBrokenLink, 300);
    return () => clearTimeout(timer);
  }, [pathname, searchParams, tracked]);

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full text-center">
        {/* large 404 - minimal and clean */}
        <div className="mb-8">
          <h1 className="text-9xl sm:text-[12rem] font-bold text-gray-300 dark:text-gray-700 select-none">
            404
          </h1>
        </div>

        {/* main message */}
        <div className="mb-12 space-y-4">
          <h2 className="text-3xl sm:text-4xl font-semibold text-gray-900 dark:text-gray-100">
            Page Not Found
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-md mx-auto">
            The page you&apos;re looking for doesn&apos;t exist or may have been moved.
          </p>
        </div>

        {/* action buttons - shadcn style */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          {/* primary: go home */}
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-200 w-full sm:w-auto focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
          >
            <Home size={20} />
            <span>Go to Home</span>
          </Link>

          {/* secondary: go back */}
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm hover:shadow transition-all duration-200 w-full sm:w-auto focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
          >
            <ArrowLeft size={20} />
            <span>Go Back</span>
          </button>

          {/* tertiary: contact support */}
          <Link
            href="/contact"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 text-gray-600 dark:text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 font-medium transition-colors duration-200 w-full sm:w-auto focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 rounded-lg"
          >
            <Mail size={20} />
            <span>Contact Support</span>
          </Link>
        </div>

        {/* helpful suggestions */}
        <div className="mt-16 pt-8 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
            You might be looking for:
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/caregivers"
              className="text-sm text-teal-600 dark:text-teal-400 hover:underline"
            >
              Find Caregivers
            </Link>
            <span className="text-gray-300 dark:text-gray-600">•</span>
            <Link
              href="/dashboard"
              className="text-sm text-teal-600 dark:text-teal-400 hover:underline"
            >
              Dashboard
            </Link>
            <span className="text-gray-300 dark:text-gray-600">•</span>
            <Link
              href="/about"
              className="text-sm text-teal-600 dark:text-teal-400 hover:underline"
            >
              About Us
            </Link>
            <span className="text-gray-300 dark:text-gray-600">•</span>
            <Link
              href="/help"
              className="text-sm text-teal-600 dark:text-teal-400 hover:underline"
            >
              Help Center
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
