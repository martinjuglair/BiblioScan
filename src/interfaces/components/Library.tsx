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
  onAddBook?: (mode: "scan" | "search" | "manual") => void;
}

type SortOption = "az" | "recent" | "rating";
type ReadFilter = "all" | "unread" | "read" | "wishlist";

const SORT_LABELS: Record<SortOption, string> = {
  az: "A → Z",
  recent: "Récent",
  rating: "Note",
};

export function Library({ refreshKey, onSelectBook, onAddBook }: LibraryProps) {
  const [data, setData] = useState<CategorizedLibrary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [sort, setSort] = useState<SortOption>("recent");
  const [readFilter, setReadFilter] = useState<ReadFilter>("all");
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  const [showAddSheet, setShowAddSheet] = useState(false);
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

  // Books scoped to selected category
  const categoryBooks = useMemo(() => {
    if (!data) return [];
    if (selectedCategoryId === null) return allBooks;
    if (selectedCategoryId === "__uncategorized__") return data.uncategorized;
    const group = data.categories.find((c) => c.category.id === selectedCategoryId);
    return group ? group.books : [];
  }, [allBooks, data, selectedCategoryId]);

  // Filter counts scoped to selected category
  const filterCounts = useMemo(() => {
    const total = categoryBooks.length;
    const read = categoryBooks.filter((b) => b.isRead).length;
    const unread = total - read;
    const wishlist = categoryBooks.filter((b) => b.wishlist).length;
    return { total, read, unread, wishlist };
  }, [categoryBooks]);

  // Display books: category filter → read filter → sort
  const displayBooks = useMemo(() => {
    let books = [...categoryBooks];

    if (readFilter === "read") books = books.filter((b) => b.isRead);
    else if (readFilter === "unread") books = books.filter((b) => !b.isRead);
    else if (readFilter === "wishlist") books = books.filter((b) => b.wishlist);

    if (sort === "az") {
      books.sort((a, b) => a.title.localeCompare(b.title, "fr"));
    } else if (sort === "recent") {
      books.sort((a, b) => {
        const da = a.addedAt?.getTime() ?? 0;
        const db = b.addedAt?.getTime() ?? 0;
        return db - da;
      });
    } else if (sort === "rating") {
      books.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    }

    return books;
  }, [categoryBooks, readFilter, sort]);

  // Global search
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

  if (loading) {
    return <LibrarySkeleton />;
  }

  if (error) {
    return <p className="text-status-error text-center p-4">{error}</p>;
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="px-3 sm:px-4 py-4" onClick={() => showSortDropdown && setShowSortDropdown(false)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Ma Collection</h1>
          {allBooks.length > 0 && (
            <AnimatedCounter count={allBooks.length} label={allBooks.length > 1 ? "livres" : "livre"} />
          )}
        </div>
        <div className="flex items-center gap-2">
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
          {onAddBook && (
            <button
              onClick={() => setShowAddSheet(true)}
              className="w-11 h-11 rounded-full flex items-center justify-center shadow-card transition-all active:scale-90"
              style={{ background: "linear-gradient(135deg, #8B5CF6 0%, #B065E0 100%)" }}
            >
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {allBooks.length === 0 ? (
        /* ── Empty state ── */
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
          {/* ── Category pills ── */}
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-3 px-3 scrollbar-hide mb-2">
            {/* "Tous" pill */}
            <button
              onClick={() => setSelectedCategoryId(null)}
              className={`flex-shrink-0 px-3.5 py-2 rounded-full text-xs font-semibold transition-all duration-200 border ${
                selectedCategoryId === null
                  ? "bg-brand-grape text-white border-brand-grape shadow-sm"
                  : "bg-white text-text-secondary border-border"
              }`}
            >
              Tous
            </button>

            {data?.categories.map((cat) => (
              <button
                key={cat.category.id}
                onClick={() =>
                  setSelectedCategoryId(
                    selectedCategoryId === cat.category.id ? null : cat.category.id
                  )
                }
                className={`flex-shrink-0 px-3.5 py-2 rounded-full text-xs font-semibold transition-all duration-200 border ${
                  selectedCategoryId === cat.category.id
                    ? "bg-brand-grape text-white border-brand-grape shadow-sm"
                    : "bg-white text-text-secondary border-border"
                }`}
              >
                {cat.category.emoji || "📚"} {cat.category.name}
              </button>
            ))}

            {/* Uncategorized pill */}
            {data && data.uncategorized.length > 0 && (
              <button
                onClick={() =>
                  setSelectedCategoryId(
                    selectedCategoryId === "__uncategorized__" ? null : "__uncategorized__"
                  )
                }
                className={`flex-shrink-0 px-3.5 py-2 rounded-full text-xs font-semibold transition-all duration-200 border ${
                  selectedCategoryId === "__uncategorized__"
                    ? "bg-brand-grape text-white border-brand-grape shadow-sm"
                    : "bg-white text-text-secondary border-border"
                }`}
              >
                📦 Non classés
              </button>
            )}

            {/* Add category button */}
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex-shrink-0 w-9 h-9 rounded-full border-2 border-dashed border-brand-grape text-brand-grape font-semibold text-base flex items-center justify-center transition-all active:scale-90"
            >
              ＋
            </button>
          </div>

          {/* ── Sub-filter row: read filter pills + sort dropdown ── */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex gap-1.5 flex-1 overflow-x-auto scrollbar-hide">
              {([
                { key: "all" as ReadFilter, label: "Tous", count: filterCounts.total },
                { key: "unread" as ReadFilter, label: "À lire", count: filterCounts.unread },
                { key: "read" as ReadFilter, label: "Lus", count: filterCounts.read },
                { key: "wishlist" as ReadFilter, label: "♡ Souhaits", count: filterCounts.wishlist },
              ]).map((f) => (
                <button
                  key={f.key}
                  onClick={() => setReadFilter(f.key)}
                  className={`flex-shrink-0 px-2.5 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-200 border ${
                    readFilter === f.key
                      ? f.key === "wishlist"
                        ? "bg-status-error text-white border-status-error shadow-sm"
                        : "bg-brand-grape text-white border-brand-grape shadow-sm"
                      : "bg-white text-text-tertiary border-border"
                  }`}
                >
                  {f.label} ({f.count})
                </button>
              ))}
            </div>

            {/* Sort dropdown */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white border border-border text-[11px] font-medium text-brand-grape transition-all"
              >
                {SORT_LABELS[sort]}
                <span className="text-[8px]">{showSortDropdown ? "▲" : "▼"}</span>
              </button>
              {showSortDropdown && (
                <div className="absolute top-9 right-0 bg-white rounded-xl shadow-hero py-1 min-w-[100px] z-50">
                  {(["az", "recent", "rating"] as SortOption[]).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => { setSort(opt); setShowSortDropdown(false); }}
                      className={`block w-full text-left px-3.5 py-2.5 text-sm transition-colors ${
                        sort === opt
                          ? "bg-surface-subtle text-brand-grape font-semibold"
                          : "text-text-secondary font-medium hover:bg-surface-subtle"
                      }`}
                    >
                      {SORT_LABELS[opt]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Book grid ── */}
          {displayBooks.length > 0 ? (
            <div className="grid grid-cols-3 min-[360px]:grid-cols-4 gap-2">
              {displayBooks.map((book) => (
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
                    {book.wishlist && (
                      <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-white/90 flex items-center justify-center shadow-sm">
                        <svg className="w-3 h-3 text-status-error" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-text-primary mt-1 truncate font-medium">{book.title}</p>
                  <p className="text-[10px] text-text-tertiary truncate">{book.authors.join(", ")}</p>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-3xl mb-2">🔍</p>
              <p className="text-text-primary font-semibold mb-1">Aucun livre trouvé</p>
              <p className="text-text-tertiary text-sm">Essayez un autre filtre ou une autre catégorie</p>
            </div>
          )}
        </>
      )}

      {/* Add book bottom sheet */}
      {onAddBook && (
        <BottomSheet
          isOpen={showAddSheet}
          onClose={() => setShowAddSheet(false)}
          title="Ajouter un livre"
        >
          <div className="flex flex-col gap-1 pt-1">
            <button
              onClick={() => { setShowAddSheet(false); onAddBook("scan"); }}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-subtle active:bg-surface-subtle transition-colors text-left"
            >
              <div className="w-12 h-12 rounded-[14px] bg-surface-subtle flex items-center justify-center flex-shrink-0">
                <span className="text-[22px]">📷</span>
              </div>
              <div>
                <p className="font-semibold text-[15px] text-text-primary">Scanner un code-barres</p>
                <p className="text-xs text-text-tertiary mt-0.5">Ajoutez un livre en scannant son ISBN</p>
              </div>
            </button>
            <button
              onClick={() => { setShowAddSheet(false); onAddBook("search"); }}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-subtle active:bg-surface-subtle transition-colors text-left"
            >
              <div className="w-12 h-12 rounded-[14px] bg-surface-subtle flex items-center justify-center flex-shrink-0">
                <span className="text-[22px]">🔎</span>
              </div>
              <div>
                <p className="font-semibold text-[15px] text-text-primary">Chercher par titre</p>
                <p className="text-xs text-text-tertiary mt-0.5">Trouvez un livre par nom ou auteur</p>
              </div>
            </button>
            <button
              onClick={() => { setShowAddSheet(false); onAddBook("manual"); }}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-subtle active:bg-surface-subtle transition-colors text-left"
            >
              <div className="w-12 h-12 rounded-[14px] bg-surface-subtle flex items-center justify-center flex-shrink-0">
                <span className="text-[22px]">✏️</span>
              </div>
              <div>
                <p className="font-semibold text-[15px] text-text-primary">Saisie manuelle</p>
                <p className="text-xs text-text-tertiary mt-0.5">Remplissez les infos à la main</p>
              </div>
            </button>
          </div>
        </BottomSheet>
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
                onSelectBook(book.isbn);
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
