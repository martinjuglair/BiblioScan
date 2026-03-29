import { useState } from "react";
import { ComicBookCreateInput } from "@domain/entities/ComicBook";
import { SeriesDetector } from "@domain/services/SeriesDetector";

interface BookPreviewProps {
  data: ComicBookCreateInput;
  onConfirm: (data: ComicBookCreateInput) => void;
  onCancel: () => void;
}

export function BookPreview({ data, onConfirm, onCancel }: BookPreviewProps) {
  const detected = SeriesDetector.detect(data.title);
  const initialSeries = data.seriesNameOverride ?? detected.seriesName;
  const initialVolume = data.volumeNumberOverride ?? detected.volumeNumber;

  const [seriesName, setSeriesName] = useState(initialSeries);
  const [retailPriceInput, setRetailPriceInput] = useState(
    data.retailPrice ? data.retailPrice.amount.toFixed(2) : "",
  );
  const handleConfirm = () => {
    const retailAmount = parseFloat(retailPriceInput);

    onConfirm({
      ...data,
      seriesNameOverride: seriesName,
      volumeNumberOverride: initialVolume ?? undefined,
      retailPrice: !isNaN(retailAmount) && retailAmount > 0
        ? { amount: retailAmount, currency: "EUR" }
        : data.retailPrice,
    });
  };

  return (
    <div className="card w-full max-w-sm">
      <div className="flex gap-4">
        {data.coverUrl ? (
          <img
            src={data.coverUrl}
            alt={data.title}
            className="w-24 h-36 object-cover rounded-lg shadow-float flex-shrink-0"
          />
        ) : (
          <div className="w-24 h-36 bg-surface-subtle rounded-lg flex items-center justify-center text-text-muted text-xs flex-shrink-0">
            Pas de couverture
          </div>
        )}
        <div className="flex flex-col gap-1 min-w-0">
          <h2 className="font-bold text-lg leading-tight truncate text-text-primary">{data.title}</h2>
          <p className="text-text-tertiary text-sm truncate">
            {data.authors.join(", ") || "Auteur inconnu"}
          </p>
          <p className="text-text-tertiary text-sm">{data.publisher}</p>
          <p className="text-text-tertiary text-sm">{data.publishedDate}</p>
        </div>
      </div>

      {/* Series assignment */}
      <div className="mt-4">
        <label className="text-sm text-text-secondary block mb-1 font-medium">Série détectée</label>
        <input
          type="text"
          value={seriesName}
          onChange={(e) => setSeriesName(e.target.value)}
          className="input-rect"
        />
        {initialVolume !== null && (
          <p className="text-xs text-brand-orange mt-1 font-medium">Tome {initialVolume}</p>
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

      <div className="flex gap-3 mt-4">
        <button onClick={onCancel} className="btn-secondary flex-1">
          Annuler
        </button>
        <button onClick={handleConfirm} className="btn-primary flex-1">
          Ajouter
        </button>
      </div>
    </div>
  );
}
