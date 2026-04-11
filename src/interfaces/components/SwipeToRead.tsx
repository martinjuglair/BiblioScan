import { useRef, useState, useCallback } from "react";
import { hapticSuccess, hapticLight } from "@interfaces/utils/haptics";

interface SwipeToReadProps {
  isRead: boolean;
  onChange: (isRead: boolean) => void;
}

const THUMB_SIZE = 52;
const PADDING = 4;
const TRACK_HEIGHT = THUMB_SIZE + PADDING * 2;

/**
 * Elegant swipe-to-read toggle.
 * Clean grape gradient, SVG icons, shimmer effect, celebration particles.
 */
export function SwipeToRead({ isRead, onChange }: SwipeToReadProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState(0);
  const [celebrating, setCelebrating] = useState(false);
  const startX = useRef(0);
  const hasMoved = useRef(false);
  const maxRef = useRef(200);

  const measureMax = () => {
    if (trackRef.current) {
      maxRef.current = trackRef.current.offsetWidth - THUMB_SIZE - PADDING * 2;
    }
    return maxRef.current;
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    startX.current = e.touches[0]!.clientX;
    hasMoved.current = false;
    setDragging(true);
    setOffset(0);
    measureMax();
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    const dx = e.touches[0]!.clientX - startX.current;
    if (Math.abs(dx) > 4) hasMoved.current = true;
    const max = maxRef.current;

    if (isRead) {
      setOffset(Math.max(-max, Math.min(0, dx)));
    } else {
      setOffset(Math.max(0, Math.min(max, dx)));
    }
  }, [isRead]);

  const trigger = useCallback((newVal: boolean) => {
    if (newVal) {
      hapticSuccess();
      setCelebrating(true);
      setTimeout(() => setCelebrating(false), 800);
    } else {
      hapticLight();
    }
    onChange(newVal);
    setOffset(0);
  }, [onChange]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    setDragging(false);
    const max = maxRef.current;

    if (!hasMoved.current) {
      trigger(!isRead);
      return;
    }

    if (Math.abs(offset) > max * 0.4) {
      trigger(!isRead);
    } else {
      setOffset(0);
    }
  }, [isRead, offset, trigger]);

  const max = maxRef.current;
  const thumbPos = isRead ? max + offset : offset;
  const progress = max > 0 ? Math.max(0, Math.min(1, thumbPos / max)) : 0;

  const gradientStop = Math.round(progress * 100);

  return (
    <div
      ref={trackRef}
      className="relative w-full select-none touch-none overflow-hidden"
      style={{ height: TRACK_HEIGHT, borderRadius: TRACK_HEIGHT / 2 }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Track background */}
      <div
        className="absolute inset-0"
        style={{
          borderRadius: TRACK_HEIGHT / 2,
          background: progress > 0.02
            ? `linear-gradient(90deg, rgba(139,92,246,0.15) 0%, rgba(139,92,246,0.1) ${gradientStop}%, #F0F0F3 ${gradientStop}%)`
            : "#F0F0F3",
          transition: dragging ? "none" : "background 400ms ease-out",
        }}
      />

      {/* Shimmer when not read and not dragging */}
      {!isRead && !dragging && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            borderRadius: TRACK_HEIGHT / 2,
            background: "linear-gradient(90deg, transparent 0%, rgba(139,92,246,0.12) 45%, rgba(139,92,246,0.15) 55%, transparent 100%)",
            backgroundSize: "250% 100%",
            animation: "shimmer 2.5s ease-in-out infinite",
          }}
        />
      )}

      {/* Label */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{
          paddingLeft: isRead ? 0 : THUMB_SIZE + PADDING + 8,
          paddingRight: isRead ? THUMB_SIZE + PADDING + 8 : 0,
          transition: dragging ? "none" : "opacity 300ms",
          opacity: dragging ? 0.2 : 1,
        }}
      >
        <span
          className={`text-[13px] font-semibold tracking-wide ${
            isRead ? "text-brand-grape font-bold" : "text-text-muted"
          }`}
        >
          {isRead ? "Lu" : "Glisser pour marquer lu"}
        </span>
      </div>

      {/* Thumb */}
      <div
        className="absolute flex items-center justify-center"
        style={{
          width: THUMB_SIZE,
          height: THUMB_SIZE,
          borderRadius: THUMB_SIZE / 2,
          top: PADDING,
          left: PADDING + Math.max(0, Math.min(max, thumbPos)),
          transition: dragging
            ? "background 150ms, box-shadow 150ms"
            : "left 400ms cubic-bezier(0.34, 1.56, 0.64, 1), background 300ms, box-shadow 300ms",
          background: progress > 0.3
            ? `rgba(139,92,246,${0.6 + progress * 0.4})`
            : "white",
          boxShadow: progress > 0.3
            ? `0 4px 15px rgba(139,92,246,${progress * 0.4})`
            : "0 2px 8px rgba(0,0,0,0.1)",
        }}
      >
        {progress > 0.3 ? (
          <svg
            className={`w-5 h-5 text-white transition-transform duration-200 ${celebrating ? "scale-125" : "scale-100"}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-5 h-5 text-brand-grape" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        )}
      </div>

      {/* Celebration particles */}
      {celebrating && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ borderRadius: TRACK_HEIGHT / 2 }}>
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <div
              key={deg}
              className="absolute rounded-full"
              style={{
                width: 5,
                height: 5,
                left: `${PADDING + Math.min(max, thumbPos) + THUMB_SIZE / 2}px`,
                top: "50%",
                background: deg % 90 === 0 ? "#8B5CF6" : "#F472B6",
                animation: "sparkle-burst 600ms ease-out forwards",
                transform: `rotate(${deg}deg) translateY(-3px)`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
