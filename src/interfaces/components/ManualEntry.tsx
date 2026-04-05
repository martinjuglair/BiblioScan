import { useState, useEffect } from "react";
import { ComicBookCreateInput } from "@domain/entities/ComicBook";
import { Category } from "@domain/entities/Category";
import { categoryRepository } from "@infrastructure/container";

interface ManualEntryProps {
  onSubmit: (data: ComicBookCreateInput) => void;
  onCancel: () => void;
}

export function ManualEntry({ onSubmit, onCancel }: ManualEntryProps) {
  const [title, setTitle] = useState("");
  const [authors, setAuthors] = useState("");
  const [publisher, setPublisher] = useState("");
  const [publishedDate, setPublishedDate] = useState("");
  const [retailPrice, setRetailPrice] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(null);

  useEffect(() => {
    categoryRepository.findAllByUser().then((result) => {
      if (result.ok) setCategories(result.value);
    });
  }, []);

  const handleSubmit = () => {
    if (!title.trim()) return;

    const isbn = `MANUAL${Date.now()}`;
    const price = parseFloat(retailPrice);

    onSubmit({
      isbn,
      title: title.trim(),
      authors: authors
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean),
      publisher: publisher.trim() || "Inconnu",
      publishedDate: publishedDate.trim(),
      coverUrl: null,
      retailPrice: !isNaN(price) && price > 0 ? { amount: price, currency: "EUR" } : null,
      categoryId,
    });
  };

  return (
    <div className="card w-full">
      <h2 className="font-bold text-lg mb-4 text-text-primary">Saisie manuelle</h2>

      <div className="flex flex-col gap-3">
        <Field label="Titre *" value={title} onChange={setTitle} placeholder="Le Petit Prince" />
        <Field label="Auteur(s)" value={authors} onChange={setAuthors} placeholder="Saint-Exupéry" hint="Séparés par des virgules" />

        <div>
          <label className="text-sm text-text-secondary block mb-1 font-medium">Catégorie</label>
          <select
            value={categoryId ?? ""}
            onChange={(e) => setCategoryId(e.target.value || null)}
            className="input-rect w-full"
          >
            <option value="">Non classé</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        <Field label="Prix neuf (€)" value={retailPrice} onChange={setRetailPrice} placeholder="12.50" inputMode="decimal" />
        <Field label="Éditeur" value={publisher} onChange={setPublisher} placeholder="Gallimard" />
        <Field label="Date" value={publishedDate} onChange={setPublishedDate} placeholder="1943" />
      </div>

      <div className="flex gap-3 mt-4">
        <button onClick={onCancel} className="btn-secondary flex-1">
          Annuler
        </button>
        <button
          onClick={handleSubmit}
          disabled={!title.trim()}
          className="btn-primary flex-1"
        >
          Ajouter
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  hint,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  hint?: string;
  inputMode?: "text" | "numeric" | "decimal";
}) {
  return (
    <div>
      <label className="text-sm text-text-secondary block mb-1 font-medium">{label}</label>
      <input
        type="text"
        inputMode={inputMode ?? "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input-rect"
      />
      {hint && <p className="text-xs text-text-muted mt-0.5">{hint}</p>}
    </div>
  );
}
