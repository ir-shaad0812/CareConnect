// ============================================
// MESSAGES PAGE LOADING STATE
// Premium skeleton loader for streaming SSR
// ============================================

export default function MessagesLoading() {
  const filterPillWidths = [72, 84, 66, 90, 78];
  return (
    <div className="h-screen bg-linear-to-br from-gray-50 via-white to-[#39B54A]/5">
      <div className="h-full max-w-[1600px] mx-auto flex gap-0">
        {/* Sidebar Skeleton */}
        <aside className="w-full md:w-[380px] lg:w-[420px] bg-white/80 backdrop-blur-xl border-r border-gray-200/60 flex flex-col">
          {/* Header */}
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="h-8 w-32 bg-gray-200 rounded-lg animate-pulse" />
                <div className="h-4 w-24 bg-gray-100 rounded mt-1.5 animate-pulse" />
              </div>
              <div className="w-10 h-10 bg-gray-100 rounded-xl animate-pulse" />
            </div>

            {/* Search skeleton */}
            <div className="w-full h-12 bg-gray-100 rounded-xl animate-pulse mb-4" />

            {/* Filter pills skeleton */}
            <div className="flex gap-2 overflow-hidden">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-8 rounded-lg bg-gray-100 animate-pulse shrink-0"
                  style={{ width: `${filterPillWidths[i - 1]}px` }}
                />
              ))}
            </div>
          </div>

          {/* Conversation list skeleton */}
          <div className="flex-1 overflow-hidden px-3 py-2 space-y-2">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div
                key={i}
                className="p-4 rounded-xl bg-gray-50 animate-pulse"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-14 h-14 bg-gray-200 rounded-2xl shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="h-5 w-32 bg-gray-200 rounded" />
                      <div className="h-4 w-12 bg-gray-100 rounded" />
                    </div>
                    <div className="h-4 w-full bg-gray-100 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Main Chat Area Skeleton */}
        <main className="hidden md:flex flex-1 flex-col bg-white/40 backdrop-blur-sm">
          {/* Empty state placeholder */}
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="relative mb-8">
              <div className="w-32 h-32 bg-linear-to-br from-[#39B54A]/10 to-[#39B54A]/5 rounded-[2.5rem] animate-pulse" />
              <div className="absolute -top-3 -right-3 w-14 h-14 bg-linear-to-br from-[#39B54A]/20 to-[#39B54A]/10 rounded-2xl animate-pulse" />
            </div>
            <div className="h-8 w-64 bg-gray-200 rounded-lg animate-pulse mb-3" />
            <div className="h-5 w-80 bg-gray-100 rounded animate-pulse mb-8" />
            <div className="flex gap-3">
              <div className="h-12 w-40 bg-[#39B54A]/20 rounded-xl animate-pulse" />
              <div className="h-12 w-36 bg-gray-100 rounded-xl animate-pulse" />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
