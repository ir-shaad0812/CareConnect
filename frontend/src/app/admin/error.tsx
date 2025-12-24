// ============================================
// ADMIN ERROR BOUNDARY
// Catches unhandled errors within /admin/* pages.
// ============================================

"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[AdminError]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F0F5FF] px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 mx-auto mb-5 bg-red-50 rounded-2xl flex items-center justify-center">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Admin Panel Error</h2>
        <p className="text-gray-500 mb-6 text-sm leading-relaxed">
          An error occurred in the admin panel. Please try again.
          {error.digest && (
            <span className="block mt-2 text-xs text-gray-400 font-mono">
              Ref: {error.digest}
            </span>
          )}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-linear-to-r from-primary-500 to-[#7C3AED] rounded-xl hover:shadow-lg transition-all"
          >
            Retry
          </button>
          <Link
            href="/admin/dashboard"
            className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
          >
            Admin Home
          </Link>
        </div>
      </div>
    </div>
  );
}
