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
  // Prefer BnF series override, then title-based detection
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
            className="w-24 h-36 object-cover rounded-lg shadow-md flex-shrink-0"
          />
        ) : (
          <div className="w-24 h-36 bg-bd-dark rounded-lg flex items-center justify-center text-bd-muted text-xs flex-shrink-0">
            Pas de couverture
          </div>
        )}
        <div className="flex flex-col gap-1 min-w-0">
          <h2 className="font-bold text-lg leading-tight truncate">{data.title}</h2>
          <p className="text-bd-muted text-sm truncate">
            {data.authors.join(", ") || "Auteur inconnu"}
          </p>
          <p className="text-bd-muted text-sm">{data.publisher}</p>
          <p className="text-bd-muted text-sm">{data.publishedDate}</p>
        </div>
      </div>

      {/* Series assignment */}
      <div className="mt-4">
        <label className="text-sm text-bd-muted block mb-1">Série détectée</label>
        <input
          type="text"
          value={seriesName}
          onChange={(e) => setSeriesName(e.target.value)}
          className="w-full bg-bd-dark rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-bd-primary text-sm"
        />
        {initialVolume !== null && (
          <p className="text-xs text-bd-muted mt-1">Tome {initialVolume}</p>
        )}
      </div>

      {/* Price input */}
      <div className="mt-3">
        <label className="text-sm text-bd-muted block mb-1">Prix neuf</label>
        <div className="relative">
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={retailPriceInput}
            onChange={(e) => setRetailPriceInput(e.target.value)}
            placeholder="12.50"
            className="w-full bg-bd-dark rounded-lg px-3 py-2 pr-8 text-white outline-none focus:ring-2 focus:ring-bd-primary text-sm"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-bd-muted text-sm">€</span>
        </div>
      </div>

      <div className="flex gap-3 mt-4">
        <button onClick={onCancel} className="flex-1 py-3 rounded-xl bg-bd-dark text-bd-muted font-semibold">
          Annuler
        </button>
        <button onClick={handleConfirm} className="flex-1 btn-primary">
          Ajouter
        </button>
      </div>
    </div>
  );
}
