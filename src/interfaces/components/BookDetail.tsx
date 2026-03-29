import { useEffect, useState } from "react";
import { ComicBook } from "@domain/entities/ComicBook";
import { getLibrary, updateBookSeries, deleteBook } from "@infrastructure/container";

interface BookDetailProps {
  isbn: string;
  onBack: () => void;
  onDeleted: () => void;
  onUpdated: () => void;
}

export function BookDetail({ isbn, onBack, onDeleted, onUpdated }: BookDetailProps) {
  const [book, setBook] = useState<ComicBook | null>(null);
  const [editingSeries, setEditingSeries] = useState(false);
  const [seriesInput, setSeriesInput] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLibrary.execute().then((result) => {
      if (result.ok) {
        const found = result.value
          .flatMap((s) => s.books)
          .find((b) => b.isbn === isbn);
        setBook(found ?? null);
        if (found) setSeriesInput(found.seriesName);
      }
      setLoading(false);
    });
  }, [isbn]);

  const handleUpdateSeries = async () => {
    if (!seriesInput.trim()) return;
    const result = await updateBookSeries.execute(isbn, seriesInput.trim());
    if (result.ok) {
      setBook(result.value);
      setEditingSeries(false);
      onUpdated();
    }
  };

  const handleDelete = async () => {
    if (!confirm("Supprimer cette BD de votre collection ?")) return;
    const result = await deleteBook.execute(isbn);
    if (result.ok) onDeleted();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-8 h-8 border-2 border-bd-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!book) {
    return (
      <div className="p-4">
        <button onClick={onBack} className="text-bd-primary mb-4">← Retour</button>
        <p className="text-red-400">BD introuvable</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <button onClick={onBack} className="text-bd-primary mb-4 flex items-center gap-1">
        ← Retour
      </button>

      <div className="flex flex-col items-center mb-6">
        {book.coverUrl ? (
          <img
            src={book.coverUrl}
            alt={book.title}
            className="w-40 h-60 object-cover rounded-2xl shadow-xl mb-4"
          />
        ) : (
          <div className="w-40 h-60 bg-bd-card rounded-2xl flex items-center justify-center text-bd-muted mb-4">
            Pas de couverture
          </div>
        )}
        <h1 className="text-xl font-bold text-center">{book.title}</h1>
      </div>

      <div className="card space-y-3">
        <InfoRow label="ISBN" value={book.isbn} />
        <InfoRow label="Auteur(s)" value={book.authors.join(", ") || "Inconnu"} />
        <InfoRow label="Éditeur" value={book.publisher} />
        <InfoRow label="Date de parution" value={book.publishedDate || "Inconnue"} />
        {book.volumeNumber !== null && (
          <InfoRow label="Tome" value={`${book.volumeNumber}`} />
        )}
        {book.retailPrice && (
          <InfoRow label="Prix neuf" value={book.retailPrice.format()} />
        )}
        {/* Editable series */}
        <div>
          <p className="text-bd-muted text-xs uppercase tracking-wide mb-1">Série</p>
          {editingSeries ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={seriesInput}
                onChange={(e) => setSeriesInput(e.target.value)}
                className="flex-1 bg-bd-dark rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-bd-primary"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleUpdateSeries();
                  if (e.key === "Escape") setEditingSeries(false);
                }}
              />
              <button onClick={handleUpdateSeries} className="text-bd-primary text-sm font-semibold">
                OK
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditingSeries(true)}
              className="text-white text-sm flex items-center gap-2"
            >
              {book.seriesName}
              <span className="text-bd-muted text-xs">✎</span>
            </button>
          )}
        </div>
      </div>

      <button
        onClick={handleDelete}
        className="w-full mt-6 py-3 rounded-xl bg-red-500/10 text-red-400 font-semibold"
      >
        Supprimer cette BD
      </button>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-bd-muted text-xs uppercase tracking-wide">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}
