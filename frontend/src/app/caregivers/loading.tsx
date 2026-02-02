// ============================================
// CAREGIVERS PAGE LOADING STATE
// Premium skeleton loader with map placeholder
// ============================================

export default function CaregiversLoading() {
  const filterChipWidths = [92, 110, 98, 120, 88, 104];
  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 via-white to-[#39B54A]/5">
      {/* Header skeleton */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
              <div className="h-4 w-32 bg-gray-100 rounded mt-2 animate-pulse" />
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-32 bg-gray-100 rounded-lg animate-pulse" />
              <div className="h-10 w-10 bg-gray-100 rounded-lg animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and filters skeleton */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1 h-12 bg-white rounded-xl border border-gray-200 animate-pulse" />
            <div className="h-12 w-40 bg-white rounded-xl border border-gray-200 animate-pulse" />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-9 rounded-full bg-gray-100 animate-pulse shrink-0"
                style={{ width: `${filterChipWidths[i - 1]}px`, animationDelay: `${i * 50}ms` }}
              />
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Map skeleton */}
          <div className="order-2 lg:order-1">
            <div className="sticky top-24">
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-lg">
                {/* Map controls skeleton */}
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-10 w-28 bg-gray-100 rounded-lg animate-pulse" />
                    <div className="h-10 w-24 bg-gray-100 rounded-lg animate-pulse" />
                  </div>
                  <div className="flex gap-2">
                    <div className="h-10 w-10 bg-gray-100 rounded-lg animate-pulse" />
                    <div className="h-10 w-10 bg-gray-100 rounded-lg animate-pulse" />
                  </div>
                </div>
                {/* Map area skeleton */}
                <div className="h-[500px] bg-linear-to-br from-gray-100 to-gray-50 relative">
                  {/* Fake map markers */}
                  <div className="absolute top-1/3 left-1/4 w-10 h-10 bg-[#39B54A]/30 rounded-full animate-pulse" />
                  <div className="absolute top-1/2 left-1/2 w-8 h-8 bg-blue-300/50 rounded-full animate-pulse" style={{ animationDelay: "200ms" }} />
                  <div className="absolute top-1/4 right-1/3 w-9 h-9 bg-rose-300/50 rounded-full animate-pulse" style={{ animationDelay: "400ms" }} />
                  <div className="absolute bottom-1/3 right-1/4 w-10 h-10 bg-amber-300/50 rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
                  <div className="absolute bottom-1/4 left-1/3 w-8 h-8 bg-violet-300/50 rounded-full animate-pulse" style={{ animationDelay: "500ms" }} />
                  
                  {/* User location */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div className="w-7 h-7 bg-[#39B54A] rounded-full border-4 border-white shadow-lg" />
                    <div className="absolute inset-0 w-14 h-14 -m-3.5 bg-[#39B54A]/20 rounded-full animate-ping" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Results skeleton */}
          <div className="order-1 lg:order-2 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
              <div className="h-6 w-24 bg-gray-100 rounded animate-pulse" />
            </div>
            
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-gray-200 overflow-hidden animate-pulse"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                {/* Top accent */}
                <div className="h-1.5 bg-gray-200" />
                <div className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 bg-gray-200 rounded-xl" />
                      <div>
                        <div className="h-5 w-32 bg-gray-200 rounded mb-1.5" />
                        <div className="h-4 w-20 bg-gray-100 rounded" />
                      </div>
                    </div>
                    <div className="h-6 w-16 bg-gray-100 rounded-full" />
                  </div>
                  
                  {/* Stats */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-5 w-16 bg-gray-100 rounded" />
                    <div className="h-5 w-20 bg-gray-100 rounded" />
                    <div className="h-5 w-24 bg-gray-100 rounded" />
                  </div>
                  
                  {/* Footer */}
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex gap-2">
                      <div className="h-7 w-24 bg-gray-100 rounded-full" />
                      <div className="h-7 w-28 bg-gray-100 rounded-full" />
                    </div>
                    <div className="h-9 w-28 bg-[#39B54A]/20 rounded-lg" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
