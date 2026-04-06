import { useCallback, useRef, useState, ReactNode } from "react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
}

const THRESHOLD = 60;
const MAX_PULL = 120;

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (refreshing) return;
      // Only trigger when scrolled to the top
      if (window.scrollY > 5) return;

      startY.current = e.touches[0]!.clientY;
      pulling.current = true;
    },
    [refreshing],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!pulling.current || refreshing) return;

      const deltaY = e.touches[0]!.clientY - startY.current;
      if (deltaY < 0) {
        setPullDistance(0);
        return;
      }

      // Rubber-band: diminishing returns past threshold
      const dampened = deltaY < THRESHOLD
        ? deltaY
        : THRESHOLD + (deltaY - THRESHOLD) * 0.4;

      setPullDistance(Math.min(dampened, MAX_PULL));
    },
    [refreshing],
  );

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;

    if (pullDistance >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullDistance(THRESHOLD); // Hold at threshold while refreshing
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, refreshing, onRefresh]);

  return (
    <>
      <style>{`
        @keyframes ptr-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div
        ref={containerRef}
        className="relative"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Spinner indicator */}
        <div
          className="flex items-center justify-center overflow-hidden"
          style={{
            height: pullDistance,
            transition: pulling.current ? "none" : "height 300ms ease-out",
          }}
        >
          <div
            className="w-6 h-6 border-2 border-brand-amber border-t-transparent rounded-full"
            style={{
              opacity: Math.min(pullDistance / THRESHOLD, 1),
              transform: refreshing
                ? undefined
                : `rotate(${(pullDistance / THRESHOLD) * 360}deg)`,
              animation: refreshing ? "ptr-spin 0.7s linear infinite" : "none",
              transition: refreshing ? "none" : "transform 0s",
            }}
          />
        </div>

        {/* Content */}
        <div
          style={{
            transform: `translateY(0)`,
          }}
        >
          {children}
        </div>
      </div>
    </>
  );
}
