// ============================================
// GLOBAL LOADING UI
// Shown by Next.js automatically when navigating between route segments.
// Uses the CareConnect brand spinner for consistency.
// ============================================

export default function GlobalLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-[#F0F5FF] via-white to-[#F8F5FF]">
      <div className="text-center">
        <div className="relative w-14 h-14 mx-auto mb-4">
          <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
          <div className="absolute inset-0 rounded-full border-4 border-primary-500 border-t-transparent animate-spin" />
        </div>
        <p className="text-sm font-medium text-gray-500 tracking-wide">Loading…</p>
      </div>
    </div>
  );
}
