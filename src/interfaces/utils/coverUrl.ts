/**
 * Cover URL helpers.
 *
 * Google Books covers are stored upgraded to zoom=2 (~300px, ~130kB) so that
 * detail screens look sharp. In list views / cards we only render ~100px of
 * cover — downgrading to zoom=1 (~128px, ~40kB) cuts the transfer by ~3x
 * without visible quality loss.
 */

/**
 * Return a thumbnail-size variant of a Google Books cover URL (zoom=1).
 * Non-Google URLs (Open Library, uploaded covers, …) are returned unchanged.
 */
export function toThumbnailUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (!url.includes("books.google.com/books/content")) return url;
  if (/([&?])zoom=\d/.test(url)) {
    return url.replace(/([&?])zoom=\d/, "$1zoom=1");
  }
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}zoom=1`;
}
