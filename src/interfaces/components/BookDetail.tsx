import { useEffect, useState } from "react";
import { ComicBook } from "@domain/entities/ComicBook";
import { Category } from "@domain/entities/Category";
import { getLibrary, updateBook, deleteBook, categoryRepository } from "@infrastructure/container";

interface BookDetailProps {
  isbn: string;
  onBack: () => void;
  onDeleted: () => void;
  onUpdated: () => void;
}

export function BookDetail({ isbn, onBack, onDeleted, onUpdated }: BookDetailProps) {
  const [book, setBook] = useState<ComicBook | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [seriesInput, setSeriesInput] = useState("");
  const [volumeInput, setVolumeInput] = useState("");
  const [priceInput, setPriceInput] = useState("");
  const [coverInput, setCoverInput] = useState("");

  // Rating/comment state
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [savingReview, setSavingReview] = useState(false);

  // Category state
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [savingCategory, setSavingCategory] = useState(false);

  useEffect(() => {
    Promise.all([
      getLibrary.execute(),
      categoryRepository.findAllByUser(),
    ]).then(([booksResult, catsResult]) => {
      if (booksResult.ok) {
        const found = booksResult.value
          .flatMap((s) => s.books)
          .find((b) => b.isbn === isbn);
        setBook(found ?? null);
        if (found) initForm(found);
      }
      if (catsResult.ok) {
        setCategories(catsResult.value);
      }
      setLoading(false);
    });
  }, [isbn]);

  const initForm = (b: ComicBook) => {
    setSeriesInput(b.seriesName);
    setVolumeInput(b.volumeNumber !== null ? String(b.volumeNumber) : "");
    setPriceInput(b.retailPrice ? b.retailPrice.amount.toFixed(2) : "");
    setCoverInput(b.coverUrl ?? "");
    setRating(b.rating);
    setComment(b.comment ?? "");
    setCategoryId(b.categoryId);
  };

  const handleSave = async () => {
    if (!book) return;
    setSaving(true);

    const volumeNum = volumeInput.trim() ? parseInt(volumeInput, 10) : null;
    const priceNum = priceInput.trim() ? parseFloat(priceInput) : null;

    const result = await updateBook.execute(isbn, {
      seriesName: seriesInput.trim() || undefined,
      volumeNumber: volumeNum,
      retailPriceAmount: priceNum,
      coverUrl: coverInput.trim() || null,
    });

    setSaving(false);
    if (result.ok) {
      setBook(result.value);
      setEditing(false);
      onUpdated();
    }
  };

  const handleCategoryChange = async (newCategoryId: string | null) => {
    setCategoryId(newCategoryId);
    setSavingCategory(true);
    const result = await updateBook.execute(isbn, { categoryId: newCategoryId });
    setSavingCategory(false);
    if (result.ok) {
      setBook(result.value);
      onUpdated();
    }
  };

  const handleSaveReview = async () => {
    if (!book) return;
    setSavingReview(true);
    const result = await updateBook.execute(isbn, {
      rating,
      comment: comment.trim() || null,
    });
    setSavingReview(false);
    if (result.ok) {
      setBook(result.value);
      onUpdated();
    }
  };

  const handleDelete = async () => {
    if (!confirm("Supprimer ce livre de votre collection ?")) return;
    const result = await deleteBook.execute(isbn);
    if (result.ok) onDeleted();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-8 h-8 border-2 border-brand-amber border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!book) {
    return (
      <div className="p-4">
        <BackButton onClick={onBack} />
        <p className="text-status-error">Livre introuvable</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <BackButton onClick={onBack} />

      <div className="flex flex-col items-center mb-6">
        {book.coverUrl ? (
          <img
            src={book.coverUrl}
            alt={book.title}
            className="w-32 h-48 min-[360px]:w-40 min-[360px]:h-60 object-cover rounded-card shadow-hero mb-4"
          />
        ) : (
          <div className="w-32 h-48 min-[360px]:w-40 min-[360px]:h-60 bg-surface-subtle rounded-card flex items-center justify-center text-text-muted mb-4">
            Pas de couverture
          </div>
        )}
        <h1 className="text-xl font-bold text-center text-text-primary">{book.title}</h1>
      </div>

      {editing ? (
        <EditForm
          seriesInput={seriesInput}
          setSeriesInput={setSeriesInput}
          volumeInput={volumeInput}
          setVolumeInput={setVolumeInput}
          priceInput={priceInput}
          setPriceInput={setPriceInput}
          coverInput={coverInput}
          setCoverInput={setCoverInput}
          saving={saving}
          onSave={handleSave}
          onCancel={() => {
            initForm(book);
            setEditing(false);
          }}
        />
      ) : (
        <div className="card space-y-3">
          <InfoRow label="ISBN" value={book.isbn} />
          <InfoRow label="Auteur(s)" value={book.authors.join(", ") || "Inconnu"} />
          <InfoRow label="Éditeur" value={book.publisher} />
          <InfoRow label="Date de parution" value={book.publishedDate || "Inconnue"} />
          <InfoRow label="Série" value={book.seriesName} />
          {book.volumeNumber !== null && (
            <InfoRow label="Tome" value={`${book.volumeNumber}`} />
          )}
          <InfoRow
            label="Prix neuf"
            value={book.retailPrice ? book.retailPrice.format() : "Non renseigné"}
          />

          {/* Category selector */}
          <div>
            <p className="text-text-tertiary text-xs uppercase tracking-wide mb-1">Catégorie</p>
            <select
              value={categoryId ?? ""}
              onChange={(e) => handleCategoryChange(e.target.value || null)}
              disabled={savingCategory}
              className="input-rect w-full"
            >
              <option value="">Non classé</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setEditing(true)}
            className="w-full py-2.5 rounded-pill bg-brand-amber/10 text-brand-amber font-semibold transition-all duration-200 active:scale-95 flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Modifier
          </button>
        </div>
      )}

      {/* Rating & Comment */}
      {!editing && (
        <div className="card mt-4 space-y-3">
          <h3 className="text-sm font-semibold text-text-tertiary uppercase tracking-wide">Mon avis</h3>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(rating === star ? null : star)}
                className="p-0.5 transition-transform active:scale-90"
              >
                <svg
                  className={`w-8 h-8 ${star <= (rating ?? 0) ? "text-brand-amber" : "text-border-strong"}`}
                  fill={star <= (rating ?? 0) ? "currentColor" : "none"}
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Votre commentaire..."
            rows={3}
            className="input-rect w-full resize-none"
          />
          <button
            onClick={handleSaveReview}
            disabled={savingReview}
            className="w-full py-2.5 rounded-pill bg-brand-amber/10 text-brand-amber font-semibold transition-all duration-200 active:scale-95"
          >
            {savingReview ? "..." : "Enregistrer mon avis"}
          </button>
        </div>
      )}

      <button
        onClick={handleDelete}
        className="w-full mt-6 py-3 rounded-pill bg-status-error-bg text-status-error font-semibold transition-all duration-200 active:scale-95"
      >
        Supprimer ce livre
      </button>
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-brand-orange font-medium mb-4 flex items-center gap-1">
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      Retour
    </button>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-text-tertiary text-xs uppercase tracking-wide">{label}</p>
      <p className="text-sm text-text-primary">{value}</p>
    </div>
  );
}

function EditForm({
  seriesInput,
  setSeriesInput,
  volumeInput,
  setVolumeInput,
  priceInput,
  setPriceInput,
  coverInput,
  setCoverInput,
  saving,
  onSave,
  onCancel,
}: {
  seriesInput: string;
  setSeriesInput: (v: string) => void;
  volumeInput: string;
  setVolumeInput: (v: string) => void;
  priceInput: string;
  setPriceInput: (v: string) => void;
  coverInput: string;
  setCoverInput: (v: string) => void;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="card space-y-3">
      <div>
        <label className="text-text-tertiary text-xs uppercase tracking-wide block mb-1">Série</label>
        <input
          type="text"
          value={seriesInput}
          onChange={(e) => setSeriesInput(e.target.value)}
          className="input-rect w-full"
        />
      </div>
      <div>
        <label className="text-text-tertiary text-xs uppercase tracking-wide block mb-1">Tome</label>
        <input
          type="number"
          inputMode="numeric"
          value={volumeInput}
          onChange={(e) => setVolumeInput(e.target.value)}
          placeholder="Ex: 5"
          className="input-rect w-full"
        />
      </div>
      <div>
        <label className="text-text-tertiary text-xs uppercase tracking-wide block mb-1">Prix neuf (€)</label>
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          value={priceInput}
          onChange={(e) => setPriceInput(e.target.value)}
          placeholder="12.50"
          className="input-rect w-full"
        />
      </div>
      <div>
        <label className="text-text-tertiary text-xs uppercase tracking-wide block mb-1">URL couverture</label>
        <input
          type="url"
          value={coverInput}
          onChange={(e) => setCoverInput(e.target.value)}
          placeholder="https://..."
          className="input-rect w-full"
        />
      </div>
      <div className="flex gap-3 pt-1">
        <button onClick={onCancel} className="btn-secondary flex-1" disabled={saving}>
          Annuler
        </button>
        <button onClick={onSave} className="btn-primary flex-1" disabled={saving}>
          {saving ? "..." : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}
