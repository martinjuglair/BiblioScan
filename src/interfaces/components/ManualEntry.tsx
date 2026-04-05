import { useState } from "react";
import { ComicBookCreateInput } from "@domain/entities/ComicBook";

interface ManualEntryProps {
  onSubmit: (data: ComicBookCreateInput) => void;
  onCancel: () => void;
}

export function ManualEntry({ onSubmit, onCancel }: ManualEntryProps) {
  const [title, setTitle] = useState("");
  const [authors, setAuthors] = useState("");
  const [publisher, setPublisher] = useState("");
  const [publishedDate, setPublishedDate] = useState("");
  const [seriesName, setSeriesName] = useState("");
  const [volumeNumber, setVolumeNumber] = useState("");
  const [retailPrice, setRetailPrice] = useState("");

  const handleSubmit = () => {
    if (!title.trim()) return;

    const isbn = `MANUAL${Date.now()}`;
    const vol = parseInt(volumeNumber, 10);
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
      seriesNameOverride: seriesName.trim() || undefined,
      volumeNumberOverride: !isNaN(vol) && vol > 0 ? vol : undefined,
    });
  };

  return (
    <div className="card w-full">
      <h2 className="font-bold text-lg mb-4 text-text-primary">Saisie manuelle</h2>

      <div className="flex flex-col gap-3">
        <Field label="Titre *" value={title} onChange={setTitle} placeholder="Spirou et Fantasio" />
        <Field label="Auteur(s)" value={authors} onChange={setAuthors} placeholder="Franquin, Jidéhem" hint="Séparés par des virgules" />
        <Field label="Série" value={seriesName} onChange={setSeriesName} placeholder="Spirou et Fantasio" />

        <div className="flex flex-col min-[320px]:flex-row gap-3">
          <div className="flex-1">
            <Field label="Tome n°" value={volumeNumber} onChange={setVolumeNumber} placeholder="12" inputMode="numeric" />
          </div>
          <div className="flex-1">
            <Field label="Prix neuf (€)" value={retailPrice} onChange={setRetailPrice} placeholder="12.50" inputMode="decimal" />
          </div>
        </div>

        <Field label="Éditeur" value={publisher} onChange={setPublisher} placeholder="Dupuis" />
        <Field label="Date" value={publishedDate} onChange={setPublishedDate} placeholder="1965" />
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
