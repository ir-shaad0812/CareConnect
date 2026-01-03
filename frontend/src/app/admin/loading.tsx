// ============================================
// ADMIN LOADING UI
// Shown while admin route segments are loading.
// ============================================

export default function AdminLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F0F5FF]">
      <div className="text-center">
        <div className="relative w-14 h-14 mx-auto mb-4">
          <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
          <div className="absolute inset-0 rounded-full border-4 border-primary-500 border-t-transparent animate-spin" />
        </div>
        <p className="text-sm font-medium text-gray-500">Loading admin panel…</p>
      </div>
    </div>
  );
}
