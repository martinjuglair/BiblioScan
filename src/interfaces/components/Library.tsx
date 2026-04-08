import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { ComicBook } from "@domain/entities/ComicBook";
import { getCategorizedLibrary, createCategory } from "@infrastructure/container";
import { CategorizedLibrary } from "@application/use-cases/GetCategorizedLibrary";
import { CreateCategoryModal } from "./CreateCategoryModal";
import { PullToRefresh } from "./PullToRefresh";
import { BottomSheet } from "./BottomSheet";
import { LibrarySkeleton } from "./Skeleton";
import { useToast } from "./Toast";
import { hapticLight } from "@interfaces/utils/haptics";
import { BookStackIllustration, ScanIllustration } from "./Illustrations";
import { ShareCollection } from "./ShareCollection";
import { LazyImage } from "./LazyImage";
import { ReadBadge } from "./ReadBadge";

interface LibraryProps {
  refreshKey: number;
  onSelectCategory: (categoryId: string | null) => void;
  onSelectBook: (isbn: string) => void;
}

type SortOption = "name" | "count" | "recent";
type ReadFilter = "all" | "unread" | "read";

export function Library({ refreshKey, onSelectCategory, onSelectBook }: LibraryProps) {
  const [data, setData] = useState<CategorizedLibrary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("name");
  const [readFilter, setReadFilter] = useState<ReadFilter>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [globalQuery, setGlobalQuery] = useState("");
  const [showShare, setShowShare] = useState(false);
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

  const handleCreateCategory = async (name: string, emoji: string) => {
    setShowCreateModal(false);
    const result = await createCategory.execute(name, emoji);
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

    // Apply read filter to books within each category
    const withFilteredBooks = data.categories.map((c) => ({
      ...c,
      books: readFilter === "all" ? c.books
        : readFilter === "read" ? c.books.filter((b) => b.isRead)
        : c.books.filter((b) => !b.isRead),
    }));

    // Filter out empty categories when a read filter is active
    let filtered = readFilter === "all"
      ? withFilteredBooks
      : withFilteredBooks.filter((c) => c.books.length > 0);

    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
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
  }, [data, search, sort, readFilter]);

  const filteredUncategorized = useMemo(() => {
    if (!data) return [];
    let books = data.uncategorized;
    if (readFilter === "read") books = books.filter((b) => b.isRead);
    else if (readFilter === "unread") books = books.filter((b) => !b.isRead);
    if (search.trim()) {
      const q = search.toLowerCase();
      books = books.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.authors.some((a) => a.toLowerCase().includes(q)) ||
          b.publisher.toLowerCase().includes(q),
      );
    }
    return books;
  }, [data, search, readFilter]);

  const showUncategorized = filteredUncategorized.length > 0;

  const wishlistBooks = useMemo(() => {
    return allBooks.filter((b) => b.wishlist);
  }, [allBooks]);

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
          {/* Share button */}
          {allBooks.length > 0 && (
            <button
              onClick={() => setShowShare(true)}
              className="w-11 h-11 rounded-full flex items-center justify-center bg-white shadow-card transition-all active:scale-90 border border-border"
            >
              <svg className="w-5 h-5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
              </svg>
            </button>
          )}
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
            style={{ background: "linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)" }}
          >
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Read filter pills */}
      {allBooks.length > 0 && (
        <div className="flex gap-1.5 mb-3">
          {([
            ["all", "Tous", allBooks.length],
            ["unread", "À lire", allBooks.filter((b) => !b.isRead).length],
            ["read", "Lus", allBooks.filter((b) => b.isRead).length],
          ] as [ReadFilter, string, number][]).map(([key, label, count]) => (
            <button
              key={key}
              onClick={() => setReadFilter(key)}
              className={`px-3 py-1.5 rounded-pill text-xs font-semibold transition-all duration-200 ${
                readFilter === key
                  ? "bg-brand-grape text-white shadow-sm"
                  : "bg-surface-subtle text-text-tertiary"
              }`}
            >
              {label}
              <span className={`ml-1 ${readFilter === key ? "text-white/70" : "text-text-muted"}`}>
                {count}
              </span>
            </button>
          ))}
        </div>
      )}

      {allBooks.length === 0 ? (
        <div className="py-8 sm:py-12 text-center">
          <BookStackIllustration className="w-32 h-32 mx-auto mb-4 opacity-90" />
          <h2 className="text-lg font-bold text-text-primary mb-2">Votre bibliothèque est vide</h2>
          <p className="text-text-tertiary text-sm mb-6 max-w-xs mx-auto">
            Commencez par scanner un livre ou rechercher par titre pour l'ajouter à votre collection.
          </p>

          <div className="flex flex-col gap-4 max-w-xs mx-auto text-left">
            <div className="flex items-center gap-3">
              <ScanIllustration className="w-12 h-12 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-text-primary text-sm">Scannez un code-barres</h3>
                <p className="text-xs text-text-tertiary">Pointez la caméra ou tapez l'ISBN</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-brand-grape/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-brand-grape" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-text-primary text-sm">Classez par catégorie</h3>
                <p className="text-xs text-text-tertiary">BD, Romans, Mangas, et plus</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-brand-lemon/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-brand-lemon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-text-primary text-sm">Notez et commentez</h3>
                <p className="text-xs text-text-tertiary">Donnez votre avis sur chaque livre</p>
              </div>
            </div>
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
                    <div className="w-full h-28 sm:h-32 bg-surface-subtle rounded-lg mb-2 flex items-center justify-center">
                      <span className="text-5xl">{category.emoji ?? "\ud83d\udcda"}</span>
                    </div>
                    <h3 className="font-semibold text-text-primary truncate">{category.name}</h3>
                    <p className="text-text-tertiary text-sm">
                      {books.length} livre{books.length > 1 ? "s" : ""}
                    </p>
                  </button>
                ))}
              </div>

              {/* Wishlist */}
              {wishlistBooks.length > 0 && !search.trim() && (
                <div className="mt-4">
                  <h2 className="text-sm font-semibold text-text-tertiary uppercase tracking-wide mb-2 px-1">
                    Liste de souhaits
                  </h2>
                  <div className="flex gap-2 overflow-x-auto pb-2 -mx-3 px-3 scrollbar-hide">
                    {wishlistBooks.map((book) => (
                      <div key={book.isbn} className="flex-shrink-0 w-20">
                        {book.coverUrl ? (
                          <img src={book.coverUrl} alt={book.title} className="w-20 h-28 object-cover rounded-lg shadow-card" loading="lazy" />
                        ) : (
                          <div className="w-20 h-28 bg-surface-subtle rounded-lg flex items-center justify-center text-text-muted text-xs">?</div>
                        )}
                        <p className="text-xs text-text-primary mt-1 truncate font-medium">{book.title}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Uncategorized books shown individually */}
              {showUncategorized && (
                <>
                  <h2 className="text-sm font-semibold text-text-tertiary uppercase tracking-wide mt-4 mb-2 px-1">
                    Sans catégorie
                  </h2>
                  <div className="grid grid-cols-3 min-[360px]:grid-cols-4 gap-2">
                    {filteredUncategorized.map((book) => (
                      <button
                        key={book.isbn}
                        onClick={() => onSelectBook(book.isbn)}
                        className="text-left active:scale-[0.97] transition-all duration-200"
                      >
                        <div className="relative">
                          {book.coverUrl ? (
                            <LazyImage
                              src={book.coverUrl}
                              alt={book.title}
                              className="w-full aspect-[2/3] rounded-lg shadow-card"
                            />
                          ) : (
                            <div className="w-full aspect-[2/3] bg-surface-subtle rounded-lg flex items-center justify-center">
                              <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                              </svg>
                            </div>
                          )}
                          {book.isRead && <ReadBadge />}
                        </div>
                        <p className="text-xs text-text-primary mt-1 truncate font-medium">{book.title}</p>
                      </button>
                    ))}
                  </div>
                </>
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

      {/* Share bottom sheet */}
      <BottomSheet
        isOpen={showShare}
        onClose={() => setShowShare(false)}
        title="Partager & Exporter"
      >
        <ShareCollection
          books={allBooks}
          categoryCount={data?.categories.length ?? 0}
          onClose={() => setShowShare(false)}
        />
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
        className={`inline-block font-bold text-brand-grape transition-transform duration-300 ${
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
