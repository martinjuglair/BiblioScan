import { useEffect, useMemo } from "react";
import { hapticSuccess } from "@interfaces/utils/haptics";

interface ScanSuccessProps {
  title: string;
  coverUrl: string | null;
  onDone: () => void;
}

// Generate random confetti particles at mount time
function useConfettiParticles(count: number) {
  return useMemo(() => {
    const colors = ["#F59E0B", "#EF4444", "#3B82F6", "#FB6538", "#FB6538", "#EC4899"];
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      color: colors[i % colors.length],
      left: Math.random() * 100,
      delay: Math.random() * 0.8,
      duration: 1.2 + Math.random() * 0.8,
      size: 4 + Math.random() * 4,
      isSquare: Math.random() > 0.5,
    }));
  }, [count]);
}

export function ScanSuccess({ title, coverUrl, onDone }: ScanSuccessProps) {
  const particles = useConfettiParticles(24);

  // Haptic + auto-dismiss after 1.5s
  useEffect(() => {
    hapticSuccess();
    const timer = setTimeout(onDone, 1500);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <>
      <style>{`
        @keyframes scan-checkmark-stroke {
          0% { stroke-dashoffset: 48; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes scan-checkmark-circle {
          0% { stroke-dashoffset: 166; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes scan-fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scan-confetti-fall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translateY(calc(100vh + 20px)) rotate(720deg); opacity: 0; }
        }
      `}</style>

      <div className="fixed inset-0 z-[65] bg-black/60 flex flex-col items-center justify-center px-4">
        {/* Confetti particles */}
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute top-0"
            style={{
              left: `${p.left}%`,
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              borderRadius: p.isSquare ? "1px" : "50%",
              animation: `scan-confetti-fall ${p.duration}s ease-in ${p.delay}s forwards`,
              opacity: 0,
            }}
          />
        ))}

        {/* Checkmark */}
        <div className="mb-6">
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
            <circle
              cx="40"
              cy="40"
              r="36"
              stroke="#FB6538"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="166"
              strokeDashoffset="166"
              style={{ animation: "scan-checkmark-circle 0.5s ease-out 0.1s forwards" }}
            />
            <path
              d="M25 42L35 52L55 30"
              stroke="#FB6538"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="48"
              strokeDashoffset="48"
              style={{ animation: "scan-checkmark-stroke 0.4s ease-out 0.5s forwards" }}
            />
          </svg>
        </div>

        {/* Cover thumbnail */}
        {coverUrl && (
          <div
            className="mb-4"
            style={{ animation: "scan-fade-in 0.4s ease-out 0.3s both" }}
          >
            <img
              src={coverUrl}
              alt={title}
              className="w-20 h-28 object-cover rounded-lg shadow-hero"
            />
          </div>
        )}

        {/* Title */}
        <p
          className="text-white text-center text-base font-semibold max-w-xs leading-snug"
          style={{ animation: "scan-fade-in 0.4s ease-out 0.5s both" }}
        >
          {title}
        </p>
        <p
          className="text-white/60 text-sm mt-1"
          style={{ animation: "scan-fade-in 0.4s ease-out 0.6s both" }}
        >
          Ajouté à votre collection
        </p>
      </div>
    </>
  );
}
