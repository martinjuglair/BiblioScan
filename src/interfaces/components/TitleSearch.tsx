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

/** Build a direct Open Library cover URL from ISBN */
function openLibraryCoverUrl(isbn: string): string {
  return `https://covers.openlibrary.org/b/isbn/${isbn.replace(/[-\s]/g, "")}-M.jpg`;
}

/** Try to get a cover from OL search API for search results display */
async function fetchOLCoverForResults(results: SearchResult[]): Promise<void> {
  const needCover = results.filter((r) => !r.coverUrl && r.isbn);
  if (needCover.length === 0) return;

  // Batch: fetch cover_i for all ISBNs in one call
  const isbns = needCover.map((r) => r.isbn!.replace(/[-\s]/g, "")).join(",");
  try {
    const res = await fetch(
      `https://openlibrary.org/search.json?isbn=${isbns}&fields=isbn,cover_i&limit=${needCover.length}`
    );
    if (!res.ok) return;
    const data = await res.json();
    const docs = data?.docs as { isbn?: string[]; cover_i?: number }[] | undefined;
    if (!docs) return;

    for (const doc of docs) {
      if (!doc.cover_i || !doc.isbn) continue;
      const coverUrl = `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`;
      for (const r of needCover) {
        const cleanIsbn = r.isbn!.replace(/[-\s]/g, "");
        if (doc.isbn.includes(cleanIsbn) && !r.coverUrl) {
          r.coverUrl = coverUrl;
        }
      }
    }
  } catch {
    // Silently fail
  }
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
    coverUrl: null, // Will be filled by fetchOLCoverForResults
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

    // Try to fill missing covers from OL search API (best effort, async)
    setResults(deduped);
    setLoading(false);

    // Background enrichment for missing covers
    fetchOLCoverForResults(deduped).then(() => {
      setResults([...deduped]); // Trigger re-render with updated covers
    });
  };

  const handleSelectGoogle = async (item: GoogleBooksSearchResult, index: number) => {
    const cleanIsbn = item.isbn?.replace(/[-\s]/g, "") ?? null;

    if (cleanIsbn) {
      // Use the full lookup facade to get enriched data (BnF price, cover fallbacks)
      setSelecting(index);
      const lookupResult = await bookLookup.lookupByISBN(cleanIsbn);
      setSelecting(null);

      if (lookupResult.ok) {
        onSelect(lookupResult.value);
        return;
      }
    }

    // Fallback: build from search result data directly
    onSelect({
      isbn: cleanIsbn ?? `NOISBN${Date.now()}`,
      title: item.title,
      authors: item.authors,
      publisher: item.publisher,
      publishedDate: item.publishedDate,
      coverUrl: item.coverUrl ?? (cleanIsbn ? openLibraryCoverUrl(cleanIsbn) : null),
      retailPrice: item.retailPrice,
    });
  };

  const handleSelectBnf = async (item: BnfSearchResult, index: number) => {
    const cleanIsbn = item.isbn?.replace(/[-\s]/g, "") ?? null;

    if (cleanIsbn) {
      setSelecting(index);
      const lookupResult = await bookLookup.lookupByISBN(cleanIsbn);
      setSelecting(null);

      if (lookupResult.ok) {
        const data = lookupResult.value;
        if (!data.retailPrice && item.price) {
          data.retailPrice = item.price;
        }
        if (!data.coverUrl && cleanIsbn) {
          data.coverUrl = openLibraryCoverUrl(cleanIsbn);
        }
        onSelect(data);
        return;
      }
    }

    onSelect({
      isbn: cleanIsbn ?? `NOISBN${Date.now()}`,
      title: item.title,
      authors: item.authors,
      publisher: item.publisher,
      publishedDate: item.publishedDate,
      coverUrl: cleanIsbn ? openLibraryCoverUrl(cleanIsbn) : null,
      retailPrice: item.price,
    });
  };

  const handleSelectGcd = (item: GcdSearchResult) => {
    onSelect({
      isbn: `NOISBN${Date.now()}`,
      title: item.title,
      authors: [],
      publisher: item.publisher,
      publishedDate: item.publicationDate,
      coverUrl: item.coverUrl,
      retailPrice: null,
    });
  };

  const handleSelect = async (result: SearchResult, index: number) => {
    if (result.source === "google" && result.googleData) {
      await handleSelectGoogle(result.googleData, index);
    } else if (result.source === "bnf" && result.bnfData) {
      await handleSelectBnf(result.bnfData, index);
    } else if (result.source === "gcd" && result.gcdData) {
      handleSelectGcd(result.gcdData);
    }
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
                      (e.currentTarget as HTMLImageElement).style.display = "none";
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
