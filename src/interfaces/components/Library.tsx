import { useEffect, useState, useMemo } from "react";
import { ComicBook } from "@domain/entities/ComicBook";
import { getCategorizedLibrary, createCategory } from "@infrastructure/container";
import { CategorizedLibrary } from "@application/use-cases/GetCategorizedLibrary";
import { CollectionStats } from "./CollectionStats";
import { CreateCategoryModal } from "./CreateCategoryModal";

interface LibraryProps {
  refreshKey: number;
  onSelectCategory: (categoryId: string | null) => void;
}

type SortOption = "name" | "count" | "recent";

export function Library({ refreshKey, onSelectCategory }: LibraryProps) {
  const [data, setData] = useState<CategorizedLibrary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("name");
  const [showCreateModal, setShowCreateModal] = useState(false);

  const allBooks = useMemo<ComicBook[]>(() => {
    if (!data) return [];
    return [...data.categories.flatMap((c) => c.books), ...data.uncategorized];
  }, [data]);

  useEffect(() => {
    setLoading(true);
    getCategorizedLibrary.execute().then((result) => {
      if (result.ok) {
        setData(result.value);
        setError(null);
      } else {
        setError(result.error);
      }
      setLoading(false);
    });
  }, [refreshKey]);

  const handleCreateCategory = async (name: string) => {
    setShowCreateModal(false);
    const result = await createCategory.execute(name);
    if (result.ok) {
      // Refresh
      const refreshResult = await getCategorizedLibrary.execute();
      if (refreshResult.ok) setData(refreshResult.value);
    }
  };

  const filteredCategories = useMemo(() => {
    if (!data) return [];
    let filtered = data.categories;

    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = data.categories.filter(
        (c) =>
          c.category.name.toLowerCase().includes(q) ||
          c.books.some(
            (b) =>
              b.title.toLowerCase().includes(q) ||
              b.authors.some((a) => a.toLowerCase().includes(q)) ||
              b.publisher.toLowerCase().includes(q),
          ),
      );
    }

    const sorted = [...filtered];
    switch (sort) {
      case "name":
        sorted.sort((a, b) => a.category.name.localeCompare(b.category.name, "fr"));
        break;
      case "count":
        sorted.sort((a, b) => b.books.length - a.books.length);
        break;
      case "recent":
        sorted.sort((a, b) => {
          const aMax = a.books.length > 0 ? Math.max(...a.books.map((bk) => bk.addedAt.getTime())) : 0;
          const bMax = b.books.length > 0 ? Math.max(...b.books.map((bk) => bk.addedAt.getTime())) : 0;
          return bMax - aMax;
        });
        break;
    }
    return sorted;
  }, [data, search, sort]);

  const showUncategorized = useMemo(() => {
    if (!data || data.uncategorized.length === 0) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return data.uncategorized.some(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.authors.some((a) => a.toLowerCase().includes(q)) ||
        b.publisher.toLowerCase().includes(q),
    );
  }, [data, search]);

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
    <div className="px-3 sm:px-4 py-4">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Ma Collection</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-11 h-11 rounded-full flex items-center justify-center shadow-card transition-all active:scale-90"
          style={{ background: "linear-gradient(62deg, #FFAF36 0%, #FFC536 100%)" }}
        >
          <svg className="w-5 h-5 text-text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      </div>

      <CollectionStats books={allBooks} categoryCount={data?.categories.length ?? 0} />

      {allBooks.length === 0 ? (
        <div className="text-center py-12 sm:py-16 text-text-tertiary">
          <svg className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <p className="font-medium text-text-secondary">Votre collection est vide.</p>
          <p className="text-sm mt-1">Scannez un livre pour commencer !</p>
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
              <option value="count">Nb livres</option>
              <option value="recent">Récent</option>
            </select>
          </div>

          {filteredCategories.length === 0 && !showUncategorized ? (
            <p className="text-text-tertiary text-sm text-center py-8">
              Aucun résultat pour "{search}"
            </p>
          ) : (
            <>
              <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-3">
                {filteredCategories.map(({ category, books }) => (
                  <button
                    key={category.id}
                    onClick={() => onSelectCategory(category.id)}
                    className="card text-left active:scale-[0.98] transition-all duration-200 hover:shadow-float"
                  >
                    {books.length > 0 && books[0]!.coverUrl ? (
                      <img
                        src={books[0]!.coverUrl}
                        alt={category.name}
                        className="w-full h-28 sm:h-32 object-cover rounded-lg mb-2"
                      />
                    ) : (
                      <div className="w-full h-28 sm:h-32 bg-surface-subtle rounded-lg mb-2 flex items-center justify-center">
                        <svg className="w-10 h-10 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                        </svg>
                      </div>
                    )}
                    <h3 className="font-semibold text-text-primary truncate">{category.name}</h3>
                    <p className="text-text-tertiary text-sm">
                      {books.length} livre{books.length > 1 ? "s" : ""}
                    </p>
                  </button>
                ))}
              </div>

              {/* Non classés */}
              {showUncategorized && data && (
                <div className="mt-4">
                  <button
                    onClick={() => onSelectCategory(null)}
                    className="card w-full text-left active:scale-[0.98] transition-all duration-200 hover:shadow-float flex items-center gap-3"
                  >
                    <div className="w-12 h-12 bg-surface-subtle rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-text-secondary">Non classés</h3>
                      <p className="text-text-tertiary text-sm">
                        {data.uncategorized.length} livre{data.uncategorized.length > 1 ? "s" : ""}
                      </p>
                    </div>
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {showCreateModal && (
        <CreateCategoryModal
          onConfirm={handleCreateCategory}
          onCancel={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}
