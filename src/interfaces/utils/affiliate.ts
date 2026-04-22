/**
 * Affiliate link helpers.
 *
 * - Fnac via Awin: all buy-on-Fnac links go through awin1.com which credits
 *   our affiliate account when the user converts. We build a search URL on
 *   Fnac (by ISBN preferred, title as fallback) and let Awin wrap it.
 * - Amazon: our existing `tag=shelfy-21` associate tag, applied the same way
 *   across the app so we only have to change it in one place if it evolves.
 */

// ─── Fnac / Awin ────────────────────────────────────────────────
const AWIN_FNAC_MID = "12665"; // Fnac merchant id on Awin
const AWIN_AFFILIATE_ID = "2861899"; // Our Awin affiliate id (account-wide)

/**
 * Build an affiliate link to a Fnac search page.
 * Prefers ISBN (lands on the product page directly when it's a unique match)
 * and falls back to a title search when no ISBN is available.
 */
export function fnacAffiliateUrl(opts: { isbn?: string | null; title?: string }): string {
  const cleanIsbn = opts.isbn?.replace(/[-\s]/g, "") ?? null;
  const query = cleanIsbn && /^\d{10,13}[Xx]?$/.test(cleanIsbn)
    ? cleanIsbn
    : (opts.title ?? "");
  const fnacSearchUrl = `https://www.fnac.com/SearchResult/ResultList.aspx?Search=${encodeURIComponent(query)}`;
  return `https://www.awin1.com/cread.php?awinmid=${AWIN_FNAC_MID}&awinaffid=${AWIN_AFFILIATE_ID}&ued=${encodeURIComponent(fnacSearchUrl)}`;
}

// ─── Amazon ─────────────────────────────────────────────────────
const AMAZON_TAG = "shelfy-21";

export function amazonAffiliateUrl(opts: { isbn?: string | null; title?: string }): string {
  const cleanIsbn = opts.isbn?.replace(/[-\s]/g, "") ?? null;
  const query = cleanIsbn && /^\d{10,13}[Xx]?$/.test(cleanIsbn)
    ? cleanIsbn
    : (opts.title ?? "");
  return `https://www.amazon.fr/s?k=${encodeURIComponent(query)}&tag=${AMAZON_TAG}`;
}
