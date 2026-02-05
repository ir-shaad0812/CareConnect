"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function CaregiverSearchRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Forward all search params to the caregivers listing page
    const params = new URLSearchParams(searchParams.toString());
    router.replace(`/caregivers${params.toString() ? `?${params.toString()}` : ""}`);
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-primary-50 to-secondary-50">
      <div className="text-center">
        <div className="relative w-16 h-16 mx-auto mb-4">
          <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
          <div className="absolute inset-0 rounded-full border-4 border-primary-500 border-t-transparent animate-spin" />
        </div>
        <p className="text-gray-600 font-medium">Redirecting to search results...</p>
      </div>
    </div>
  );
}
