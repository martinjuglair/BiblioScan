import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { ComicBook } from "@domain/entities/ComicBook";
import { getCategorizedLibrary, createCategory } from "@infrastructure/container";
import { CategorizedLibrary } from "@application/use-cases/GetCategorizedLibrary";
import { CollectionStats } from "./CollectionStats";
import { CreateCategoryModal } from "./CreateCategoryModal";
import { PullToRefresh } from "./PullToRefresh";
import { BottomSheet } from "./BottomSheet";
import { LibrarySkeleton } from "./Skeleton";
import { useToast } from "./Toast";
import { hapticLight } from "@interfaces/utils/haptics";

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
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [globalQuery, setGlobalQuery] = useState("");
  const { toast } = useToast();

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
      hapticLight();
      toast(`Catégorie "${name}" créée`, "success");
      const refreshResult = await getCategorizedLibrary.execute();
      if (refreshResult.ok) setData(refreshResult.value);
    }
  };

  const handleRefresh = useCallback(async () => {
    const result = await getCategorizedLibrary.execute();
    if (result.ok) {
      setData(result.value);
      setError(null);
    }
  }, []);

  // Global search: filter all books across categories
  const globalSearchResults = useMemo(() => {
    if (!globalQuery.trim() || !data) return [];
    const q = globalQuery.toLowerCase();
    return allBooks.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.authors.some((a) => a.toLowerCase().includes(q)) ||
        b.publisher.toLowerCase().includes(q) ||
        b.isbn.includes(q),
    );
  }, [globalQuery, allBooks, data]);

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
    return <LibrarySkeleton />;
  }

  if (error) {
    return <p className="text-status-error text-center p-4">{error}</p>;
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="px-3 sm:px-4 py-4">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Ma Collection</h1>
          {allBooks.length > 0 && (
            <AnimatedCounter count={allBooks.length} label={allBooks.length > 1 ? "livres" : "livre"} />
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Global search button */}
          {allBooks.length > 0 && (
            <button
              onClick={() => setShowGlobalSearch(true)}
              className="w-11 h-11 rounded-full flex items-center justify-center bg-white shadow-card transition-all active:scale-90 border border-border"
            >
              <svg className="w-5 h-5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          )}
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
      </div>

      <CollectionStats books={allBooks} categoryCount={data?.categories.length ?? 0} />

      {allBooks.length === 0 ? (
        <div className="py-8 sm:py-12">
          {/* Step 1 */}
          <div className="flex items-start gap-4 mb-6">
            <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(62deg, #FFAF36 0%, #FFC536 100%)" }}>
              <span className="text-lg font-bold text-white">1</span>
            </div>
            <div>
              <h3 className="font-bold text-text-primary">Scannez un code-barres</h3>
              <p className="text-sm text-text-tertiary mt-0.5">Pointez la caméra sur le code-barres du livre, ou tapez l'ISBN manuellement.</p>
            </div>
          </div>
          {/* Step 2 */}
          <div className="flex items-start gap-4 mb-6">
            <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(62deg, #FFAF36 0%, #FFC536 100%)" }}>
              <span className="text-lg font-bold text-white">2</span>
            </div>
            <div>
              <h3 className="font-bold text-text-primary">Classez par catégorie</h3>
              <p className="text-sm text-text-tertiary mt-0.5">Créez vos catégories (BD, Romans, Mangas…) et rangez chaque livre dedans.</p>
            </div>
          </div>
          {/* Step 3 */}
          <div className="flex items-start gap-4 mb-8">
            <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(62deg, #FFAF36 0%, #FFC536 100%)" }}>
              <span className="text-lg font-bold text-white">3</span>
            </div>
            <div>
              <h3 className="font-bold text-text-primary">Notez et commentez</h3>
              <p className="text-sm text-text-tertiary mt-0.5">Donnez une note en étoiles et ajoutez votre avis sur chaque livre.</p>
            </div>
          </div>
          {/* CTA */}
          <div className="text-center">
            <p className="text-text-muted text-sm mb-3">Votre collection est vide pour le moment.</p>
            <p className="text-text-secondary font-medium">Scannez votre premier livre pour commencer !</p>
          </div>
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

      {/* Global search bottom sheet */}
      <BottomSheet
        isOpen={showGlobalSearch}
        onClose={() => { setShowGlobalSearch(false); setGlobalQuery(""); }}
        title="Rechercher un livre"
      >
        <input
          type="text"
          value={globalQuery}
          onChange={(e) => setGlobalQuery(e.target.value)}
          placeholder="Titre, auteur, ISBN..."
          className="input-field mb-3"
          autoFocus
        />
        {globalQuery.trim() && globalSearchResults.length === 0 && (
          <p className="text-text-tertiary text-sm text-center py-4">Aucun résultat</p>
        )}
        <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto">
          {globalSearchResults.map((book) => (
            <button
              key={book.isbn}
              onClick={() => {
                setShowGlobalSearch(false);
                setGlobalQuery("");
                // Find which category this book belongs to
                const cat = data?.categories.find((c) => c.books.some((b) => b.isbn === book.isbn));
                onSelectCategory(cat?.category.id ?? null);
                // Small delay to let category load, then navigate to book
                setTimeout(() => {
                  // This navigates via the parent
                }, 100);
              }}
              className="flex gap-3 items-center text-left p-2 rounded-xl hover:bg-surface-subtle active:bg-surface-subtle transition-colors"
            >
              {book.coverUrl ? (
                <img src={book.coverUrl} alt="" className="w-10 h-14 object-cover rounded-lg flex-shrink-0" />
              ) : (
                <div className="w-10 h-14 bg-surface-subtle rounded-lg flex-shrink-0 flex items-center justify-center text-text-muted text-xs">?</div>
              )}
              <div className="min-w-0">
                <p className="font-semibold text-sm text-text-primary truncate">{book.title}</p>
                <p className="text-xs text-text-tertiary truncate">{book.authors.join(", ") || book.publisher}</p>
              </div>
            </button>
          ))}
        </div>
      </BottomSheet>
    </div>
    </PullToRefresh>
  );
}

/** Animated book counter — pops when value changes */
function AnimatedCounter({ count, label }: { count: number; label: string }) {
  const prevCount = useRef(count);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (count !== prevCount.current) {
      prevCount.current = count;
      setAnimate(true);
      const timer = setTimeout(() => setAnimate(false), 400);
      return () => clearTimeout(timer);
    }
  }, [count]);

  return (
    <p className="text-text-tertiary text-sm mt-0.5">
      <span
        className={`inline-block font-bold text-brand-orange transition-transform duration-300 ${
          animate ? "scale-125" : "scale-100"
        }`}
        style={{ transformOrigin: "left center" }}
      >
        {count}
      </span>{" "}
      {label}
    </p>
  );
}
