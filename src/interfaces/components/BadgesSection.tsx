import { useMemo, useState } from "react";
import type { ComicBook } from "@domain/entities/ComicBook";
import { BADGES, type BadgeDef } from "@interfaces/utils/badges";
import { BottomSheet } from "./BottomSheet";

interface BadgesSectionProps {
  books: ComicBook[];
  streak: { current: number; best: number; total: number };
}

/**
 * Compact badges widget for the Stats screen.
 * Shows a header with the unlocked count, a horizontal emoji row of earned
 * badges, and a single-line summary for locked ones. Tapping opens a sheet
 * with the full list (earned grid + locked list with progress).
 */
export function BadgesSection({ books, streak }: BadgesSectionProps) {
  const earned = useMemo(
    () => BADGES.filter((b) => b.check(books, streak)),
    [books, streak]
  );
  const locked = useMemo(
    () => BADGES.filter((b) => !b.check(books, streak)),
    [books, streak]
  );

  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setSheetOpen(true)}
        className="card w-full text-left mb-3 block"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wide">
            Badges
          </h3>
          <span className="text-xs text-text-tertiary">
            <span className="font-bold text-brand-grape">{earned.length}</span>
            <span> / {BADGES.length}</span>
          </span>
        </div>

        {earned.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide py-0.5">
            {earned.map((badge) => (
              <div
                key={badge.id}
                className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(139,92,246,0.12)" }}
              >
                <span className="text-[22px] leading-none">{badge.emoji}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-text-tertiary leading-snug">
            Lisez des livres, notez-les et revenez pour débloquer vos premiers badges 🎯
          </p>
        )}

        {locked.length > 0 && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
            <span className="text-xs font-medium text-text-secondary">
              {locked.length} badge{locked.length > 1 ? "s" : ""} à débloquer
            </span>
            <span className="text-lg text-text-muted leading-none">›</span>
          </div>
        )}
      </button>

      <BadgesFullSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        earned={earned}
        locked={locked}
        books={books}
        streak={streak}
      />
    </>
  );
}

function BadgesFullSheet({
  isOpen,
  onClose,
  earned,
  locked,
  books,
  streak,
}: {
  isOpen: boolean;
  onClose: () => void;
  earned: BadgeDef[];
  locked: BadgeDef[];
  books: ComicBook[];
  streak: { current: number; best: number; total: number };
}) {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Tes badges">
      <div className="px-4 pt-2 pb-6 space-y-4 max-h-[70vh] overflow-y-auto">
        {earned.length > 0 && (
          <div>
            <h4 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">
              Débloqués ({earned.length})
            </h4>
            <div className="grid grid-cols-4 gap-2">
              {earned.map((badge) => (
                <div key={badge.id} className="text-center">
                  <div
                    className="w-12 h-12 rounded-2xl mx-auto mb-1 flex items-center justify-center"
                    style={{ background: "rgba(139,92,246,0.12)" }}
                  >
                    <span className="text-2xl leading-none">{badge.emoji}</span>
                  </div>
                  <p className="text-[10px] font-semibold text-text-primary leading-tight line-clamp-2">
                    {badge.name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {locked.length > 0 && (
          <div>
            <h4 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">
              À débloquer ({locked.length})
            </h4>
            <div className="space-y-2">
              {locked.map((badge) => {
                const prog = badge.progress?.(books, streak);
                const pct = prog
                  ? Math.min(100, (prog.current / prog.target) * 100)
                  : 0;
                return (
                  <div
                    key={badge.id}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl bg-surface-subtle"
                  >
                    <span className="text-2xl opacity-50">{badge.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-text-secondary">
                        {badge.name}
                      </p>
                      <p className="text-[11px] text-text-muted truncate">
                        {badge.description}
                      </p>
                      {prog && (
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
                            <div
                              className="h-full bg-brand-grape rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-semibold text-text-tertiary min-w-[30px] text-right">
                            {prog.current}/{prog.target}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
