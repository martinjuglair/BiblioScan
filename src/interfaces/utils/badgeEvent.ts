import type { BadgeDef } from "./badges";

type BadgeListener = (badge: BadgeDef) => void;
const listeners = new Set<BadgeListener>();

export function onBadgeEarned(cb: BadgeListener): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function emitBadgeEarned(badge: BadgeDef): void {
  listeners.forEach((cb) => cb(badge));
}
