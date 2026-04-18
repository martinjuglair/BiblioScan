interface LoadingLogoProps {
  /** Main message displayed under the logo (e.g. "Préparation des recommandations"). */
  message?: string;
  /** Optional smaller hint under the main message. */
  hint?: string;
}

/**
 * Branded loading indicator: pulses the Ploom logo and shows a message.
 * Use for screens that may take a couple seconds to hydrate (e.g. Discover
 * recommendations calling Google Books / Supabase).
 */
export function LoadingLogo({
  message = "Chargement",
  hint,
}: LoadingLogoProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="relative w-24 h-24 flex items-center justify-center">
        <div
          className="absolute w-[120px] h-[120px] rounded-[30px]"
          style={{
            background: "rgba(251, 101, 56, 0.25)",
            animation: "loading-glow 2.8s ease-in-out infinite",
          }}
        />
        <img
          src="/ploom-logo.png"
          alt="Ploom"
          className="relative w-[72px] h-[72px] rounded-[18px]"
          style={{
            animation: "loading-pulse 1.8s ease-in-out infinite",
          }}
        />
      </div>

      <div className="mt-5 flex flex-col items-center">
        <div className="flex items-baseline text-sm font-semibold text-text-secondary">
          <span>{message}</span>
          <span className="ml-0.5 inline-flex gap-[1px]">
            <span
              className="font-bold text-brand-grape"
              style={{ animation: "loading-dot 1.2s infinite 0ms" }}
            >
              .
            </span>
            <span
              className="font-bold text-brand-grape"
              style={{ animation: "loading-dot 1.2s infinite 200ms" }}
            >
              .
            </span>
            <span
              className="font-bold text-brand-grape"
              style={{ animation: "loading-dot 1.2s infinite 400ms" }}
            >
              .
            </span>
          </span>
        </div>
        {hint && <p className="text-xs text-text-tertiary mt-1">{hint}</p>}
      </div>

      <style>{`
        @keyframes loading-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
        @keyframes loading-glow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.08); }
        }
        @keyframes loading-dot {
          0%, 60%, 100% { opacity: 0; }
          30% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
