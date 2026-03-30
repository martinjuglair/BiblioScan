import { useEffect, useState, useMemo } from "react";
import { ComicBook } from "@domain/entities/ComicBook";
import { Series } from "@domain/entities/Series";
import { getLibrary } from "@infrastructure/container";
import { CollectionStats } from "./CollectionStats";

interface LibraryProps {
  refreshKey: number;
  onSelectSeries: (seriesName: string) => void;
}

type SortOption = "name" | "count" | "recent";

export function Library({ refreshKey, onSelectSeries }: LibraryProps) {
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("name");

  const allBooks = useMemo<ComicBook[]>(
    () => seriesList.flatMap((s) => s.books),
    [seriesList],
  );

  useEffect(() => {
    setLoading(true);
    getLibrary.execute().then((result) => {
      if (result.ok) {
        setSeriesList(result.value);
        setError(null);
      } else {
        setError(result.error);
      }
      setLoading(false);
    });
  }, [refreshKey]);

  const filteredAndSorted = useMemo(() => {
    let filtered = seriesList;

    // Search filter — matches series name or any book title/author within the series
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = seriesList.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.books.some(
            (b) =>
              b.title.toLowerCase().includes(q) ||
              b.authors.some((a) => a.toLowerCase().includes(q)) ||
              b.publisher.toLowerCase().includes(q),
          ),
      );
    }

    // Sort
    const sorted = [...filtered];
    switch (sort) {
      case "name":
        sorted.sort((a, b) => a.name.localeCompare(b.name, "fr"));
        break;
      case "count":
        sorted.sort((a, b) => b.count - a.count);
        break;
      case "recent":
        sorted.sort((a, b) => {
          const aMax = Math.max(...a.books.map((bk) => bk.addedAt.getTime()));
          const bMax = Math.max(...b.books.map((bk) => bk.addedAt.getTime()));
          return bMax - aMax;
        });
        break;
    }

    return sorted;
  }, [seriesList, search, sort]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-8 h-8 border-2 border-brand-amber border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return <p className="text-status-error text-center p-4">{error}</p>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-text-primary mb-4">Ma Collection</h1>

      <CollectionStats books={allBooks} series={seriesList} />

      {seriesList.length === 0 ? (
        <div className="text-center py-16 text-text-tertiary">
          <svg className="w-16 h-16 mx-auto mb-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <p className="font-medium text-text-secondary">Votre collection est vide.</p>
          <p className="text-sm mt-1">Scannez une BD pour commencer !</p>
        </div>
      ) : (
        <>
          {/* Search + Sort bar */}
          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher..."
                className="input-field pl-9 w-full"
              />
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="input-field w-auto text-sm"
            >
              <option value="name">A-Z</option>
              <option value="count">Nb tomes</option>
              <option value="recent">Récent</option>
            </select>
          </div>

          {filteredAndSorted.length === 0 ? (
            <p className="text-text-tertiary text-sm text-center py-8">
              Aucun résultat pour "{search}"
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredAndSorted.map((series) => (
                <button
                  key={series.name}
                  onClick={() => onSelectSeries(series.name)}
                  className="card text-left active:scale-[0.98] transition-all duration-200 hover:shadow-float"
                >
                  {series.coverUrl ? (
                    <img
                      src={series.coverUrl}
                      alt={series.name}
                      className="w-full h-32 object-cover rounded-lg mb-2"
                    />
                  ) : (
                    <div className="w-full h-32 bg-surface-subtle rounded-lg mb-2 flex items-center justify-center">
                      <svg className="w-10 h-10 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                  )}
                  <h3 className="font-semibold text-text-primary truncate">{series.name}</h3>
                  <p className="text-text-tertiary text-sm">
                    {series.count} tome{series.count > 1 ? "s" : ""}
                  </p>
                  {series.missingVolumes.length > 0 && (
                    <p className="text-status-warning text-xs mt-0.5 truncate">
                      Manque : {series.missingVolumes.slice(0, 5).join(", ")}
                      {series.missingVolumes.length > 5 ? "..." : ""}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
