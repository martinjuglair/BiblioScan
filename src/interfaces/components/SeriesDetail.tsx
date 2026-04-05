import { useEffect, useState } from "react";
import { ComicBook } from "@domain/entities/ComicBook";
import { Series } from "@domain/entities/Series";
import { getLibrary } from "@infrastructure/container";

interface SeriesDetailProps {
  seriesName: string;
  refreshKey: number;
  onBack: () => void;
  onSelectBook: (isbn: string) => void;
}

export function SeriesDetail({ seriesName, refreshKey, onBack, onSelectBook }: SeriesDetailProps) {
  const [books, setBooks] = useState<ComicBook[]>([]);
  const [missing, setMissing] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLibrary.execute().then((result) => {
      if (result.ok) {
        const series = result.value.find((s: Series) => s.name === seriesName);
        setBooks(series?.sortedBooks ?? []);
        setMissing(series?.missingVolumes ?? []);
      }
      setLoading(false);
    });
  }, [seriesName, refreshKey]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-8 h-8 border-2 border-brand-amber border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="px-3 sm:px-4 py-4">
      <button onClick={onBack} className="text-brand-orange font-medium mb-3 sm:mb-4 flex items-center gap-1 min-h-[44px]">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Retour
      </button>

      <h1 className="text-xl sm:text-2xl font-bold text-text-primary mb-1">{seriesName}</h1>
      <p className="text-text-tertiary text-sm mb-4">
        {books.length} tome{books.length > 1 ? "s" : ""}
      </p>

      {missing.length > 0 && (
        <div className="card bg-status-warning-bg border border-status-warning/20 mb-4">
          <p className="text-status-warning text-sm font-semibold mb-1">
            {missing.length} tome{missing.length > 1 ? "s" : ""} manquant{missing.length > 1 ? "s" : ""}
          </p>
          <p className="text-status-warning/80 text-xs">
            Tomes : {missing.join(", ")}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {books.map((book) => (
          <button
            key={book.isbn}
            onClick={() => onSelectBook(book.isbn)}
            className="card flex gap-3 text-left active:scale-[0.98] transition-all duration-200 hover:shadow-float"
          >
            {book.coverUrl ? (
              <img
                src={book.coverUrl}
                alt={book.title}
                className="w-16 h-24 object-cover rounded-lg flex-shrink-0"
              />
            ) : (
              <div className="w-16 h-24 bg-surface-subtle rounded-lg flex items-center justify-center text-text-muted text-xs flex-shrink-0">
                ?
              </div>
            )}
            <div className="min-w-0">
              <h3 className="font-semibold text-text-primary truncate">{book.title}</h3>
              {book.volumeNumber !== null && (
                <p className="text-brand-orange text-sm font-medium">Tome {book.volumeNumber}</p>
              )}
              <p className="text-text-tertiary text-sm truncate">
                {book.authors.join(", ")}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
