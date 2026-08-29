'use client';

export default function SkeletonLoader() {
  // Generate 8 skeleton rows
  const skeletonRows = Array.from({ length: 8 });

  return (
    <div className="animate-slide-up w-full">
      {/* Executive Board Skeleton */}
      <div className="mb-10">
        <div className="mb-4 flex items-center justify-center gap-3">
          <div className="h-6 w-32 rounded-full bg-white/10 animate-pulse" />
          <div className="h-6 w-32 rounded-full bg-accent-gold/20 animate-pulse" />
        </div>
        
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-card flex items-center gap-4 p-5 h-28 border border-white/5 bg-white/[0.02]">
              <div className="h-14 w-14 rounded-full bg-white/10 animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-3">
                <div className="h-4 w-3/4 rounded-full bg-white/10 animate-pulse" />
                <div className="h-3 w-1/2 rounded-full bg-white/5 animate-pulse" />
                <div className="h-4 w-1/3 rounded-full bg-accent-gold/20 animate-pulse mt-2" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Leaderboard Skeleton (shown below md) */}
      <div className="md:hidden space-y-4 mt-8">
        {skeletonRows.map((_, index) => (
          <div key={index} className="glass-card flex items-center justify-between p-4 h-24 border border-white/5 bg-white/[0.01]">
            <div className="flex items-center gap-3 w-full">
              {/* Rank */}
              <div className="h-10 w-10 rounded-xl bg-white/5 animate-pulse flex-shrink-0" />
              
              {/* Avatar & Name */}
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-white/10 animate-pulse flex-shrink-0" />
                  <div className="space-y-2 w-full">
                    <div className="h-4 w-32 rounded bg-white/10 animate-pulse" />
                    <div className="h-3 w-40 rounded-full bg-white/5 animate-pulse" />
                  </div>
                </div>
              </div>

              {/* Score */}
              <div className="h-8 w-16 rounded bg-accent-gold/20 animate-pulse flex-shrink-0" />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Leaderboard Skeleton (shown md+) */}
      <div className="hidden md:block glass-card glow-cyan overflow-x-auto mt-8">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02]">
              <th className="px-6 py-4 text-left"><div className="h-3 w-12 rounded-full bg-white/10 animate-pulse" /></th>
              <th className="px-6 py-4 text-left"><div className="h-3 w-24 rounded-full bg-white/10 animate-pulse" /></th>
              <th className="px-6 py-4 text-left"><div className="h-3 w-24 rounded-full bg-white/10 animate-pulse" /></th>
              <th className="px-6 py-4 text-left"><div className="h-3 w-20 rounded-full bg-white/10 animate-pulse" /></th>
              <th className="px-6 py-4 text-right"><div className="h-3 w-16 rounded-full bg-white/10 animate-pulse ml-auto" /></th>
            </tr>
          </thead>
          <tbody>
            {skeletonRows.map((_, index) => (
              <tr key={index} className="border-b border-white/5 bg-white/[0.01]">
                {/* Rank */}
                <td className="px-6 py-5">
                  <div className="h-6 w-8 rounded bg-white/5 animate-pulse" />
                </td>
                {/* Name */}
                <td className="px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-white/10 animate-pulse flex-shrink-0" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 w-32 rounded bg-white/10 animate-pulse" />
                      <div className="h-3 w-20 rounded bg-white/5 animate-pulse hidden md:block" />
                    </div>
                  </div>
                </td>
                {/* Position */}
                <td className="px-6 py-5">
                  <div className="h-4 w-40 rounded-full bg-white/5 animate-pulse" />
                </td>
                {/* Division */}
                <td className="px-6 py-5">
                  <div className="h-5 w-24 rounded-full bg-white/10 animate-pulse" />
                </td>
                {/* Score */}
                <td className="px-6 py-5 text-right">
                  <div className="h-5 w-12 rounded bg-accent-gold/20 animate-pulse ml-auto" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
