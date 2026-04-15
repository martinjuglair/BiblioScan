import { useEffect, useRef } from "react";
import { getCategorizedLibrary } from "@infrastructure/container";
import { getReadingLog, computeStreak } from "@interfaces/components/Stats";
import { emitBadgeEarned } from "@interfaces/utils/badgeEvent";
import { BADGES } from "@interfaces/utils/badges";

const EARNED_BADGES_KEY = "shelfy-earned-badges";

function getEarnedBadgeIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(EARNED_BADGES_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveEarnedBadgeIds(ids: string[]) {
  localStorage.setItem(EARNED_BADGES_KEY, JSON.stringify(ids));
}

/**
 * Global badge checker hook.
 * Call this once in App.tsx (authenticated section) so badge detection runs
 * whenever the library changes, regardless of which view the user is on.
 */
export function useBadgeChecker() {
  const checkedRef = useRef<string>("");

  useEffect(() => {
    const check = async () => {
      const result = await getCategorizedLibrary.execute();
      if (!result.ok) return;

      const books = [
        ...result.value.categories.flatMap((c) => c.books),
        ...result.value.uncategorized,
      ];

      const log = getReadingLog();
      const streak = computeStreak(log);
      const earned = BADGES.filter((b) => b.check(books, streak));
      const key = earned.map((b) => b.id).join(",");

      // Skip if nothing changed since last check
      if (key === checkedRef.current) return;
      checkedRef.current = key;

      const prevIds = getEarnedBadgeIds();
      const currentIds = earned.map((b) => b.id);
      const newlyEarned = earned.filter((b) => !prevIds.includes(b.id));
      saveEarnedBadgeIds(currentIds);

      // Emit one event per newly earned badge
      for (const badge of newlyEarned) {
        emitBadgeEarned(badge);
      }
    };

    check();

    // Re-check periodically (web doesn't have a library event bus like mobile)
    // We use a simple interval as a fallback
    const interval = setInterval(check, 10000);
    return () => clearInterval(interval);
  }, []);
}
