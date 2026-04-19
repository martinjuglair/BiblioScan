/**
 * Shared state between BadgeBanner and LevelUpBanner (web).
 * See mobile/src/ui/bannerCoordinator.ts for the full rationale — same
 * idea, mirrored for the web codebase.
 */

let levelVisible = false;
const listeners = new Set<(visible: boolean) => void>();

export function setLevelBannerVisible(visible: boolean): void {
  if (levelVisible === visible) return;
  levelVisible = visible;
  listeners.forEach((cb) => cb(visible));
}

export function isLevelBannerVisible(): boolean {
  return levelVisible;
}

export function subscribeLevelBannerVisibility(
  cb: (visible: boolean) => void,
): () => void {
  listeners.add(cb);
  cb(levelVisible);
  return () => {
    listeners.delete(cb);
  };
}
