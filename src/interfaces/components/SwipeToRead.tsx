import { hapticSuccess, hapticLight } from "@interfaces/utils/haptics";

interface SwipeToReadProps {
  isRead: boolean;
  onChange: (isRead: boolean) => void;
}

/**
 * Big tappable toggle for "marqué comme lu".
 *
 * Historically this was a swipe gesture (hence the legacy name), but custom
 * pointer handlers were fragile. A tap-only pill is simpler, 100% reliable,
 * and still feels snappy with scale animation + haptic feedback.
 */
export function SwipeToRead({ isRead, onChange }: SwipeToReadProps) {
  const handleClick = () => {
    if (isRead) {
      hapticLight();
    } else {
      hapticSuccess();
    }
    onChange(!isRead);
  };

  return (
    <button
      onClick={handleClick}
      className={
        "relative w-full flex items-center justify-center gap-2.5 py-3.5 px-5 rounded-full border-[1.5px] overflow-hidden font-bold text-[15px] transition-transform active:scale-[0.97] " +
        (isRead
          ? "bg-brand-grape border-brand-grape text-white shadow-card"
          : "bg-white border-brand-grape/30 text-brand-grape")
      }
      style={
        isRead
          ? { boxShadow: "0 4px 14px rgba(139,92,246,0.25)" }
          : undefined
      }
    >
      {!isRead && (
        <span
          className="absolute inset-y-0 w-20 pointer-events-none"
          style={{
            background: "rgba(139,92,246,0.08)",
            transform: "skewX(-20deg)",
            animation: "read-shimmer 2.4s ease-in-out infinite",
          }}
        />
      )}

      <span
        className="relative w-7 h-7 rounded-full bg-white flex items-center justify-center shadow-card flex-shrink-0"
      >
        <svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <path
            d="M5 13l4 4L19 7"
            stroke="#A855F7"
            strokeWidth={isRead ? 3 : 2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={isRead ? 1 : 0.35}
          />
        </svg>
      </span>

      <span className="relative">{isRead ? "Lu" : "Marquer comme lu"}</span>

      {!isRead && (
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" className="relative">
          <path
            d="M9 6l6 6-6 6"
            stroke="#A855F7"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.6}
          />
        </svg>
      )}

      <style>{`
        @keyframes read-shimmer {
          0% { transform: translateX(-120px) skewX(-20deg); }
          100% { transform: translateX(100vw) skewX(-20deg); }
        }
      `}</style>
    </button>
  );
}
