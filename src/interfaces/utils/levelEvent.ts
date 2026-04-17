import type { LevelDef } from "./levels";

type LevelListener = (level: LevelDef) => void;
const listeners = new Set<LevelListener>();

export function onLevelUp(cb: LevelListener): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function emitLevelUp(level: LevelDef): void {
  listeners.forEach((cb) => cb(level));
}
