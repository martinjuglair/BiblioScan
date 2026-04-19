/**
 * User-scoped localStorage helpers (web).
 *
 * On the web the Shelfy-era storage keys (reading log, earned badges,
 * level rank, goal) were device-scoped instead of user-scoped. On a
 * shared device this caused:
 *   - Badges/levels leaking between accounts
 *   - The "all notifications re-fire after logout/login" bug, when a
 *     short session with user B's empty library overwrote user A's
 *     saved badges with [], and user A's next login re-fired every
 *     badge as "newly earned".
 *
 * Wrapping each key with the current user's Supabase id eliminates
 * both cases. The read helper also one-shot migrates any legacy
 * un-scoped value into the current user's scope so existing accounts
 * don't start from a blank slate.
 */

import { supabase } from "@infrastructure/supabase/client";

// Cache the user id at module level so we don't hit Supabase on every
// read. Supabase auth fires state-change events; we subscribe once and
// keep this in sync.
let cachedUserId: string | null | undefined = undefined;

async function getUserId(): Promise<string | null> {
  if (cachedUserId !== undefined) return cachedUserId;
  try {
    const { data } = await supabase.auth.getUser();
    cachedUserId = data.user?.id ?? null;
  } catch {
    cachedUserId = null;
  }
  return cachedUserId;
}

// Keep the cache fresh across logouts / logins.
supabase.auth.onAuthStateChange((_event, session) => {
  cachedUserId = session?.user?.id ?? null;
});

function scopedKey(base: string, uid: string | null): string {
  return uid ? `${base}:${uid}` : base;
}

/** Migrate legacy un-scoped value into the current user's scope.
 *  Idempotent: no-op once the scoped key has a value. */
function migrateLegacy(base: string, uid: string | null): void {
  if (!uid) return;
  const scoped = scopedKey(base, uid);
  if (localStorage.getItem(scoped) !== null) return;
  const legacy = localStorage.getItem(base);
  if (legacy !== null) {
    localStorage.setItem(scoped, legacy);
    localStorage.removeItem(base);
  }
}

/** Async version — awaits user id. Use for all writes and for reads
 *  where we can live with an async boundary. */
export async function scopedGet(base: string): Promise<string | null> {
  const uid = await getUserId();
  migrateLegacy(base, uid);
  return localStorage.getItem(scopedKey(base, uid));
}

export async function scopedSet(base: string, value: string): Promise<void> {
  const uid = await getUserId();
  localStorage.setItem(scopedKey(base, uid), value);
}

/** Sync variant — uses whatever uid is cached right now. Safe for hot
 *  paths that can't await (e.g. reading inside a render). Will fall back
 *  to the legacy un-scoped key if the cache hasn't warmed up yet. */
export function scopedGetSync(base: string): string | null {
  const uid = cachedUserId ?? null;
  migrateLegacy(base, uid);
  return localStorage.getItem(scopedKey(base, uid));
}

export function scopedSetSync(base: string, value: string): void {
  const uid = cachedUserId ?? null;
  localStorage.setItem(scopedKey(base, uid), value);
}
