import { useState } from "react";
import { ComicBook } from "@domain/entities/ComicBook";

interface ShareCollectionProps {
  books: ComicBook[];
  categoryCount: number;
  onClose: () => void;
}

export function ShareCollection({ books, categoryCount, onClose }: ShareCollectionProps) {
  const [copied, setCopied] = useState(false);

  const totalValue = books.reduce((sum, b) => sum + (b.retailPrice?.amount ?? 0), 0);
  const avgRating = (() => {
    const rated = books.filter((b) => b.rating);
    if (rated.length === 0) return 0;
    return rated.reduce((sum, b) => sum + (b.rating ?? 0), 0) / rated.length;
  })();

  const generateText = () => {
    const lines: string[] = [
      `Ma collection BiblioScan`,
      `${books.length} livres · ${categoryCount} catégories`,
      totalValue > 0 ? `Valeur : ${formatEur(totalValue)}` : "",
      avgRating > 0 ? `Note moyenne : ${avgRating.toFixed(1)}/5` : "",
      "",
      "---",
      "",
      ...books
        .sort((a, b) => a.title.localeCompare(b.title, "fr"))
        .map((b) => {
          let line = `- ${b.title}`;
          if (b.authors.length > 0) line += ` — ${b.authors.join(", ")}`;
          if (b.rating) line += ` ${"★".repeat(b.rating)}${"☆".repeat(5 - b.rating)}`;
          return line;
        }),
    ];
    return lines.filter(Boolean).join("\n");
  };

  const generateCSV = () => {
    const headers = ["ISBN", "Titre", "Auteurs", "Éditeur", "Date", "Prix", "Note", "Commentaire"];
    const rows = books.map((b) => [
      b.isbn,
      `"${b.title.replace(/"/g, '""')}"`,
      `"${b.authors.join(", ").replace(/"/g, '""')}"`,
      `"${b.publisher.replace(/"/g, '""')}"`,
      b.publishedDate,
      b.retailPrice?.amount.toFixed(2) ?? "",
      b.rating?.toString() ?? "",
      `"${(b.comment ?? "").replace(/"/g, '""')}"`,
    ]);
    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  };

  const handleShare = async () => {
    const text = generateText();
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Ma collection BiblioScan",
          text,
        });
      } catch {
        // User cancelled — do nothing
      }
    } else {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleExportCSV = () => {
    const csv = generateCSV();
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `biblioscan-collection-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-3 pb-4">
      <p className="text-sm text-text-tertiary text-center mb-1">
        {books.length} livres dans votre collection
      </p>

      {/* Share text */}
      <button
        onClick={handleShare}
        className="card flex items-center gap-3 active:scale-[0.98] transition-all"
      >
        <div className="w-11 h-11 rounded-xl bg-brand-amber/10 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-brand-amber" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
          </svg>
        </div>
        <div className="text-left">
          <h3 className="font-semibold text-text-primary text-sm">
            {copied ? "Copié !" : "Partager ma collection"}
          </h3>
          <p className="text-xs text-text-tertiary">Liste texte de tous vos livres</p>
        </div>
      </button>

      {/* Export CSV */}
      <button
        onClick={handleExportCSV}
        className="card flex items-center gap-3 active:scale-[0.98] transition-all"
      >
        <div className="w-11 h-11 rounded-xl bg-brand-teal/10 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-brand-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
        </div>
        <div className="text-left">
          <h3 className="font-semibold text-text-primary text-sm">Exporter en CSV</h3>
          <p className="text-xs text-text-tertiary">Excel, Sheets, assurance...</p>
        </div>
      </button>

      <button
        onClick={onClose}
        className="text-text-tertiary text-sm font-medium mt-1"
      >
        Fermer
      </button>
    </div>
  );
}

function formatEur(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}
