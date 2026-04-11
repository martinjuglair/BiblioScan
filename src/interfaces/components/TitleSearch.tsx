import { useState } from "react";
import { ComicBookCreateInput } from "@domain/entities/ComicBook";
import { bookLookup, unifiedSearch } from "@infrastructure/container";
import { UnifiedSearchResult } from "@infrastructure/services/UnifiedSearchService";

interface TitleSearchProps {
  onSelect: (data: ComicBookCreateInput) => void;
  onManualEntry: () => void;
}

function amazonCoverUrl(isbn: string): string | null {
  const clean = isbn.replace(/[-\s]/g, "");
  if (clean.length === 13 && clean.startsWith("978")) {
    const base = clean.slice(3, 12);
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(base[i]!, 10) * (10 - i);
    const remainder = (11 - (sum % 11)) % 11;
    const check = remainder === 10 ? "X" : String(remainder);
    const isbn10 = base + check;
    return `https://images-na.ssl-images-amazon.com/images/P/${isbn10}.01.MZZZZZZZ.jpg`;
  }
  if (clean.length === 10) {
    return `https://images-na.ssl-images-amazon.com/images/P/${clean}.01.MZZZZZZZ.jpg`;
  }
  return null;
}

export function TitleSearch({ onSelect, onManualEntry }: TitleSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UnifiedSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selecting, setSelecting] = useState<number | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    setResults([]);

    const result = await unifiedSearch.search(query.trim(), (updated) => {
      setResults([...updated]);
    });

    if (result.ok) {
      setResults(result.value);
    }
    setLoading(false);
  };

  const handleSelect = async (result: UnifiedSearchResult, index: number) => {
    const cleanIsbn = result.isbn?.replace(/[-\s]/g, "") ?? null;

    if (cleanIsbn) {
      setSelecting(index);
      const lookupResult = await bookLookup.lookupByISBN(cleanIsbn);
      setSelecting(null);

      if (lookupResult.ok) {
        const data = lookupResult.value;
        if (!data.coverUrl && result.coverUrl) data.coverUrl = result.coverUrl;
        if (!data.retailPrice && result.price) data.retailPrice = result.price;
        if ((!data.authors || data.authors.length === 0) && result.authors.length > 0) {
          data.authors = result.authors;
        }
        onSelect(data);
        return;
      }
    }

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
      case "google": return { text: "Google", bg: "bg-brand-grape/15 text-brand-grape" };
      case "bnf": return { text: "BnF", bg: "bg-brand-mint/10 text-brand-mint" };
      case "openlib": return { text: "OpenLib", bg: "bg-brand-sky/10 text-brand-sky" };
      case "gcd": return { text: "GCD", bg: "bg-brand-sky/10 text-brand-sky" };
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
          placeholder="Titre, auteur, ISBN..."
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
          <div className="animate-spin w-8 h-8 border-2 border-brand-grape border-t-transparent rounded-full" />
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
                      <p className="text-brand-grape text-xs font-semibold">
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
                      <div className="animate-spin w-3 h-3 border border-brand-grape border-t-transparent rounded-full" />
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
