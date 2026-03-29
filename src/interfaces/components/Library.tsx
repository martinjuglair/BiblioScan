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
        <div className="animate-spin w-8 h-8 border-2 border-bd-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return <p className="text-red-400 text-center p-4">{error}</p>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Ma Collection</h1>

      <CollectionStats books={allBooks} series={seriesList} />

      {seriesList.length === 0 ? (
        <div className="text-center py-16 text-bd-muted">
          <p className="text-4xl mb-4">📚</p>
          <p>Votre collection est vide.</p>
          <p className="text-sm mt-1">Scannez une BD pour commencer !</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {seriesList.map((series) => (
            <button
              key={series.name}
              onClick={() => onSelectSeries(series.name)}
              className="card text-left active:scale-[0.98] transition-transform"
            >
              {series.coverUrl ? (
                <img
                  src={series.coverUrl}
                  alt={series.name}
                  className="w-full h-32 object-cover rounded-lg mb-2"
                />
              ) : (
                <div className="w-full h-32 bg-bd-dark rounded-lg mb-2 flex items-center justify-center text-3xl">
                  📖
                </div>
              )}
              <h3 className="font-semibold truncate">{series.name}</h3>
              <p className="text-bd-muted text-sm">
                {series.count} tome{series.count > 1 ? "s" : ""}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
