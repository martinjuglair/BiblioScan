import { useState } from "react";
import { getLevel, getNextLevel, getLevelProgress } from "@interfaces/utils/levels";
import { LevelJourneySheet } from "./LevelJourneySheet";

interface LevelHeroCardProps {
  readCount: number;
}

/**
 * Big visual card displayed at the top of the profile screen.
 * Shows the user's current level with a themed gradient, a large animated
 * emoji, a progress bar towards the next level and opens the "Parcours" sheet.
 */
export function LevelHeroCard({ readCount }: LevelHeroCardProps) {
  const level = getLevel(readCount);
  const next = getNextLevel(readCount);
  const progress = getLevelProgress(readCount);

  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setSheetOpen(true)}
        className="relative w-full rounded-2xl overflow-hidden p-4 text-left group"
        style={{
          background: `linear-gradient(135deg, ${level.colorDeep} 0%, ${level.color} 160%)`,
          boxShadow: `0 8px 28px ${level.color}40`,
        }}
      >
        <div className="relative flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{
              background: `${level.color}66`,
              animation: "hero-pulse 2.8s ease-in-out infinite",
            }}
          >
            <span className="text-[36px] leading-none">{level.emoji}</span>
          </div>

          <div className="flex-1 min-w-0">
            <p
              className="text-[10px] font-bold uppercase tracking-[1.4px]"
              style={{ color: level.color }}
            >
              Niveau {level.rank}
            </p>
            <p className="text-xl font-bold text-white truncate -tracking-[0.3px]">
              {level.name}
            </p>
            <p className="text-xs text-white/80 line-clamp-2 mt-0.5">
              {level.subtitle}
            </p>
          </div>
        </div>

        <div className="relative mt-4">
          <div className="h-[10px] rounded-full bg-white/20 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${progress}%`,
                background: level.color,
              }}
            />
          </div>

          {next ? (
            <p className="text-xs mt-2 flex items-baseline gap-1 flex-wrap">
              <span className="font-bold text-white">{readCount}</span>
              <span className="text-white/65">/ {next.min} livres —</span>
              <span className="font-semibold" style={{ color: level.color }}>
                {next.emoji} {next.name}
              </span>
            </p>
          ) : (
            <p
              className="text-xs font-bold mt-2"
              style={{ color: level.color }}
            >
              ✨ Niveau max atteint — tu es un mythe
            </p>
          )}
        </div>

        <p className="relative text-[10px] font-semibold text-white/60 mt-2.5 text-right tracking-wider">
          Voir le parcours →
        </p>

        <style>{`
          @keyframes hero-pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.08); }
          }
        `}</style>
      </button>

      <LevelJourneySheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        readCount={readCount}
      />
    </>
  );
}
