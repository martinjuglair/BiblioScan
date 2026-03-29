import { useState } from "react";
import { ComicBookCreateInput } from "@domain/entities/ComicBook";
import { bnfSearchService } from "@infrastructure/container";
import { BnfSearchResult } from "@infrastructure/services/BnfSearchService";

interface TitleSearchProps {
  onSelect: (data: ComicBookCreateInput) => void;
  onManualEntry: () => void;
}

export function TitleSearch({ onSelect, onManualEntry }: TitleSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BnfSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    const result = await bnfSearchService.searchByTitle(query.trim());
    if (result.ok) {
      setResults(result.value);
    }
    setLoading(false);
  };

  const handleSelect = (item: BnfSearchResult) => {
    const isbn = item.isbn?.replace(/[-\s]/g, "") ?? `NOISBN${Date.now()}`;

    onSelect({
      isbn,
      title: item.title,
      authors: item.authors,
      publisher: item.publisher,
      publishedDate: item.publishedDate,
      coverUrl: null,
      retailPrice: item.price,
      seriesNameOverride: item.seriesName ?? undefined,
      volumeNumberOverride: item.volumeNumber ?? undefined,
    });
  };

  return (
    <div className="w-full max-w-sm">
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ex: Spirou recueil 42"
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
          <p className="text-text-tertiary text-sm mb-3">Aucun résultat dans le catalogue BnF</p>
          <button onClick={onManualEntry} className="btn-primary w-full">
            Saisir manuellement
          </button>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto">
          {results.map((item, i) => (
            <button
              key={`${item.isbn ?? i}-${item.title}`}
              onClick={() => handleSelect(item)}
              className="card text-left active:scale-[0.98] transition-all duration-200 hover:shadow-float"
            >
              <h3 className="font-semibold text-sm leading-tight text-text-primary">{item.title}</h3>
              {item.seriesName && (
                <p className="text-brand-orange text-xs font-medium">
                  {item.seriesName}
                  {item.volumeNumber ? ` — Tome ${item.volumeNumber}` : ""}
                </p>
              )}
              <p className="text-text-tertiary text-xs truncate">
                {item.authors.join(", ") || "Auteur inconnu"} · {item.publisher}
              </p>
              <div className="flex justify-between items-center mt-1">
                <p className="text-text-muted text-xs">{item.publishedDate}</p>
                {item.price && (
                  <p className="text-brand-orange text-xs font-semibold">
                    {item.price.amount.toFixed(2)} €
                  </p>
                )}
                {!item.isbn && (
                  <span className="text-xs bg-status-warning-bg text-status-warning px-2 py-0.5 rounded-pill font-medium">
                    Sans ISBN
                  </span>
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
