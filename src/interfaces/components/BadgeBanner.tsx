import { useEffect, useRef, useState, useCallback } from "react";
import { onBadgeEarned } from "@interfaces/utils/badgeEvent";
import type { BadgeDef } from "@interfaces/utils/badges";
import { hapticSuccess } from "@interfaces/utils/haptics";
import {
  subscribeLevelBannerVisibility,
  isLevelBannerVisible,
} from "@interfaces/utils/bannerCoordinator";

/**
 * Global animated badge banner for web.
 * Place this in App.tsx so it renders above all content.
 * Listens to the badge event bus and shows a gamified slide-down banner.
 */
export function BadgeBanner() {
  const [queue, setQueue] = useState<BadgeDef[]>([]);
  const [current, setCurrent] = useState<BadgeDef | null>(null);
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(100);
  // Locked while a LevelUpBanner is up (see bannerCoordinator).
  const [levelShowing, setLevelShowing] = useState<boolean>(isLevelBannerVisible());
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Subscribe to badge events
  useEffect(() => {
    const unsub = onBadgeEarned((badge) => {
      setQueue((q) => [...q, badge]);
    });
    return unsub;
  }, []);

  // Track level banner visibility to avoid overlapping banners.
  useEffect(() => {
    return subscribeLevelBannerVisibility(setLevelShowing);
  }, []);

  // Process queue: show next badge when current is empty AND no level banner.
  useEffect(() => {
    if (current || queue.length === 0 || levelShowing) return;
    const [next, ...rest] = queue;
    setCurrent(next!);
    setQueue(rest);
  }, [queue, current, levelShowing]);

  // If a level banner lands while we're showing a badge, yield the slot:
  // re-queue the current badge at the front so it plays after the level.
  useEffect(() => {
    if (levelShowing && current) {
      setQueue((q) => [current, ...q]);
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
      if (progressInterval.current) clearInterval(progressInterval.current);
      setVisible(false);
      setTimeout(() => setCurrent(null), 250);
    }
  }, [levelShowing]);

  // Animate when current badge changes
  useEffect(() => {
    if (!current) return;

    hapticSuccess();
    setProgress(100);
    setVisible(true);

    // Progress bar countdown
    const start = Date.now();
    const duration = 6000;
    progressInterval.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining <= 0 && progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    }, 30);

    // Auto-dismiss after 6s
    dismissTimer.current = setTimeout(() => {
      dismiss();
    }, duration);

    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, [current]);

  const dismiss = useCallback(() => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    if (progressInterval.current) clearInterval(progressInterval.current);
    setVisible(false);
    // Wait for slide-out animation before clearing current
    setTimeout(() => setCurrent(null), 350);
  }, []);

  if (!current) return null;

  return (
    <>
      <div
        className="fixed left-4 right-4 z-[200] cursor-pointer max-w-lg mx-auto"
        style={{
          top: 16,
          transform: visible ? "translateY(0)" : "translateY(-120%)",
          opacity: visible ? 1 : 0,
          transition: "transform 500ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 300ms ease-out",
        }}
        onClick={dismiss}
      >
        <div
          className="rounded-[20px] overflow-hidden shadow-hero"
          style={{ background: "linear-gradient(135deg, #1A0B18 0%, #3C1329 100%)" }}
        >
          <div className="flex items-center gap-3.5 px-4 py-3.5">
            {/* Emoji with glow */}
            <div
              className="w-11 h-11 rounded-[14px] flex items-center justify-center flex-shrink-0"
              style={{
                background: "rgba(251, 101, 56, 0.25)",
                animation: visible ? "badge-glow 1.6s ease-in-out infinite" : "none",
              }}
            >
              <span className="text-[26px] leading-none" style={{ animation: visible ? "badge-emoji-bounce 600ms ease-out" : "none" }}>
                {current.emoji}
              </span>
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-[#FFC83D] uppercase tracking-[1.5px] mb-0.5">
                Badge débloqué !
              </p>
              <p className="text-base font-bold text-white truncate">
                {current.name}
              </p>
            </div>

            {/* Sparkle */}
            <span className="text-xl flex-shrink-0" style={{ animation: visible ? "badge-sparkle 1s ease-in-out infinite" : "none" }}>
              ✨
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-[3px] bg-white/10">
            <div
              className="h-full rounded-full"
              style={{
                width: `${progress}%`,
                background: "linear-gradient(90deg, #FF8B5F, #FFC83D)",
                transition: "width 30ms linear",
              }}
            />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes badge-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(251, 101, 56, 0); }
          50% { box-shadow: 0 0 12px 4px rgba(251, 101, 56, 0.3); }
        }
        @keyframes badge-emoji-bounce {
          0% { transform: scale(0.5); opacity: 0; }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes badge-sparkle {
          0%, 100% { transform: rotate(0deg) scale(1); }
          25% { transform: rotate(10deg) scale(1.1); }
          75% { transform: rotate(-10deg) scale(0.9); }
        }
      `}</style>
    </>
  );
}
