import { useEffect, useRef, useState, useCallback } from "react";
import { onLevelUp } from "@interfaces/utils/levelEvent";
import type { LevelDef } from "@interfaces/utils/levels";
import { hapticSuccess, hapticMedium } from "@interfaces/utils/haptics";
import { setLevelBannerVisible } from "@interfaces/utils/bannerCoordinator";

/**
 * Full-width banner that slides down when the user reaches a new level.
 * Visual twin of BadgeBanner but a notch more "wow" : themed gradient per level,
 * confetti in background, large emoji and doubled haptic.
 */
export function LevelUpBanner() {
  const [queue, setQueue] = useState<LevelDef[]>([]);
  const [current, setCurrent] = useState<LevelDef | null>(null);
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(100);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const unsub = onLevelUp((lvl) => {
      setQueue((q) => [...q, lvl]);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (current || queue.length === 0) return;
    const [next, ...rest] = queue;
    setCurrent(next!);
    setQueue(rest);
  }, [queue, current]);

  useEffect(() => {
    if (!current) return;

    // Claim the top-of-screen slot so BadgeBanner pauses its queue.
    setLevelBannerVisible(true);

    hapticSuccess();
    setTimeout(() => hapticMedium(), 180);

    setProgress(100);
    setVisible(true);

    const start = Date.now();
    const duration = 8000;
    progressInterval.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining <= 0 && progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    }, 30);

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
    setTimeout(() => {
      setCurrent(null);
      // Release the slot so any queued BadgeBanner can now show.
      setLevelBannerVisible(false);
    }, 350);
  }, []);

  if (!current) return null;

  return (
    <>
      <div
        className="fixed left-4 right-4 z-[200] cursor-pointer max-w-lg mx-auto"
        style={{
          top: 16,
          transform: visible ? "translateY(0)" : "translateY(-140%)",
          opacity: visible ? 1 : 0,
          transition: "transform 500ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 300ms ease-out",
        }}
        onClick={dismiss}
      >
        <div
          className="rounded-[22px] overflow-hidden relative"
          style={{
            background: `linear-gradient(135deg, ${current.colorDeep} 0%, ${current.color} 140%)`,
            boxShadow: `0 12px 40px ${current.color}66`,
          }}
        >
          {/* Confetti */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: 14 }).map((_, i) => {
              const left = (i * 37) % 95;
              const delay = (i * 120) % 700;
              const dur = 1200 + (i * 180) % 1000;
              return (
                <div
                  key={i}
                  className="absolute w-[5px] h-[10px] rounded-[1.5px]"
                  style={{
                    top: -8,
                    left: `${left}%`,
                    backgroundColor: i % 3 === 0 ? "#FFFFFF" : current.color,
                    animation: `level-confetti ${dur}ms linear ${delay}ms infinite`,
                  }}
                />
              );
            })}
          </div>

          <div className="flex items-center gap-3.5 px-4 py-4 relative">
            {/* Emoji with glow */}
            <div
              className="w-14 h-14 rounded-[18px] flex items-center justify-center flex-shrink-0"
              style={{
                background: `${current.color}55`,
                animation: visible ? "level-glow 1.8s ease-in-out infinite" : "none",
              }}
            >
              <span
                className="text-[32px] leading-none"
                style={{ animation: visible ? "level-emoji-bounce 700ms ease-out" : "none" }}
              >
                {current.emoji}
              </span>
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p
                className="text-[10px] font-bold uppercase tracking-[1.5px] mb-0.5"
                style={{ color: current.color }}
              >
                Niveau débloqué !
              </p>
              <p className="text-lg font-bold text-white truncate">{current.name}</p>
              <p className="text-xs text-white/85 line-clamp-2 mt-0.5">{current.subtitle}</p>
            </div>

            <span
              className="text-xl flex-shrink-0"
              style={{ animation: visible ? "level-sparkle 1s ease-in-out infinite" : "none" }}
            >
              ✨
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-[3px] bg-white/15 relative">
            <div
              className="h-full"
              style={{
                width: `${progress}%`,
                background: current.color,
                transition: "width 30ms linear",
              }}
            />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes level-glow {
          0%, 100% { box-shadow: 0 0 0 0 ${current.color}00; }
          50% { box-shadow: 0 0 14px 5px ${current.color}66; }
        }
        @keyframes level-emoji-bounce {
          0% { transform: scale(0.5); opacity: 0; }
          50% { transform: scale(1.25); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes level-sparkle {
          0%, 100% { transform: rotate(0deg) scale(1); }
          25% { transform: rotate(12deg) scale(1.12); }
          75% { transform: rotate(-12deg) scale(0.92); }
        }
        @keyframes level-confetti {
          0% { transform: translateY(0) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(110px) rotate(360deg); opacity: 0; }
        }
      `}</style>
    </>
  );
}
