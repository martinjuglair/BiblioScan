import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { ComicBook } from "@domain/entities/ComicBook";
import { getCategorizedLibrary, deleteCategory, deleteBook, updateBook, categoryRepository } from "@infrastructure/container";
import { Category } from "@domain/entities/Category";
import { PullToRefresh } from "./PullToRefresh";
import { BottomSheet } from "./BottomSheet";
import { CategoryDetailSkeleton } from "./Skeleton";
import { useToast } from "./Toast";
import { hapticMedium, hapticError } from "@interfaces/utils/haptics";
import { LazyImage } from "./LazyImage";

type BookSortOption = "title" | "added" | "rating";

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
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const { toast } = useToast();

  // Swipe state
  const [swipedIsbn, setSwipedIsbn] = useState<string | null>(null);
  const [swipeDelta, setSwipeDelta] = useState(0);

  // Sort
  const [bookSort, setBookSort] = useState<BookSortOption>("title");

  // Bottom sheet for move category
  const [moveBookIsbn, setMoveBookIsbn] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const [result, catsResult] = await Promise.all([
      getCategorizedLibrary.execute(),
      categoryRepository.findAllByUser(),
    ]);
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
    if (catsResult.ok) {
      setAllCategories(catsResult.value);
    }
    setLoading(false);
  }, [categoryId]);

  useEffect(() => {
    loadData();
  }, [categoryId, refreshKey, loadData]);

  const sortedBooks = useMemo(() => {
    const sorted = [...books];
    switch (bookSort) {
      case "title":
        sorted.sort((a, b) => a.title.localeCompare(b.title, "fr"));
        break;
      case "added":
        sorted.sort((a, b) => b.addedAt.getTime() - a.addedAt.getTime());
        break;
      case "rating":
        sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
        break;
    }
    return sorted;
  }, [books, bookSort]);

  const handleRefresh = async () => {
    await loadData();
  };

  const handleDeleteBook = async (isbn: string) => {
    hapticError();
    const book = books.find((b) => b.isbn === isbn);
    const result = await deleteBook.execute(isbn);
    if (result.ok) {
      setBooks((prev) => prev.filter((b) => b.isbn !== isbn));
      toast(`"${book?.title}" supprimé`, "success");
    }
    setSwipedIsbn(null);
    setSwipeDelta(0);
  };

  const handleMoveBook = async (isbn: string, newCategoryId: string | null) => {
    hapticMedium();
    const book = books.find((b) => b.isbn === isbn);
    const result = await updateBook.execute(isbn, { categoryId: newCategoryId });
    if (result.ok) {
      setBooks((prev) => prev.filter((b) => b.isbn !== isbn));
      const targetName = newCategoryId
        ? allCategories.find((c) => c.id === newCategoryId)?.name ?? "catégorie"
        : "Non classés";
      toast(`"${book?.title}" déplacé vers ${targetName}`, "success");
    }
    setMoveBookIsbn(null);
  };

  const handleDeleteCategory = async () => {
    if (!categoryId) return;
    if (!confirm(`Supprimer la catégorie "${categoryName}" ? Les livres seront déplacés dans "Non classés".`)) return;
    const result = await deleteCategory.execute(categoryId);
    if (result.ok) {
      toast(`Catégorie "${categoryName}" supprimée`, "success");
      onBack();
    }
  };

  if (loading) {
    return <CategoryDetailSkeleton />;
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="px-3 sm:px-4 py-4">
        <button onClick={onBack} className="text-brand-orange font-medium mb-3 sm:mb-4 flex items-center gap-1 min-h-[44px]">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Retour
        </button>

        <h1 className="text-xl sm:text-2xl font-bold text-text-primary mb-1">{categoryName}</h1>
        <p className="text-text-tertiary text-sm mb-3">
          {books.length} livre{books.length > 1 ? "s" : ""}
          {books.length > 0 && <span className="text-text-muted ml-2">· Glissez pour agir</span>}
        </p>

        {/* Sort bar */}
        {books.length > 1 && (
          <div className="flex gap-1.5 mb-3">
            {([
              ["title", "A-Z"],
              ["added", "Récent"],
              ["rating", "Note"],
            ] as [BookSortOption, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setBookSort(key)}
                className={`px-3 py-1.5 rounded-pill text-xs font-semibold transition-all duration-200 ${
                  bookSort === key
                    ? "bg-brand-amber text-text-primary shadow-sm"
                    : "bg-surface-subtle text-text-tertiary"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {books.length === 0 ? (
          <div className="text-center py-12 text-text-tertiary">
            <p className="text-sm">Aucun livre dans cette catégorie.</p>
            <p className="text-xs mt-1">Assignez des livres depuis leur page de détail.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {sortedBooks.map((book) => (
              <SwipeableBookCard
                key={book.isbn}
                book={book}
                isActive={swipedIsbn === book.isbn}
                delta={swipedIsbn === book.isbn ? swipeDelta : 0}
                onSwipeStart={() => {
                  setSwipedIsbn(book.isbn);
                  setSwipeDelta(0);
                }}
                onDrag={(d) => setSwipeDelta(d)}
                onRelease={() => {
                  if (swipeDelta < -80) {
                    handleDeleteBook(book.isbn);
                  } else if (swipeDelta > 80) {
                    setMoveBookIsbn(book.isbn);
                    setSwipedIsbn(null);
                    setSwipeDelta(0);
                  } else {
                    setSwipedIsbn(null);
                    setSwipeDelta(0);
                  }
                }}
                onTap={() => onSelectBook(book.isbn)}
              />
            ))}
          </div>
        )}

        {categoryId !== null && (
          <button
            onClick={handleDeleteCategory}
            className="w-full mt-6 py-3 rounded-pill bg-status-error-bg text-status-error font-semibold transition-all duration-200 active:scale-95"
          >
            Supprimer cette catégorie
          </button>
        )}
      </div>

      {/* Move category bottom sheet */}
      <BottomSheet
        isOpen={moveBookIsbn !== null}
        onClose={() => setMoveBookIsbn(null)}
        title="Déplacer vers..."
      >
        <div className="flex flex-col gap-2 pb-4">
          <button
            onClick={() => moveBookIsbn && handleMoveBook(moveBookIsbn, null)}
            className={`text-left px-4 py-3 rounded-xl transition-colors active:bg-surface-subtle ${
              categoryId === null ? "bg-brand-amber/10 font-semibold text-brand-amber" : "hover:bg-surface-subtle"
            }`}
          >
            Non classés
          </button>
          {allCategories
            .filter((c) => c.id !== categoryId)
            .map((cat) => (
              <button
                key={cat.id}
                onClick={() => moveBookIsbn && handleMoveBook(moveBookIsbn, cat.id)}
                className="text-left px-4 py-3 rounded-xl hover:bg-surface-subtle transition-colors active:bg-surface-subtle"
              >
                {cat.name}
              </button>
            ))}
        </div>
      </BottomSheet>
    </PullToRefresh>
  );
}

/** Swipeable book card with delete (left) and move (right) actions */
function SwipeableBookCard({
  book,
  isActive,
  delta,
  onSwipeStart,
  onDrag,
  onRelease,
  onTap,
}: {
  book: ComicBook;
  isActive: boolean;
  delta: number;
  onSwipeStart: () => void;
  onDrag: (delta: number) => void;
  onRelease: () => void;
  onTap: () => void;
}) {
  const startX = useRef(0);
  const startY = useRef(0);
  const dirLocked = useRef<"h" | "v" | null>(null);
  const hasMoved = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0]!.clientX;
    startY.current = e.touches[0]!.clientY;
    dirLocked.current = null;
    hasMoved.current = false;
    onSwipeStart();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0]!.clientX - startX.current;
    const dy = e.touches[0]!.clientY - startY.current;

    if (!dirLocked.current && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      dirLocked.current = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
    }

    if (dirLocked.current === "h") {
      hasMoved.current = true;
      onDrag(dx);
    }
  };

  const handleTouchEnd = () => {
    if (hasMoved.current) {
      onRelease();
    } else {
      onTap();
    }
  };

  // Clamp delta for visual display
  const clampedDelta = Math.max(-120, Math.min(120, delta));
  const showDelete = clampedDelta < -30;
  const showMove = clampedDelta > 30;

  return (
    <div className="relative overflow-hidden rounded-card">
      {/* Background actions */}
      <div className="absolute inset-0 flex">
        {/* Right action (swipe right = move) */}
        <div
          className="flex items-center justify-start pl-4 bg-brand-teal text-white flex-1"
          style={{ opacity: showMove ? 1 : 0 }}
        >
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <span className="text-sm font-semibold">Déplacer</span>
        </div>
        {/* Left action (swipe left = delete) */}
        <div
          className="flex items-center justify-end pr-4 bg-status-error text-white flex-1"
          style={{ opacity: showDelete ? 1 : 0 }}
        >
          <span className="text-sm font-semibold">Supprimer</span>
          <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>
      </div>

      {/* Foreground card */}
      <div
        className="card flex gap-3 text-left relative bg-white"
        style={{
          transform: `translateX(${clampedDelta}px)`,
          transition: isActive ? "none" : "transform 300ms ease-out",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {book.coverUrl ? (
          <LazyImage
            src={book.coverUrl}
            alt={book.title}
            className="w-14 h-20 rounded-lg flex-shrink-0"
          />
        ) : (
          <div className="w-14 h-20 bg-surface-subtle rounded-lg flex items-center justify-center text-text-muted text-xs flex-shrink-0">
            ?
          </div>
        )}
        <div className="min-w-0 flex-1 flex flex-col justify-center">
          <h3 className="font-semibold text-text-primary truncate">{book.title}</h3>
          <p className="text-text-tertiary text-sm truncate">
            {book.authors.join(", ") || "Auteur inconnu"}
          </p>
          {book.rating && (
            <div className="flex items-center gap-0.5 mt-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <svg
                  key={s}
                  className={`w-3.5 h-3.5 ${s <= book.rating! ? "text-brand-amber" : "text-border"}`}
                  fill={s <= book.rating! ? "currentColor" : "none"}
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
              ))}
            </div>
          )}
        </div>
        <svg className="w-4 h-4 text-text-muted self-center flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  );
}
