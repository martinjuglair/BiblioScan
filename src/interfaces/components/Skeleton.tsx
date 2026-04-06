/**
 * Skeleton / shimmer loading placeholders.
 * Replace spinners with content-shaped placeholders for a premium feel.
 */

/** Base shimmer block with animated gradient */
function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={`rounded-lg ${className ?? ""}`}
      style={{
        background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 37%, #f0f0f0 63%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.4s ease-in-out infinite",
      }}
    />
  );
}

/** Skeleton for Library view — category cards grid + stats */
export function LibrarySkeleton() {
  return (
    <div className="px-3 sm:px-4 py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <Shimmer className="h-7 w-40" />
        <div className="flex gap-2">
          <Shimmer className="w-11 h-11 rounded-full" />
          <Shimmer className="w-11 h-11 rounded-full" />
        </div>
      </div>

      {/* Stats row */}
      <div className="flex gap-2 mb-5 overflow-hidden">
        {[1, 2, 3, 4].map((i) => (
          <Shimmer key={i} className="w-32 h-20 rounded-card flex-shrink-0" />
        ))}
      </div>

      {/* Search bar */}
      <div className="flex gap-2 mb-3">
        <Shimmer className="h-11 flex-1 rounded-pill" />
        <Shimmer className="h-11 w-24 rounded-pill" />
      </div>

      {/* Category cards grid */}
      <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card">
            <Shimmer className="w-full h-28 sm:h-32 rounded-lg mb-2" />
            <Shimmer className="h-5 w-3/4 mb-1.5" />
            <Shimmer className="h-4 w-1/3" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Skeleton for CategoryDetail — book list */
export function CategoryDetailSkeleton() {
  return (
    <div className="px-3 sm:px-4 py-4">
      {/* Back button */}
      <Shimmer className="h-5 w-16 mb-4" />

      {/* Title + count */}
      <Shimmer className="h-7 w-48 mb-1" />
      <Shimmer className="h-4 w-24 mb-4" />

      {/* Book list */}
      <div className="flex flex-col gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="card flex gap-3">
            <Shimmer className="w-14 h-20 rounded-lg flex-shrink-0" />
            <div className="flex-1 flex flex-col justify-center gap-1.5">
              <Shimmer className="h-5 w-3/4" />
              <Shimmer className="h-4 w-1/2" />
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Shimmer key={s} className="w-3.5 h-3.5 rounded-full" />
                ))}
              </div>
            </div>
            <Shimmer className="w-4 h-4 self-center rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Skeleton for BookDetail — single book */
export function BookDetailSkeleton() {
  return (
    <div className="px-3 sm:px-4 py-4">
      {/* Back */}
      <Shimmer className="h-5 w-16 mb-4" />

      {/* Cover */}
      <div className="flex flex-col items-center mb-6">
        <Shimmer className="w-36 h-52 rounded-card mb-4" />
        <Shimmer className="h-6 w-48 mb-2" />
        <Shimmer className="h-4 w-32" />
      </div>

      {/* Info card */}
      <div className="card space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i}>
            <Shimmer className="h-3 w-20 mb-1" />
            <Shimmer className="h-4 w-3/4" />
          </div>
        ))}
        <Shimmer className="h-11 w-full rounded-pill mt-2" />
      </div>

      {/* Review card */}
      <div className="card mt-4 space-y-3">
        <Shimmer className="h-4 w-20" />
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <Shimmer key={s} className="w-7 h-7 rounded" />
          ))}
        </div>
        <Shimmer className="h-16 w-full rounded-lg" />
        <Shimmer className="h-11 w-full rounded-pill" />
      </div>
    </div>
  );
}
