"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function CaregiverBookRedirect() {
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    const caregiverId = params.caregiverId as string;
    if (caregiverId) {
      router.replace("/book/" + caregiverId);
    } else {
      router.replace("/caregivers");
    }
  }, [router, params]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFB]">
      <div className="text-center">
        <div className="relative w-16 h-16 mx-auto mb-4">
          <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
          <div className="absolute inset-0 rounded-full border-4 border-teal-500 border-t-transparent animate-spin" />
        </div>
        <p className="text-gray-600 font-medium">Redirecting to booking...</p>
      </div>
    </div>
  );
}
