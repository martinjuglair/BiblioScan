import { useState } from "react";
import { ComicBookCreateInput } from "@domain/entities/ComicBook";
import { bnfSearchService, bookLookup, gcdService } from "@infrastructure/container";
import { BnfSearchResult } from "@infrastructure/services/BnfSearchService";
import { GcdSearchResult } from "@infrastructure/services/GcdService";

interface TitleSearchProps {
  onSelect: (data: ComicBookCreateInput) => void;
  onManualEntry: () => void;
}

/** Unified result type for both BnF and GCD results */
interface SearchResult {
  source: "bnf" | "gcd";
  title: string;
  seriesName: string | null;
  issueNumber: string | null;
  authors: string[];
  publisher: string;
  publishedDate: string;
  isbn: string | null;
  coverUrl: string | null;
  price: { amount: number; currency: string } | null;
  // Original data for selection handling
  bnfData?: BnfSearchResult;
  gcdData?: GcdSearchResult;
}

/** Build a direct Open Library cover URL from ISBN (no API call needed) */
function openLibraryCoverUrl(isbn: string): string {
  return `https://covers.openlibrary.org/b/isbn/${isbn.replace(/[-\s]/g, "")}-M.jpg`;
}

function bnfToUnified(item: BnfSearchResult): SearchResult {
  return {
    source: "bnf",
    title: item.title,
    seriesName: item.seriesName,
    issueNumber: item.volumeNumber?.toString() ?? null,
    authors: item.authors,
    publisher: item.publisher,
    publishedDate: item.publishedDate,
    isbn: item.isbn,
    coverUrl: item.isbn ? openLibraryCoverUrl(item.isbn) : null,
    price: item.price,
    bnfData: item,
  };
}

function gcdToUnified(item: GcdSearchResult): SearchResult {
  return {
    source: "gcd",
    title: item.title,
    seriesName: item.seriesName,
    issueNumber: item.issueNumber,
    authors: [],
    publisher: item.publisher,
    publishedDate: item.publicationDate,
    isbn: null,
    coverUrl: item.coverUrl,
    price: null,
    gcdData: item,
  };
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

    // Query BnF and GCD in parallel
    const [bnfResult, gcdResult] = await Promise.all([
      bnfSearchService.searchByTitle(query.trim()),
      gcdService.searchByTitle(query.trim()),
    ]);

    const unified: SearchResult[] = [];

    // GCD results first (periodicals with covers)
    if (gcdResult.ok) {
      unified.push(...gcdResult.value.map(gcdToUnified));
    }

    // Then BnF results
    if (bnfResult.ok) {
      unified.push(...bnfResult.value.map(bnfToUnified));
    }

    setResults(unified);
    setLoading(false);
  };

  const handleSelectBnf = async (item: BnfSearchResult, index: number) => {
    const cleanIsbn = item.isbn?.replace(/[-\s]/g, "") ?? null;

    if (cleanIsbn) {
      setSelecting(index);
      const lookupResult = await bookLookup.lookupByISBN(cleanIsbn);
      setSelecting(null);

      if (lookupResult.ok) {
        const data = lookupResult.value;
        if (item.seriesName) data.seriesNameOverride = item.seriesName;
        if (item.volumeNumber) data.volumeNumberOverride = item.volumeNumber;
        if (!data.retailPrice && item.price) {
          data.retailPrice = item.price;
        }
        // Fallback: if lookup returned no cover, use Open Library thumbnail
        if (!data.coverUrl && cleanIsbn) {
          data.coverUrl = openLibraryCoverUrl(cleanIsbn);
        }
        onSelect(data);
        return;
      }
    }

    // Fallback: no ISBN or lookup failed — use Open Library cover if possible
    onSelect({
      isbn: cleanIsbn ?? `NOISBN${Date.now()}`,
      title: item.title,
      authors: item.authors,
      publisher: item.publisher,
      publishedDate: item.publishedDate,
      coverUrl: cleanIsbn ? openLibraryCoverUrl(cleanIsbn) : null,
      retailPrice: item.price,
      seriesNameOverride: item.seriesName ?? undefined,
      volumeNumberOverride: item.volumeNumber ?? undefined,
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
      seriesNameOverride: item.seriesName,
      volumeNumberOverride: item.issueNumber ? parseInt(item.issueNumber, 10) || undefined : undefined,
    });
  };

  const handleSelect = async (result: SearchResult, index: number) => {
    if (result.source === "bnf" && result.bnfData) {
      await handleSelectBnf(result.bnfData, index);
    } else if (result.source === "gcd" && result.gcdData) {
      handleSelectGcd(result.gcdData);
    }
  };

  return (
    <div className="w-full">
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ex: Journal de Mickey 1, Spirou 42..."
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
          {results.map((item, i) => (
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
                  <span className={`text-[11px] px-1.5 py-0.5 rounded-pill font-medium flex-shrink-0 ${
                    item.source === "gcd"
                      ? "bg-brand-purple/10 text-brand-purple"
                      : "bg-brand-teal/10 text-brand-teal"
                  }`}>
                    {item.source === "gcd" ? "GCD" : "BnF"}
                  </span>
                </div>
                {item.seriesName && (
                  <p className="text-brand-orange text-xs font-medium">
                    {item.seriesName}
                    {item.issueNumber ? ` — n°${item.issueNumber}` : ""}
                  </p>
                )}
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
          ))}
          <button onClick={onManualEntry} className="text-text-tertiary text-sm text-center py-3 font-medium">
            Pas trouvé ? Saisir manuellement
          </button>
        </div>
      )}
    </div>
  );
}
