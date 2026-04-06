import { useEffect, useState } from "react";
import { ComicBook } from "@domain/entities/ComicBook";
import { Category } from "@domain/entities/Category";
import { getCategorizedLibrary, updateBook, deleteBook, categoryRepository } from "@infrastructure/container";
import { CoverLightbox } from "./CoverLightbox";
import { useToast } from "./Toast";
import { supabase } from "@infrastructure/supabase/client";

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

  // Lightbox state
  const [showLightbox, setShowLightbox] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    Promise.all([
      getCategorizedLibrary.execute(),
      categoryRepository.findAllByUser(),
    ]).then(([libResult, catsResult]) => {
      if (libResult.ok) {
        const allBooks = [
          ...libResult.value.categories.flatMap((c) => c.books),
          ...libResult.value.uncategorized,
        ];
        const found = allBooks.find((b) => b.isbn === isbn);
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
    setPriceInput(b.retailPrice ? b.retailPrice.amount.toFixed(2) : "");
    setCoverInput(b.coverUrl ?? "");
    setRating(b.rating);
    setComment(b.comment ?? "");
    setCategoryId(b.categoryId);
  };

  const handleSave = async () => {
    if (!book) return;
    setSaving(true);

    const priceNum = priceInput.trim() ? parseFloat(priceInput) : null;

    const result = await updateBook.execute(isbn, {
      retailPriceAmount: priceNum,
      coverUrl: coverInput.trim() || null,
    });

    setSaving(false);
    if (result.ok) {
      setBook(result.value);
      setEditing(false);
      onUpdated();
      toast("Modifications enregistrées", "success");
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
      toast("Catégorie mise à jour", "success");
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
      toast("Avis enregistré", "success");
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !book) return;

    // Validate file
    if (!file.type.startsWith("image/")) {
      toast("Veuillez sélectionner une image", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast("L'image doit faire moins de 5 Mo", "error");
      return;
    }

    setUploadingCover(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `covers/${isbn}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("book-covers")
        .upload(path, file, { upsert: true });

      if (uploadError) {
        toast("Erreur lors de l'upload", "error");
        setUploadingCover(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("book-covers")
        .getPublicUrl(path);

      const coverUrl = urlData.publicUrl;
      const result = await updateBook.execute(isbn, { coverUrl });
      if (result.ok) {
        setBook(result.value);
        onUpdated();
        toast("Couverture mise à jour", "success");
      }
    } catch {
      toast("Erreur lors de l'upload", "error");
    }
    setUploadingCover(false);
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
    <div className="px-3 sm:px-4 py-4">
      <BackButton onClick={onBack} />

      <div className="flex flex-col items-center mb-4 sm:mb-6">
        {book.coverUrl ? (
          <button
            onClick={() => setShowLightbox(true)}
            className="relative group active:scale-95 transition-transform"
          >
            <img
              src={book.coverUrl}
              alt={book.title}
              className="w-28 h-40 min-[360px]:w-36 min-[360px]:h-52 sm:w-40 sm:h-60 object-cover rounded-card shadow-hero mb-3 sm:mb-4"
            />
            <div className="absolute inset-0 mb-3 sm:mb-4 rounded-card bg-black/0 group-active:bg-black/10 transition-colors flex items-center justify-center">
              <svg className="w-8 h-8 text-white opacity-0 group-active:opacity-80 transition-opacity drop-shadow-lg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
              </svg>
            </div>
          </button>
        ) : (
          <div className="w-28 h-40 min-[360px]:w-36 min-[360px]:h-52 sm:w-40 sm:h-60 bg-surface-subtle rounded-card flex items-center justify-center text-text-muted text-sm mb-3 sm:mb-4">
            Pas de couverture
          </div>
        )}
        <h1 className="text-lg sm:text-xl font-bold text-center text-text-primary px-2">{book.title}</h1>

        {/* Cover photo upload */}
        <label className="mt-2 flex items-center gap-1.5 text-sm text-brand-orange font-medium cursor-pointer active:opacity-60 transition-opacity">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {uploadingCover ? "Upload..." : book.coverUrl ? "Changer la couverture" : "Ajouter une photo"}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleCoverUpload}
            className="hidden"
            disabled={uploadingCover}
          />
        </label>
      </div>

      {/* Cover lightbox */}
      {showLightbox && book.coverUrl && (
        <CoverLightbox
          imageUrl={book.coverUrl}
          alt={book.title}
          onClose={() => setShowLightbox(false)}
        />
      )}

      {editing ? (
        <EditForm
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
          <div className="flex gap-0">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(rating === star ? null : star)}
                className="p-1.5 transition-transform active:scale-90"
              >
                <svg
                  className={`w-7 h-7 sm:w-8 sm:h-8 ${star <= (rating ?? 0) ? "text-brand-amber" : "text-border-strong"}`}
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
            rows={2}
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
    <button onClick={onClick} className="text-brand-orange font-medium mb-3 sm:mb-4 flex items-center gap-1 min-h-[44px]">
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
  priceInput,
  setPriceInput,
  coverInput,
  setCoverInput,
  saving,
  onSave,
  onCancel,
}: {
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
