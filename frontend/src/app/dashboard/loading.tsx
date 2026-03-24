// ============================================
// DASHBOARD LOADING UI
// Shown while dashboard route segments are loading.
// ============================================

export default function DashboardLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA]">
      <div className="text-center">
        <div className="relative w-14 h-14 mx-auto mb-4">
          <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
          <div className="absolute inset-0 rounded-full border-4 border-primary-500 border-t-transparent animate-spin" />
        </div>
        <p className="text-sm font-medium text-gray-500">Loading dashboard…</p>
      </div>
    </div>
  );
}
