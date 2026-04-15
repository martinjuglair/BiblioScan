import { supabase } from "../supabase/client";

/** TTL for title/author search results (7 days) */
export const TTL_SEARCH_MS = 7 * 24 * 60 * 60 * 1000;

/** TTL for ISBN lookups and volume data (30 days — very stable) */
export const TTL_ISBN_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Shared Supabase cache for Google Books API responses.
 * Dramatically reduces API quota usage — identical queries across
 * all users hit the cache instead of Google.
 */
export class GoogleBooksCacheService {
  /** Returns cached response if fresh enough, null otherwise */
  async get(key: string, ttlMs: number): Promise<unknown | null> {
    try {
      const { data } = await supabase
        .from("google_books_cache")
        .select("response, fetched_at")
        .eq("cache_key", key)
        .maybeSingle();

      if (!data) return null;

      const age = Date.now() - new Date(data.fetched_at).getTime();
      if (age > ttlMs) return null;

      return data.response;
    } catch {
      return null; // Cache miss on error — just hit the API
    }
  }

  /** Store response in cache (fire-and-forget, never throws) */
  async set(key: string, response: unknown): Promise<void> {
    try {
      await supabase.from("google_books_cache").upsert(
        {
          cache_key: key,
          response,
          fetched_at: new Date().toISOString(),
        },
        { onConflict: "cache_key" },
      );
    } catch {
      // Silent fail — cache write failure shouldn't break the app
    }
  }

  /** Normalize a cache key: lowercase, trim, collapse whitespace */
  static normalizeKey(prefix: string, query: string): string {
    return `${prefix}:${query.toLowerCase().trim().replace(/\s+/g, " ")}`;
  }
}
