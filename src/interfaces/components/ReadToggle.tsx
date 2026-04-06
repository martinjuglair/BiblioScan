import { useState, useRef } from "react";
import { hapticSuccess } from "@interfaces/utils/haptics";

interface ReadToggleProps {
  isRead: boolean;
  onChange: (isRead: boolean) => void;
}

/**
 * Animated slider toggle to mark a book as read/unread.
 * - Swipe or tap to toggle
 * - Haptic feedback on change
 * - Confetti-like burst animation on "read"
 */
export function ReadToggle({ isRead, onChange }: ReadToggleProps) {
  const [animating, setAnimating] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const handleToggle = () => {
    const newVal = !isRead;
    if (newVal) {
      hapticSuccess();
      setAnimating(true);
      setTimeout(() => setAnimating(false), 600);
    }
    onChange(newVal);
  };

  return (
    <button
      onClick={handleToggle}
      className="relative flex items-center gap-2 group"
      aria-label={isRead ? "Marquer comme non lu" : "Marquer comme lu"}
    >
      {/* Track */}
      <div
        ref={trackRef}
        className={`relative w-14 h-8 rounded-full transition-all duration-300 ease-out ${
          isRead
            ? "bg-status-success shadow-[0_0_12px_rgba(34,197,94,0.3)]"
            : "bg-border-strong"
        }`}
      >
        {/* Thumb */}
        <div
          className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-all duration-300 ease-out flex items-center justify-center ${
            isRead ? "left-7" : "left-1"
          } ${animating ? "scale-110" : "scale-100"}`}
        >
          {isRead ? (
            <svg className="w-3.5 h-3.5 text-status-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <div className="w-1.5 h-1.5 rounded-full bg-border-strong" />
          )}
        </div>

        {/* Sparkle burst on toggle to "read" */}
        {animating && (
          <>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
              {[0, 60, 120, 180, 240, 300].map((deg) => (
                <div
                  key={deg}
                  className="absolute w-1 h-1 rounded-full bg-status-success"
                  style={{
                    animation: `sparkle-burst 600ms ease-out forwards`,
                    transform: `rotate(${deg}deg) translateY(-2px)`,
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Label */}
      <span
        className={`text-xs font-semibold transition-colors duration-300 ${
          isRead ? "text-status-success" : "text-text-muted"
        }`}
      >
        {isRead ? "Lu" : "À lire"}
      </span>
    </button>
  );
}
