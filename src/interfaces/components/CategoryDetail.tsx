import { useEffect, useState } from "react";
import { ComicBook } from "@domain/entities/ComicBook";
import { getCategorizedLibrary, deleteCategory } from "@infrastructure/container";

interface CategoryDetailProps {
  categoryId: string | null;
  refreshKey: number;
  onBack: () => void;
  onSelectBook: (isbn: string) => void;
}

export function CategoryDetail({ categoryId, refreshKey, onBack, onSelectBook }: CategoryDetailProps) {
  const [books, setBooks] = useState<ComicBook[]>([]);
  const [categoryName, setCategoryName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCategorizedLibrary.execute().then((result) => {
      if (result.ok) {
        if (categoryId === null) {
          setCategoryName("Non classés");
          setBooks(result.value.uncategorized);
        } else {
          const cat = result.value.categories.find((c) => c.category.id === categoryId);
          setCategoryName(cat?.category.name ?? "Catégorie");
          setBooks(cat?.books ?? []);
        }
      }
      setLoading(false);
    });
  }, [categoryId, refreshKey]);

  const handleDelete = async () => {
    if (!categoryId) return;
    if (!confirm(`Supprimer la catégorie "${categoryName}" ? Les livres seront déplacés dans "Non classés".`)) return;
    const result = await deleteCategory.execute(categoryId);
    if (result.ok) onBack();
  };

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

      <h1 className="text-xl sm:text-2xl font-bold text-text-primary mb-1">{categoryName}</h1>
      <p className="text-text-tertiary text-sm mb-4">
        {books.length} livre{books.length > 1 ? "s" : ""}
      </p>

      {books.length === 0 ? (
        <div className="text-center py-12 text-text-tertiary">
          <p className="text-sm">Aucun livre dans cette catégorie.</p>
          <p className="text-xs mt-1">Assignez des livres depuis leur page de détail.</p>
        </div>
      ) : (
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
                {book.seriesName && book.seriesName !== "Sans série" && (
                  <p className="text-brand-orange text-sm font-medium truncate">
                    {book.seriesName}
                    {book.volumeNumber !== null && ` - T.${book.volumeNumber}`}
                  </p>
                )}
                <p className="text-text-tertiary text-sm truncate">
                  {book.authors.join(", ")}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {categoryId !== null && (
        <button
          onClick={handleDelete}
          className="w-full mt-6 py-3 rounded-pill bg-status-error-bg text-status-error font-semibold transition-all duration-200 active:scale-95"
        >
          Supprimer cette catégorie
        </button>
      )}
    </div>
  );
}
