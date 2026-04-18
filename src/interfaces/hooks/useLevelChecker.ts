import { useEffect, useRef } from "react";
import { getCategorizedLibrary } from "@infrastructure/container";
import { emitLevelUp } from "@interfaces/utils/levelEvent";
import { getLevel, LEVELS } from "@interfaces/utils/levels";

const LEVEL_RANK_KEY = "shelfy-last-level-rank";
const LEVEL_SCHEMA_VERSION = 1;
const SCHEMA_KEY = "shelfy-level-schema-version";

function getLastLevelRank(): number | null {
  const val = localStorage.getItem(LEVEL_RANK_KEY);
  if (val == null) return null;
  const n = parseInt(val, 10);
  return Number.isFinite(n) ? n : null;
}

function saveLastLevelRank(rank: number) {
  localStorage.setItem(LEVEL_RANK_KEY, String(rank));
}

/**
 * Global level checker. Call once in App.tsx (authenticated section) so level-ups
 * are detected whenever the library changes, no matter which view the user is on.
 */
export function useLevelChecker() {
  const checkedRef = useRef<number>(-1);

  useEffect(() => {
    const check = async () => {
      const result = await getCategorizedLibrary.execute();
      if (!result.ok) return;

      const books = [
        ...result.value.categories.flatMap((c) => c.books),
        ...result.value.uncategorized,
      ];
      const readCount = books.filter((b) => b.isRead).length;
      const current = getLevel(readCount);

      if (current.rank === checkedRef.current) return;
      checkedRef.current = current.rank;

      // Silent catch-up on schema mismatch.
      const savedVersion = localStorage.getItem(SCHEMA_KEY);
      if (savedVersion !== String(LEVEL_SCHEMA_VERSION)) {
        saveLastLevelRank(current.rank);
        localStorage.setItem(SCHEMA_KEY, String(LEVEL_SCHEMA_VERSION));
        return;
      }

      const last = getLastLevelRank();
      if (last == null) {
        saveLastLevelRank(current.rank);
        return;
      }

      if (current.rank > last) {
        for (let r = last + 1; r <= current.rank; r++) {
          const lvl = LEVELS.find((l) => l.rank === r);
          if (lvl) emitLevelUp(lvl);
        }
        saveLastLevelRank(current.rank);
      } else if (current.rank < last) {
        saveLastLevelRank(current.rank);
      }
    };

    check();
    // Long cadence + refresh on tab visibility (same approach as
    // useBadgeChecker). See that file for rationale on the 60s bump.
    const interval = setInterval(check, 60000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
}
