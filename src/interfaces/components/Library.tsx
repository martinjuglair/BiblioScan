import { useEffect, useState, useMemo } from "react";
import { ComicBook } from "@domain/entities/ComicBook";
import { Series } from "@domain/entities/Series";
import { getLibrary } from "@infrastructure/container";
import { CollectionStats } from "./CollectionStats";

interface LibraryProps {
  refreshKey: number;
  onSelectSeries: (seriesName: string) => void;
}

export function Library({ refreshKey, onSelectSeries }: LibraryProps) {
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        <div className="grid grid-cols-2 gap-3">
          {seriesList.map((series) => (
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
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
