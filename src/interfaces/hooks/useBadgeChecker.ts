import { useEffect, useRef } from "react";
import { getCategorizedLibrary } from "@infrastructure/container";
import { getReadingLog, computeStreak } from "@interfaces/components/Stats";
import { emitBadgeEarned } from "@interfaces/utils/badgeEvent";
import { BADGES } from "@interfaces/utils/badges";
import { scopedGet, scopedSet } from "@interfaces/utils/userScopedStorage";

const EARNED_BADGES_KEY = "shelfy-earned-badges";

/**
 * Badge schema version — bump this whenever BADGES list changes
 * (new badges added, existing badges removed/renamed).
 * On version mismatch we do a silent catch-up save so that
 * existing-but-untracked badges don't trigger false "newly earned" banners.
 */
const BADGE_SCHEMA_VERSION = 2;
const SCHEMA_KEY = "shelfy-badge-schema-version";

async function getEarnedBadgeIds(): Promise<string[]> {
  try {
    const raw = await scopedGet(EARNED_BADGES_KEY);
    return JSON.parse(raw ?? "[]");
  } catch {
    return [];
  }
}

async function saveEarnedBadgeIds(ids: string[]): Promise<void> {
  await scopedSet(EARNED_BADGES_KEY, JSON.stringify(ids));
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

      // Guard: empty library + saved badges = loading state, not a wipe.
      // See the mobile version for the full rationale — same bug
      // (re-fire-everything on logout/login) was reproducible on web.
      if (books.length === 0) {
        const existing = await getEarnedBadgeIds();
        if (existing.length > 0) return;
      }

      const log = getReadingLog();
      const streak = computeStreak(log);
      const earned = BADGES.filter((b) => b.check(books, streak));
      const key = earned.map((b) => b.id).join(",");

      // Skip if nothing changed since last check
      if (key === checkedRef.current) return;
      checkedRef.current = key;

      const currentIds = earned.map((b) => b.id);

      // Check badge schema version — silent catch-up on mismatch
      const savedVersion = await scopedGet(SCHEMA_KEY);
      if (savedVersion !== String(BADGE_SCHEMA_VERSION)) {
        await saveEarnedBadgeIds(currentIds);
        await scopedSet(SCHEMA_KEY, String(BADGE_SCHEMA_VERSION));
        return;
      }

      const prevIds = await getEarnedBadgeIds();
      const newlyEarned = earned.filter((b) => !prevIds.includes(b.id));
      await saveEarnedBadgeIds(currentIds);

      // Emit one event per newly earned badge
      for (const badge of newlyEarned) {
        emitBadgeEarned(badge);
      }
    };

    check();

    // Re-check on a long cadence (web has no library event bus like mobile).
    // 60s + visibility-gated — see earlier pre-launch hardening commit.
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
