import { useState } from "react";
import { ComicBookCreateInput } from "@domain/entities/ComicBook";
import { bnfSearchService, bookLookup, gcdService, googleBooksSearch } from "@infrastructure/container";
import { BnfSearchResult } from "@infrastructure/services/BnfSearchService";
import { GcdSearchResult } from "@infrastructure/services/GcdService";
import { GoogleBooksSearchResult } from "@infrastructure/services/GoogleBooksService";

interface TitleSearchProps {
  onSelect: (data: ComicBookCreateInput) => void;
  onManualEntry: () => void;
}

/** Unified result type for all search sources */
interface SearchResult {
  source: "google" | "bnf" | "gcd";
  title: string;
  authors: string[];
  publisher: string;
  publishedDate: string;
  isbn: string | null;
  coverUrl: string | null;
  price: { amount: number; currency: string } | null;
  // Original data for selection handling
  googleData?: GoogleBooksSearchResult;
  bnfData?: BnfSearchResult;
  gcdData?: GcdSearchResult;
}

/**
 * Convert ISBN-13 to ISBN-10 (needed for Amazon cover URLs).
 * ISBN-13 starting with 978: drop 978 prefix, take 9 digits, compute check digit.
 */
function isbn13to10(isbn13: string): string | null {
  const clean = isbn13.replace(/[-\s]/g, "");
  if (clean.length !== 13 || !clean.startsWith("978")) return null;
  const base = clean.slice(3, 12); // 9 digits
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(base[i]!, 10) * (10 - i);
  }
  const remainder = (11 - (sum % 11)) % 11;
  const check = remainder === 10 ? "X" : String(remainder);
  return base + check;
}

/** Build Amazon cover URL from ISBN (very reliable for French books) */
function amazonCoverUrl(isbn: string): string | null {
  const clean = isbn.replace(/[-\s]/g, "");
  let isbn10: string | null = null;
  if (clean.length === 13) {
    isbn10 = isbn13to10(clean);
  } else if (clean.length === 10) {
    isbn10 = clean;
  }
  if (!isbn10) return null;
  return `https://images-na.ssl-images-amazon.com/images/P/${isbn10}.01.MZZZZZZZ.jpg`;
}

/** Build a direct Open Library cover URL from ISBN */
function openLibraryCoverUrl(isbn: string): string {
  return `https://covers.openlibrary.org/b/isbn/${isbn.replace(/[-\s]/g, "")}-M.jpg`;
}

/**
 * Try to get a validated cover for an ISBN.
 * Returns the first URL that responds with a real image (not a tiny placeholder).
 * Tries: Amazon → Open Library direct → OL Search API (cover_i)
 */
async function findCoverForIsbn(isbn: string): Promise<string | null> {
  const clean = isbn.replace(/[-\s]/g, "");

  // 1. Amazon — very reliable, fast, supports French ISBNs
  const amzUrl = amazonCoverUrl(clean);
  if (amzUrl) {
    try {
      const res = await fetch(amzUrl, { method: "HEAD" });
      if (res.ok) {
        const cl = res.headers.get("content-length");
        // Amazon returns a tiny 1x1 GIF (~43 bytes) for missing covers
        if (cl && parseInt(cl, 10) > 1000) return amzUrl;
      }
    } catch { /* continue */ }
  }

  // 2. Open Library direct cover URL — validate it's not a 1x1 pixel
  try {
    const olUrl = openLibraryCoverUrl(clean);
    const res = await fetch(olUrl, { method: "HEAD" });
    if (res.ok) {
      const cl = res.headers.get("content-length");
      if (cl && parseInt(cl, 10) > 500) return olUrl;
      // No content-length? Try Range request
      if (!cl) {
        const rangeRes = await fetch(olUrl, { headers: { Range: "bytes=0-3" } });
        if (rangeRes.ok || rangeRes.status === 206) {
          const buf = await rangeRes.arrayBuffer();
          const bytes = new Uint8Array(buf);
          // JPEG starts with FF D8, real cover
          if (bytes[0] === 0xFF && bytes[1] === 0xD8) return olUrl;
        }
      }
    }
  } catch { /* continue */ }

  // 3. OL Search API — cover_i field
  try {
    const res = await fetch(
      `https://openlibrary.org/search.json?isbn=${clean}&fields=cover_i&limit=1`
    );
    if (res.ok) {
      const data = await res.json();
      const coverId = data?.docs?.[0]?.cover_i;
      if (coverId && typeof coverId === "number") {
        return `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`;
      }
    }
  } catch { /* continue */ }

  return null;
}

/**
 * Background enrichment: find real covers for all results that need one.
 */
async function enrichCovers(results: SearchResult[], onUpdate: () => void): Promise<void> {
  const toEnrich = results.filter((r) => r.isbn && !r.coverUrl);
  if (toEnrich.length === 0) return;

  let changed = false;
  const promises = toEnrich.map(async (r) => {
    const cover = await findCoverForIsbn(r.isbn!);
    if (cover) {
      r.coverUrl = cover;
      changed = true;
    }
  });

  await Promise.allSettled(promises);
  if (changed) onUpdate();
}

function googleToUnified(item: GoogleBooksSearchResult): SearchResult {
  return {
    source: "google",
    title: item.title,
    authors: item.authors,
    publisher: item.publisher,
    publishedDate: item.publishedDate,
    isbn: item.isbn,
    coverUrl: item.coverUrl,
    price: item.retailPrice,
    googleData: item,
  };
}

function bnfToUnified(item: BnfSearchResult): SearchResult {
  return {
    source: "bnf",
    title: item.title,
    authors: item.authors,
    publisher: item.publisher,
    publishedDate: item.publishedDate,
    isbn: item.isbn,
    coverUrl: null, // Will be enriched by enrichCovers (Amazon → OL validated → OL search)
    price: item.price,
    bnfData: item,
  };
}

function gcdToUnified(item: GcdSearchResult): SearchResult {
  return {
    source: "gcd",
    title: item.title,
    authors: [],
    publisher: item.publisher,
    publishedDate: item.publicationDate,
    isbn: null,
    coverUrl: item.coverUrl,
    price: null,
    gcdData: item,
  };
}

/** Deduplicate results by ISBN — keeps the one with the best cover */
function deduplicateResults(results: SearchResult[]): SearchResult[] {
  const seen = new Map<string, SearchResult>();
  const output: SearchResult[] = [];

  for (const r of results) {
    if (r.isbn) {
      const cleanIsbn = r.isbn.replace(/[-\s]/g, "");
      const existing = seen.get(cleanIsbn);
      if (existing) {
        // Merge: prefer the one with cover, enrich with price/authors from the other
        if (!existing.coverUrl && r.coverUrl) existing.coverUrl = r.coverUrl;
        if (!existing.price && r.price) existing.price = r.price;
        if (existing.authors.length === 0 && r.authors.length > 0) existing.authors = r.authors;
        continue;
      }
      seen.set(cleanIsbn, r);
    }
    output.push(r);
  }

  return output;
}

export function TitleSearch({ onSelect, onManualEntry }: TitleSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selecting, setSelecting] = useState<number | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);

    // Query all 3 sources in parallel — each with a 8s timeout
    const withTimeout = <T,>(promise: Promise<T>, fallback: T): Promise<T> =>
      Promise.race([promise, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), 8000))]);

    const [googleResult, bnfResult, gcdResult] = await Promise.all([
      withTimeout(googleBooksSearch.searchByTitle(query.trim()), { ok: false as const, error: "timeout" }),
      withTimeout(bnfSearchService.searchByTitle(query.trim()), { ok: false as const, error: "timeout" }),
      withTimeout(gcdService.searchByTitle(query.trim()), { ok: false as const, error: "timeout" }),
    ]);

    const unified: SearchResult[] = [];

    // Google Books first (best covers + fuzzy search)
    if (googleResult.ok) {
      unified.push(...googleResult.value.map(googleToUnified));
    }

    // GCD results (periodicals with covers)
    if (gcdResult.ok) {
      unified.push(...gcdResult.value.map(gcdToUnified));
    }

    // BnF results (old/French books with price data)
    if (bnfResult.ok) {
      unified.push(...bnfResult.value.map(bnfToUnified));
    }

    const deduped = deduplicateResults(unified);

    setResults(deduped);
    setLoading(false);

    // Background enrichment: OL direct covers immediately, then Google covers
    enrichCovers(deduped, () => {
      setResults([...deduped]); // Trigger re-render with updated covers
    });
  };

  const handleSelect = async (result: SearchResult, index: number) => {
    const cleanIsbn = result.isbn?.replace(/[-\s]/g, "") ?? null;

    if (cleanIsbn) {
      // Use the full lookup facade to get enriched metadata + covers
      setSelecting(index);
      const lookupResult = await bookLookup.lookupByISBN(cleanIsbn);
      setSelecting(null);

      if (lookupResult.ok) {
        const data = lookupResult.value;
        // Merge: keep the best cover (search result may have a good one already)
        if (!data.coverUrl && result.coverUrl) {
          data.coverUrl = result.coverUrl;
        }
        // Merge: keep the best price (BnF search results often have price)
        if (!data.retailPrice && result.price) {
          data.retailPrice = result.price;
        }
        // Merge: fill missing authors
        if ((!data.authors || data.authors.length === 0) && result.authors.length > 0) {
          data.authors = result.authors;
        }
        onSelect(data);
        return;
      }
    }

    // Fallback: use search result data directly
    onSelect({
      isbn: cleanIsbn ?? `NOISBN${Date.now()}`,
      title: result.title,
      authors: result.authors,
      publisher: result.publisher,
      publishedDate: result.publishedDate,
      coverUrl: result.coverUrl ?? (cleanIsbn ? amazonCoverUrl(cleanIsbn) : null),
      retailPrice: result.price,
    });
  };

  const sourceLabel = (source: string) => {
    switch (source) {
      case "google": return { text: "Google", bg: "bg-brand-amber/15 text-brand-amber" };
      case "bnf": return { text: "BnF", bg: "bg-brand-teal/10 text-brand-teal" };
      case "gcd": return { text: "GCD", bg: "bg-brand-purple/10 text-brand-purple" };
      default: return { text: source, bg: "bg-surface-subtle text-text-muted" };
    }
  };

  return (
    <div className="w-full">
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Titre, auteur, ou les deux..."
          className="input-field flex-1"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSearch();
          }}
        />
        <button onClick={handleSearch} className="btn-primary px-5" disabled={loading}>
          {loading ? "..." : "Chercher"}
        </button>
      </div>

      {loading && (
        <div className="flex justify-center py-6">
          <div className="animate-spin w-8 h-8 border-2 border-brand-amber border-t-transparent rounded-full" />
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="text-center py-6">
          <p className="text-text-tertiary text-sm mb-3">Aucun résultat trouvé</p>
          <button onClick={onManualEntry} className="btn-primary w-full">
            Saisir manuellement
          </button>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto">
          {results.map((item, i) => {
            const badge = sourceLabel(item.source);
            return (
              <button
                key={`${item.source}-${i}-${item.title}`}
                onClick={() => handleSelect(item, i)}
                disabled={selecting !== null}
                className="card text-left active:scale-[0.98] transition-all duration-200 hover:shadow-float flex gap-3 items-start"
              >
                {item.coverUrl ? (
                  <img
                    src={item.coverUrl}
                    alt=""
                    className="w-12 h-16 object-cover rounded-lg flex-shrink-0 bg-surface-subtle"
                    onError={(e) => {
                      const img = e.currentTarget as HTMLImageElement;
                      // Replace with placeholder on load error or tiny placeholder image
                      const parent = img.parentElement;
                      if (parent) {
                        const div = document.createElement("div");
                        div.className = "w-12 h-16 bg-surface-subtle rounded-lg flex-shrink-0 flex items-center justify-center text-text-muted text-xs";
                        div.textContent = "?";
                        parent.replaceChild(div, img);
                      }
                    }}
                  />
                ) : (
                  <div className="w-12 h-16 bg-surface-subtle rounded-lg flex-shrink-0 flex items-center justify-center text-text-muted text-xs">
                    ?
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-semibold text-sm leading-tight text-text-primary truncate">{item.title}</h3>
                    <span className={`text-[11px] px-1.5 py-0.5 rounded-pill font-medium flex-shrink-0 ${badge.bg}`}>
                      {badge.text}
                    </span>
                  </div>
                  <p className="text-text-tertiary text-xs truncate">
                    {item.authors.length > 0 ? item.authors.join(", ") : item.publisher || "Éditeur inconnu"}
                    {item.authors.length > 0 && item.publisher ? ` · ${item.publisher}` : ""}
                  </p>
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-text-muted text-xs">{item.publishedDate}</p>
                    {item.price && (
                      <p className="text-brand-orange text-xs font-semibold">
                        {item.price.amount.toFixed(2)} €
                      </p>
                    )}
                    {item.source === "bnf" && !item.isbn && (
                      <span className="text-xs bg-status-warning-bg text-status-warning px-2 py-0.5 rounded-pill font-medium">
                        Sans ISBN
                      </span>
                    )}
                  </div>
                  {selecting === i && (
                    <div className="flex items-center gap-1 mt-1">
                      <div className="animate-spin w-3 h-3 border border-brand-amber border-t-transparent rounded-full" />
                      <span className="text-xs text-text-tertiary">Chargement...</span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
          <button onClick={onManualEntry} className="text-text-tertiary text-sm text-center py-3 font-medium">
            Pas trouvé ? Saisir manuellement
          </button>
        </div>
      )}
    </div>
  );
}
