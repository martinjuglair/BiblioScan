import { useRef, useState, useCallback } from "react";
import { hapticSuccess, hapticLight } from "@interfaces/utils/haptics";

interface SwipeToReadProps {
  isRead: boolean;
  onChange: (isRead: boolean) => void;
}

const THUMB_SIZE = 52;
const PADDING = 4;

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
  const trackWidth = useRef(0);

  const getMaxOffset = () => {
    if (trackRef.current) {
      trackWidth.current = trackRef.current.offsetWidth;
    }
    return trackWidth.current - THUMB_SIZE - PADDING * 2;
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    startX.current = e.touches[0]!.clientX;
    hasMoved.current = false;
    setDragging(true);
    setOffset(0);
    getMaxOffset();
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    const dx = e.touches[0]!.clientX - startX.current;
    if (Math.abs(dx) > 4) hasMoved.current = true;
    const max = getMaxOffset();

    if (isRead) {
      setOffset(Math.max(-max, Math.min(0, dx)));
    } else {
      setOffset(Math.max(0, Math.min(max, dx)));
    }
  }, [isRead]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    setDragging(false);
    const max = getMaxOffset();
    const threshold = max * 0.45;

    if (!hasMoved.current) {
      const newVal = !isRead;
      if (newVal) {
        hapticSuccess();
        setCelebrating(true);
        setTimeout(() => setCelebrating(false), 800);
      } else {
        hapticLight();
      }
      onChange(newVal);
      setOffset(0);
      return;
    }

    const absOffset = Math.abs(offset);
    if (absOffset > threshold) {
      const newVal = !isRead;
      if (newVal) {
        hapticSuccess();
        setCelebrating(true);
        setTimeout(() => setCelebrating(false), 800);
      } else {
        hapticLight();
      }
      onChange(newVal);
    }
    setOffset(0);
  }, [isRead, offset, onChange]);

  const maxOffset = getMaxOffset() || 200;
  const thumbPos = isRead ? maxOffset + offset : offset;
  const progress = Math.max(0, Math.min(1, thumbPos / maxOffset));

  return (
    <div
      ref={trackRef}
      className="relative w-full select-none touch-none"
      style={{ height: THUMB_SIZE + PADDING * 2 }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Track background */}
      <div
        className="absolute inset-0 rounded-full overflow-hidden transition-all duration-300"
        style={{
          background: progress > 0.5
            ? `linear-gradient(90deg, rgba(139,92,246,${0.15 + progress * 0.25}), rgba(244,114,182,${0.1 + progress * 0.2}))`
            : "#F0F0F3",
        }}
      >
        {/* Shimmer when not read */}
        {!isRead && !dragging && (
          <div
            className="absolute inset-0 opacity-50"
            style={{
              background: "linear-gradient(90deg, transparent 0%, rgba(139,92,246,0.2) 40%, rgba(244,114,182,0.25) 60%, transparent 100%)",
              backgroundSize: "250% 100%",
              animation: "shimmer 3s ease-in-out infinite",
            }}
          />
        )}

        {/* Track label */}
        <div className="absolute inset-0 flex items-center pointer-events-none">
          <span
            className={`text-sm font-bold tracking-wide transition-all duration-300 ${
              isRead ? "text-brand-grape" : "text-text-muted"
            } ${dragging ? "opacity-0" : "opacity-100"}`}
            style={{
              position: "absolute",
              left: isRead ? "24px" : undefined,
              right: isRead ? undefined : "24px",
            }}
          >
            {isRead ? "✓ Lu" : "Glisser pour marquer lu →"}
          </span>
        </div>
      </div>

      {/* Thumb */}
      <div
        className="absolute rounded-full shadow-lg flex items-center justify-center"
        style={{
          width: THUMB_SIZE,
          height: THUMB_SIZE,
          top: PADDING,
          left: PADDING + Math.max(0, Math.min(maxOffset, thumbPos)),
          transition: dragging ? "none" : "left 400ms cubic-bezier(0.34, 1.56, 0.64, 1), background 300ms, box-shadow 300ms",
          background: progress > 0.5
            ? "linear-gradient(135deg, #8B5CF6 0%, #F472B6 100%)"
            : "white",
          boxShadow: progress > 0.5
            ? "0 4px 15px rgba(139,92,246,0.4)"
            : "0 2px 8px rgba(0,0,0,0.12)",
        }}
      >
        {progress > 0.5 ? (
          <svg
            className={`w-6 h-6 text-white transition-transform duration-300 ${celebrating ? "scale-125" : "scale-100"}`}
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
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
            <div
              key={deg}
              className="absolute w-2 h-2 rounded-full"
              style={{
                left: `${PADDING + Math.min(maxOffset, thumbPos) + THUMB_SIZE / 2}px`,
                top: "50%",
                background: deg % 60 === 0 ? "#8B5CF6" : deg % 60 === 30 ? "#F472B6" : "#A78BFA",
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
