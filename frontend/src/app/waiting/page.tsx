import { Suspense } from "react";
import WaitingContent from "./WaitingContent";

// ─── Loader shown while JS bundle downloads ───────────────────────────────────
function WaitingLoader() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50/30 flex items-center justify-center">
      <div className="text-center">
        <div className="relative w-16 h-16 mx-auto mb-4">
          <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
          <div className="absolute inset-0 rounded-full border-4 border-[#39B54A] border-t-transparent animate-spin" />
        </div>
        <p className="text-gray-500 text-sm font-medium">Loading…</p>
      </div>
    </div>
  );
}

// ─── Page (Server Component — no "use client") ────────────────────────────────
export default function WaitingPage() {
  return (
    <Suspense fallback={<WaitingLoader />}>
      <WaitingContent />
    </Suspense>
  );
}
