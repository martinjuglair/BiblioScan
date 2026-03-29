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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLibrary.execute().then((result) => {
      if (result.ok) {
        const series = result.value.find((s: Series) => s.name === seriesName);
        setBooks(series?.sortedBooks ?? []);
      }
      setLoading(false);
    });
  }, [seriesName, refreshKey]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-8 h-8 border-2 border-bd-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-4">
      <button onClick={onBack} className="text-bd-primary mb-4 flex items-center gap-1">
        ← Retour
      </button>

      <h1 className="text-2xl font-bold mb-1">{seriesName}</h1>
      <p className="text-bd-muted text-sm mb-4">
        {books.length} tome{books.length > 1 ? "s" : ""}
      </p>

      <div className="flex flex-col gap-3">
        {books.map((book) => (
          <button
            key={book.isbn}
            onClick={() => onSelectBook(book.isbn)}
            className="card flex gap-3 text-left active:scale-[0.98] transition-transform"
          >
            {book.coverUrl ? (
              <img
                src={book.coverUrl}
                alt={book.title}
                className="w-16 h-24 object-cover rounded-lg flex-shrink-0"
              />
            ) : (
              <div className="w-16 h-24 bg-bd-dark rounded-lg flex items-center justify-center text-bd-muted text-xs flex-shrink-0">
                ?
              </div>
            )}
            <div className="min-w-0">
              <h3 className="font-semibold truncate">{book.title}</h3>
              {book.volumeNumber !== null && (
                <p className="text-bd-primary text-sm">Tome {book.volumeNumber}</p>
              )}
              <p className="text-bd-muted text-sm truncate">
                {book.authors.join(", ")}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
