// ============================================
// DASHBOARD NOT FOUND
// Shown when a /dashboard/* route does not exist.
// ============================================

import Link from "next/link";

export default function DashboardNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA] px-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-7xl font-bold text-gray-200 mb-4">404</h1>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Page Not Found</h2>
        <p className="text-gray-500 mb-6 text-sm">
          The dashboard page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="px-5 py-2.5 text-sm font-semibold text-white bg-linear-to-r from-primary-500 to-[#7C3AED] rounded-xl hover:shadow-lg transition-all"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/"
            className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
