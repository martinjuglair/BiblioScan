import { useState, useEffect } from "react";
import { ComicBookCreateInput } from "@domain/entities/ComicBook";
import { Category } from "@domain/entities/Category";
import { categoryRepository, createCategory } from "@infrastructure/container";
import { useToast } from "./Toast";

interface BookPreviewProps {
  data: ComicBookCreateInput;
  onConfirm: (data: ComicBookCreateInput) => void;
  onCancel: () => void;
}

const EMOJI_OPTIONS = [
  "\ud83d\udcda", "\ud83d\udcd6", "\ud83d\udcd5", "\ud83d\udcd7", "\ud83d\udcd8", "\ud83d\udcd9",
  "\ud83e\uddd9", "\ud83e\udd16", "\ud83d\ude80", "\ud83c\udf1f", "\u2764\ufe0f", "\ud83d\udd25",
  "\ud83c\udfa8", "\ud83c\udfb5", "\ud83c\udfac", "\ud83c\udf0d", "\ud83c\udf3f", "\ud83d\udc3e",
  "\ud83c\udfc6", "\ud83e\udde9", "\ud83d\udd2e", "\ud83d\udca1", "\ud83c\udf53", "\ud83c\udf08",
];

export function BookPreview({ data, onConfirm, onCancel }: BookPreviewProps) {
  const [retailPriceInput, setRetailPriceInput] = useState(
    data.retailPrice ? data.retailPrice.amount.toFixed(2) : "",
  );
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatEmoji, setNewCatEmoji] = useState("\ud83d\udcda");
  const { toast } = useToast();

  useEffect(() => {
    categoryRepository.findAllByUser().then((result) => {
      if (result.ok) setCategories(result.value);
    });
  }, []);

  const selectedCategory = categories.find((c) => c.id === categoryId);

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    const result = await createCategory.execute(newCatName.trim(), newCatEmoji);
    if (result.ok) {
      const newCat = result.value;
      setCategories((prev) => [...prev, newCat]);
      setCategoryId(newCat.id);
      setShowCreateCategory(false);
      setShowCategoryPicker(false);
      setNewCatName("");
      setNewCatEmoji("\ud83d\udcda");
      toast(`Catégorie "${newCat.name}" créée`, "success");
    }
  };

  const handleConfirm = () => {
    const retailAmount = parseFloat(retailPriceInput);

    onConfirm({
      ...data,
      retailPrice: !isNaN(retailAmount) && retailAmount > 0
        ? { amount: retailAmount, currency: "EUR" }
        : data.retailPrice,
      categoryId,
    });
  };

  return (
    <div className="card w-full">
      <div className="flex gap-3">
        {data.coverUrl ? (
          <img
            src={data.coverUrl}
            alt={data.title}
            className="w-20 h-28 min-[360px]:w-24 min-[360px]:h-36 object-cover rounded-lg shadow-float flex-shrink-0"
          />
        ) : (
          <div className="w-20 h-28 min-[360px]:w-24 min-[360px]:h-36 bg-surface-subtle rounded-lg flex items-center justify-center text-text-muted text-xs flex-shrink-0">
            Pas de couverture
          </div>
        )}
        <div className="flex flex-col gap-1 min-w-0">
          <h2 className="font-bold text-base min-[360px]:text-lg leading-tight line-clamp-2 text-text-primary">{data.title}</h2>
          <p className="text-text-tertiary text-sm truncate">
            {data.authors.join(", ") || "Auteur inconnu"}
          </p>
          <p className="text-text-tertiary text-sm">{data.publisher}</p>
          <p className="text-text-tertiary text-sm">{data.publishedDate}</p>
        </div>
      </div>

      {/* Category button */}
      <div className="mt-4">
        {categoryId && selectedCategory ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 bg-surface-subtle rounded-xl px-3 py-2.5">
              <span className="text-lg">{selectedCategory.emoji ?? "\ud83d\udcda"}</span>
              <span className="text-sm font-medium text-text-primary">{selectedCategory.name}</span>
            </div>
            <button
              onClick={() => { setCategoryId(null); }}
              className="p-2 text-text-muted"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowCategoryPicker(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-border-strong text-brand-grape font-semibold text-sm transition-all active:scale-[0.98] hover:bg-surface-subtle"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
            </svg>
            Ajouter à une catégorie
          </button>
        )}
      </div>

      {/* Price input */}
      <div className="mt-3">
        <label className="text-sm text-text-secondary block mb-1 font-medium">Prix neuf</label>
        <div className="relative">
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={retailPriceInput}
            onChange={(e) => setRetailPriceInput(e.target.value)}
            placeholder="12.50"
            className="input-rect pr-8"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary text-sm">€</span>
        </div>
      </div>

      <button
        onClick={handleConfirm}
        className="mt-4 w-full flex items-center justify-center gap-2.5 rounded-2xl py-4 bg-brand-grape text-white font-bold text-[17px] tracking-[0.2px] active:scale-[0.98] transition-transform"
        style={{ boxShadow: "0 8px 28px rgba(139,92,246,0.35)" }}
      >
        <span className="text-2xl leading-none font-bold">+</span>
        Ajouter à ma collection
      </button>
      <button
        onClick={onCancel}
        className="mt-2 w-full text-center py-3 text-sm font-semibold text-text-tertiary active:text-text-secondary transition-colors"
      >
        Annuler
      </button>

      {/* Category picker overlay */}
      {showCategoryPicker && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40">
          <div className="bg-white rounded-t-2xl w-full max-w-lg p-4 pb-safe animate-[slideUp_0.25s_ease-out]">
            <div className="w-10 h-1 bg-border rounded-full mx-auto mb-3" />
            <h3 className="text-lg font-bold text-text-primary mb-3">Choisir une catégorie</h3>

            {showCreateCategory ? (
              /* Inline create category form */
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-text-secondary block mb-1.5 font-medium">Icône</label>
                  <div className="flex flex-wrap gap-1.5">
                    {EMOJI_OPTIONS.map((e) => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => setNewCatEmoji(e)}
                        className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all ${
                          newCatEmoji === e
                            ? "bg-brand-grape/10 ring-2 ring-brand-grape scale-110"
                            : "bg-surface-subtle"
                        }`}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Nom de la catégorie..."
                  className="input-rect w-full"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === "Enter") handleCreateCategory(); }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCreateCategory(false)}
                    className="btn-secondary flex-1 text-sm"
                  >
                    Retour
                  </button>
                  <button
                    onClick={handleCreateCategory}
                    disabled={!newCatName.trim()}
                    className="btn-primary flex-1 text-sm"
                  >
                    Créer
                  </button>
                </div>
              </div>
            ) : (
              /* Category list */
              <>
                <div className="flex flex-col gap-1.5 max-h-[40vh] overflow-y-auto mb-3">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setCategoryId(cat.id);
                        setShowCategoryPicker(false);
                      }}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-subtle active:bg-surface-subtle transition-colors text-left"
                    >
                      <span className="text-xl">{cat.emoji ?? "\ud83d\udcda"}</span>
                      <span className="font-medium text-text-primary text-sm">{cat.name}</span>
                    </button>
                  ))}
                  {categories.length === 0 && (
                    <p className="text-sm text-text-tertiary text-center py-3">
                      Aucune catégorie pour l'instant
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setShowCreateCategory(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-border text-text-secondary font-semibold text-sm transition-all active:scale-[0.98]"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Créer une catégorie
                </button>
                <button
                  onClick={() => setShowCategoryPicker(false)}
                  className="w-full py-2.5 mt-2 text-text-tertiary text-sm font-medium"
                >
                  Annuler
                </button>
              </>
            )}
          </div>
          <style>{`
            @keyframes slideUp {
              0% { transform: translateY(100%); }
              100% { transform: translateY(0); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
