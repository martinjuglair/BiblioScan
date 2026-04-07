import { useRef, useState, useCallback } from "react";
import { hapticSuccess, hapticLight } from "@interfaces/utils/haptics";

interface SwipeToReadProps {
  isRead: boolean;
  onChange: (isRead: boolean) => void;
}

const TRACK_WIDTH = 100;
const THUMB_SIZE = 30;
const THRESHOLD = TRACK_WIDTH - THUMB_SIZE - 12;

/**
 * Swipe-to-read: iPhone slide-to-unlock style.
 * Drag the thumb right to mark as read, left to mark unread.
 * Tapping also toggles.
 */
export function SwipeToRead({ isRead, onChange }: SwipeToReadProps) {
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState(0);
  const [celebrating, setCelebrating] = useState(false);
  const startX = useRef(0);
  const hasMoved = useRef(false);

  const maxOffset = TRACK_WIDTH - THUMB_SIZE - 8;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    startX.current = e.touches[0]!.clientX;
    hasMoved.current = false;
    setDragging(true);
    setOffset(0);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    const dx = e.touches[0]!.clientX - startX.current;
    if (Math.abs(dx) > 4) hasMoved.current = true;

    if (isRead) {
      // Drag left to unread
      setOffset(Math.max(-maxOffset, Math.min(0, dx)));
    } else {
      // Drag right to read
      setOffset(Math.max(0, Math.min(maxOffset, dx)));
    }
  }, [isRead, maxOffset]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    setDragging(false);

    if (!hasMoved.current) {
      // Tap toggle
      const newVal = !isRead;
      if (newVal) {
        hapticSuccess();
        setCelebrating(true);
        setTimeout(() => setCelebrating(false), 700);
      } else {
        hapticLight();
      }
      onChange(newVal);
      setOffset(0);
      return;
    }

    const absOffset = Math.abs(offset);
    if (absOffset > THRESHOLD * 0.5) {
      const newVal = !isRead;
      if (newVal) {
        hapticSuccess();
        setCelebrating(true);
        setTimeout(() => setCelebrating(false), 700);
      } else {
        hapticLight();
      }
      onChange(newVal);
    }
    setOffset(0);
  }, [isRead, offset, onChange]);

  // Compute visual position
  const thumbPos = isRead ? maxOffset + offset : offset;
  const progress = thumbPos / maxOffset;

  return (
    <div
      className="relative select-none touch-none"
      style={{ width: TRACK_WIDTH, height: THUMB_SIZE + 8 }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Track */}
      <div
        className="absolute inset-0 rounded-full overflow-hidden transition-colors duration-300"
        style={{
          background: progress > 0.5
            ? `linear-gradient(90deg, rgba(34,197,94,${0.15 + progress * 0.15}), rgba(34,197,94,${0.1 + progress * 0.2}))`
            : "#F5F5F7",
        }}
      >
        {/* Shimmer effect when not read */}
        {!isRead && !dragging && (
          <div
            className="absolute inset-0 opacity-40"
            style={{
              background: "linear-gradient(90deg, transparent 0%, rgba(255,175,54,0.3) 50%, transparent 100%)",
              backgroundSize: "200% 100%",
              animation: "shimmer 2.5s ease-in-out infinite",
            }}
          />
        )}

        {/* Track label */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className={`text-[10px] font-semibold transition-opacity duration-200 ${
            isRead ? "text-status-success" : "text-text-muted"
          } ${dragging ? "opacity-0" : "opacity-100"}`}>
            {isRead ? "Lu" : "Glisser"}
          </span>
        </div>
      </div>

      {/* Thumb */}
      <div
        className="absolute top-1 rounded-full shadow-md flex items-center justify-center"
        style={{
          width: THUMB_SIZE,
          height: THUMB_SIZE,
          left: 4 + Math.max(0, Math.min(maxOffset, thumbPos)),
          transition: dragging ? "none" : "left 300ms cubic-bezier(0.34, 1.56, 0.64, 1), background 300ms",
          background: progress > 0.5
            ? "linear-gradient(135deg, #22C55E, #16A34A)"
            : "white",
        }}
      >
        {progress > 0.5 ? (
          <svg className={`w-3.5 h-3.5 text-white transition-transform duration-300 ${celebrating ? "scale-125" : "scale-100"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        )}
      </div>

      {/* Celebration particles */}
      {celebrating && (
        <div className="absolute top-1/2 right-2 -translate-y-1/2 pointer-events-none">
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <div
              key={deg}
              className="absolute w-1.5 h-1.5 rounded-full bg-status-success"
              style={{
                animation: "sparkle-burst 600ms ease-out forwards",
                transform: `rotate(${deg}deg) translateY(-2px)`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
