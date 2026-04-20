/**
 * Lightweight accent/case-insensitive search.
 *
 * Goals:
 * - Don't degrade existing behaviour: anything that matches today (substring,
 *   case-insensitive) still matches.
 * - Add tolerance: accented and non-accented forms become interchangeable
 *   ("asterix" finds "Astérix", "francois" finds "François"…).
 * - Support multi-word queries with AND semantics so users can combine
 *   tokens ("asterix obelix" matches a book with both words anywhere in
 *   title/authors/publisher).
 *
 * No fuzzy edit-distance (yet) — the above three wins cover the bulk of
 * missed searches without requiring a new dependency.
 */

/** Lowercase + strip diacritics (NFD decomposition → remove combining marks). */
export function normalize(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Test whether any of the provided `fields` (title, author, etc.) contains
 * every token of the query (case / accent-insensitive).
 *
 * Tokens are any whitespace-separated chunks. Empty query → true (so callers
 * can skip filtering when the input is blank).
 */
export function matchesQuery(query: string, fields: (string | null | undefined)[]): boolean {
  const q = normalize(query).trim();
  if (!q) return true;
  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;

  const haystack = fields.map(normalize).join("\u0000");
  return tokens.every((t) => haystack.includes(t));
}
