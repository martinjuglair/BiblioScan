import { BottomSheet } from "./BottomSheet";
import { LEVELS, getLevel, getNextLevel } from "@interfaces/utils/levels";

interface LevelJourneySheetProps {
  isOpen: boolean;
  onClose: () => void;
  readCount: number;
}

/**
 * Vertical list of all levels, with unlocked ones in color and future ones
 * greyed out. The current level is highlighted with a thick colored border.
 */
export function LevelJourneySheet({
  isOpen,
  onClose,
  readCount,
}: LevelJourneySheetProps) {
  const current = getLevel(readCount);
  const next = getNextLevel(readCount);

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Ton parcours de lecteur">
      <div className="px-4 pt-2 pb-6 space-y-2 max-h-[70vh] overflow-y-auto">
        {LEVELS.map((lvl) => {
          const unlocked = readCount >= lvl.min;
          const isCurrent = lvl.rank === current.rank;
          const isNext = next && lvl.rank === next.rank;

          return (
            <div
              key={lvl.rank}
              className={
                "flex items-center gap-3 p-3 rounded-2xl border transition-all " +
                (unlocked ? "" : "bg-surface-subtle border-border")
              }
              style={
                unlocked
                  ? {
                      backgroundColor: `${lvl.color}15`,
                      borderColor: isCurrent ? lvl.color : `${lvl.color}55`,
                      borderWidth: isCurrent ? 2 : 1,
                    }
                  : undefined
              }
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: unlocked ? lvl.color : "#F3F0FF",
                }}
              >
                <span className={"text-2xl " + (unlocked ? "" : "opacity-40")}>
                  {lvl.emoji}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="text-[10px] font-bold uppercase tracking-[1px]"
                    style={{ color: unlocked ? lvl.colorDeep : "#9CA3AF" }}
                  >
                    Niveau {lvl.rank}
                  </span>
                  {isCurrent && (
                    <span
                      className="text-[8px] font-bold text-white px-1.5 py-0.5 rounded tracking-[0.8px]"
                      style={{ backgroundColor: lvl.color }}
                    >
                      ACTUEL
                    </span>
                  )}
                </div>
                <p
                  className={
                    "text-base font-bold mt-0.5 " +
                    (unlocked ? "text-text-primary" : "text-text-muted")
                  }
                >
                  {lvl.name}
                </p>
                <p
                  className={
                    "text-xs mt-0.5 line-clamp-2 " +
                    (unlocked ? "text-text-secondary" : "text-text-muted")
                  }
                >
                  {lvl.subtitle}
                </p>
                {!unlocked && (
                  <p className="text-[11px] font-semibold text-text-tertiary mt-1">
                    Encore {lvl.min - readCount} livre
                    {lvl.min - readCount > 1 ? "s" : ""}
                    {isNext ? " pour débloquer" : ""}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </BottomSheet>
  );
}
