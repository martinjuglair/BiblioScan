import { useRef, useState, useCallback } from "react";
import { hapticSuccess, hapticLight } from "@interfaces/utils/haptics";

interface SwipeToReadProps {
  isRead: boolean;
  onChange: (isRead: boolean) => void;
}

const THUMB_SIZE = 56;
const PADDING = 4;
const TRACK_HEIGHT = THUMB_SIZE + PADDING * 2;

/**
 * Full-width swipe-to-unlock style toggle for read status.
 * Grape-to-bubblegum gradient, large thumb, celebration particles.
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

  // Gradient fills continuously from left based on progress
  const gradientStop = Math.round(progress * 100);

  return (
    <div
      ref={trackRef}
      className="relative w-full select-none touch-none overflow-hidden rounded-full"
      style={{ height: TRACK_HEIGHT }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Track background — smooth gradient fill */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: progress > 0.02
            ? `linear-gradient(90deg, rgba(139,92,246,0.25) 0%, rgba(244,114,182,0.2) ${gradientStop}%, #F0F0F3 ${gradientStop}%)`
            : "#F0F0F3",
          transition: dragging ? "none" : "background 400ms ease-out",
        }}
      />

      {/* Shimmer when not read and not dragging */}
      {!isRead && !dragging && (
        <div
          className="absolute inset-0 rounded-full opacity-40 pointer-events-none"
          style={{
            background: "linear-gradient(90deg, transparent 0%, rgba(139,92,246,0.25) 40%, rgba(244,114,182,0.3) 60%, transparent 100%)",
            backgroundSize: "250% 100%",
            animation: "shimmer 3s ease-in-out infinite",
          }}
        />
      )}

      {/* Label — centered in remaining space */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{
          // Offset the text center away from the thumb
          paddingLeft: isRead ? 0 : THUMB_SIZE + PADDING,
          paddingRight: isRead ? THUMB_SIZE + PADDING : 0,
          transition: dragging ? "none" : "opacity 300ms",
          opacity: dragging ? 0.3 : 1,
        }}
      >
        <span
          className={`text-sm font-bold tracking-wide ${
            isRead ? "text-brand-grape" : "text-text-muted"
          }`}
        >
          {isRead ? "✓ Lu" : "Glisser pour marquer lu →"}
        </span>
      </div>

      {/* Thumb */}
      <div
        className="absolute rounded-full shadow-lg flex items-center justify-center"
        style={{
          width: THUMB_SIZE,
          height: THUMB_SIZE,
          top: PADDING,
          left: PADDING + Math.max(0, Math.min(max, thumbPos)),
          transition: dragging
            ? "background 150ms, box-shadow 150ms"
            : "left 400ms cubic-bezier(0.34, 1.56, 0.64, 1), background 300ms, box-shadow 300ms",
          background: progress > 0.3
            ? `linear-gradient(135deg, rgba(139,92,246,${0.5 + progress * 0.5}) 0%, rgba(244,114,182,${0.3 + progress * 0.7}) 100%)`
            : "white",
          boxShadow: progress > 0.3
            ? `0 4px 15px rgba(139,92,246,${progress * 0.5})`
            : "0 2px 8px rgba(0,0,0,0.12)",
        }}
      >
        {progress > 0.3 ? (
          <svg
            className={`w-6 h-6 text-white transition-transform duration-200 ${celebrating ? "scale-125" : "scale-100"}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-brand-grape" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        )}
      </div>

      {/* Celebration particles */}
      {celebrating && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-full">
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <div
              key={deg}
              className="absolute w-2 h-2 rounded-full"
              style={{
                left: `${PADDING + Math.min(max, thumbPos) + THUMB_SIZE / 2}px`,
                top: "50%",
                background: deg % 90 === 0 ? "#8B5CF6" : "#F472B6",
                animation: "sparkle-burst 700ms ease-out forwards",
                transform: `rotate(${deg}deg) translateY(-4px)`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
