import { useState } from "react";
import { ComicBook } from "@domain/entities/ComicBook";
import { jsPDF } from "jspdf";

interface ShareCollectionProps {
  books: ComicBook[];
  categoryCount: number;
  onClose: () => void;
}

export function ShareCollection({ books, categoryCount, onClose }: ShareCollectionProps) {
  const [copied, setCopied] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const totalValue = books.reduce((sum, b) => sum + (b.retailPrice?.amount ?? 0), 0);
  const avgRating = (() => {
    const rated = books.filter((b) => b.rating);
    if (rated.length === 0) return 0;
    return rated.reduce((sum, b) => sum + (b.rating ?? 0), 0) / rated.length;
  })();

  const generateText = () => {
    const lines: string[] = [
      `Ma collection BiblioScan`,
      `${books.length} livres \u00b7 ${categoryCount} cat\u00e9gories`,
      totalValue > 0 ? `Valeur : ${formatEur(totalValue)}` : "",
      avgRating > 0 ? `Note moyenne : ${avgRating.toFixed(1)}/5` : "",
      "",
      "---",
      "",
      ...books
        .sort((a, b) => a.title.localeCompare(b.title, "fr"))
        .map((b) => {
          let line = `- ${b.title}`;
          if (b.authors.length > 0) line += ` \u2014 ${b.authors.join(", ")}`;
          if (b.rating) line += ` ${"\u2605".repeat(b.rating)}${"\u2606".repeat(5 - b.rating)}`;
          return line;
        }),
    ];
    return lines.filter(Boolean).join("\n");
  };

  const generateCSV = () => {
    const headers = ["ISBN", "Titre", "Auteurs", "\u00c9diteur", "Date", "Prix", "Note", "Commentaire"];
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
        // User cancelled
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

  const handleExportPDF = async () => {
    setGeneratingPdf(true);
    try {
      await generatePDF(books, categoryCount, totalValue, avgRating);
    } catch (e) {
      console.error("PDF generation failed:", e);
    }
    setGeneratingPdf(false);
  };

  return (
    <div className="flex flex-col gap-3 pb-4">
      <p className="text-sm text-text-tertiary text-center mb-1">
        {books.length} livres dans votre collection
      </p>

      {/* Export PDF */}
      <button
        onClick={handleExportPDF}
        disabled={generatingPdf}
        className="card flex items-center gap-3 active:scale-[0.98] transition-all"
      >
        <div className="w-11 h-11 rounded-xl bg-status-error/10 flex items-center justify-center flex-shrink-0">
          {generatingPdf ? (
            <div className="w-5 h-5 border-2 border-status-error border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5 text-status-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          )}
        </div>
        <div className="text-left">
          <h3 className="font-semibold text-text-primary text-sm">
            {generatingPdf ? "G\u00e9n\u00e9ration en cours..." : "Exporter en PDF"}
          </h3>
          <p className="text-xs text-text-tertiary">Catalogue avec couvertures</p>
        </div>
      </button>

      {/* Share text */}
      <button
        onClick={handleShare}
        className="card flex items-center gap-3 active:scale-[0.98] transition-all"
      >
        <div className="w-11 h-11 rounded-xl bg-brand-grape/10 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-brand-grape" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
          </svg>
        </div>
        <div className="text-left">
          <h3 className="font-semibold text-text-primary text-sm">
            {copied ? "Copi\u00e9 !" : "Partager ma collection"}
          </h3>
          <p className="text-xs text-text-tertiary">Liste texte de tous vos livres</p>
        </div>
      </button>

      {/* Export CSV */}
      <button
        onClick={handleExportCSV}
        className="card flex items-center gap-3 active:scale-[0.98] transition-all"
      >
        <div className="w-11 h-11 rounded-xl bg-brand-mint/10 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-brand-mint" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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

// --- PDF Generation ---

async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    if (blob.size < 500) return null;
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function generatePDF(
  books: ComicBook[],
  categoryCount: number,
  totalValue: number,
  _avgRating: number,
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210;
  const pageH = 297;
  const margin = 15;
  const contentW = pageW - 2 * margin;
  const readCount = books.filter((b) => b.isRead).length;

  // Colors
  const grape = [139, 92, 246] as const;
  const dark = [30, 30, 30] as const;
  const gray = [120, 120, 120] as const;
  const lightGray = [200, 200, 200] as const;

  // === COVER PAGE ===
  // Grape gradient header bar
  doc.setFillColor(139, 92, 246);
  doc.rect(0, 0, pageW, 60, "F");
  doc.setFillColor(244, 114, 182);
  doc.rect(0, 50, pageW, 10, "F");

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text("BiblioScan", pageW / 2, 28, { align: "center" });
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("Ma Collection", pageW / 2, 40, { align: "center" });

  // Stats boxes
  let y = 75;
  doc.setDrawColor(...lightGray);
  doc.setFillColor(250, 250, 252);

  const statsRow = [
    { value: String(books.length), label: "Livres" },
    { value: String(categoryCount), label: "Cat\u00e9gories" },
    { value: totalValue > 0 ? formatEur(totalValue) : "\u2014", label: "Valeur" },
    { value: String(readCount), label: "Lus" },
  ];

  const boxW = (contentW - 9) / 4;
  statsRow.forEach((stat, i) => {
    const x = margin + i * (boxW + 3);
    doc.roundedRect(x, y, boxW, 22, 3, 3, "FD");
    doc.setTextColor(...grape);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(stat.value, x + boxW / 2, y + 10, { align: "center" });
    doc.setTextColor(...gray);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(stat.label, x + boxW / 2, y + 17, { align: "center" });
  });

  y += 35;

  // Date
  doc.setTextColor(...gray);
  doc.setFontSize(9);
  const dateStr = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  doc.text(`G\u00e9n\u00e9r\u00e9 le ${dateStr}`, pageW / 2, y, { align: "center" });

  y += 15;

  // Cover grid on first page (show up to 12 book covers)
  const coverBooks = books.filter((b) => b.coverUrl).slice(0, 12);
  if (coverBooks.length > 0) {
    const coverW = 28;
    const coverH = 40;
    const gap = 4;
    const cols = Math.min(5, coverBooks.length);
    const gridW = cols * coverW + (cols - 1) * gap;
    const startX = (pageW - gridW) / 2;

    for (let i = 0; i < coverBooks.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = startX + col * (coverW + gap);
      const cy = y + row * (coverH + gap);

      if (cy + coverH > pageH - 20) break;

      try {
        const imgData = await loadImageAsBase64(coverBooks[i]!.coverUrl!);
        if (imgData) {
          // Rounded rect clip — draw cover
          doc.addImage(imgData, "JPEG", cx, cy, coverW, coverH);
        }
      } catch {
        // Skip failed covers
      }
    }
  }

  // === BOOK LIST PAGES ===
  const sorted = [...books].sort((a, b) => a.title.localeCompare(b.title, "fr"));

  doc.addPage();
  y = margin;

  // Section header
  doc.setFillColor(139, 92, 246);
  doc.rect(0, 0, pageW, 8, "F");

  doc.setTextColor(...dark);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Catalogue complet", margin, y + 18);
  doc.setTextColor(...gray);
  doc.setFontSize(9);
  doc.text(`${books.length} livres class\u00e9s par titre`, margin, y + 25);
  y += 35;

  const rowH = 22;
  const coverSize = 16;

  for (let i = 0; i < sorted.length; i++) {
    const book = sorted[i]!;

    // Page break check
    if (y + rowH > pageH - 15) {
      doc.addPage();
      doc.setFillColor(139, 92, 246);
      doc.rect(0, 0, pageW, 4, "F");
      y = 15;
    }

    // Alternating background
    if (i % 2 === 0) {
      doc.setFillColor(250, 250, 252);
      doc.rect(margin, y - 2, contentW, rowH, "F");
    }

    let textX = margin + 2;

    // Cover thumbnail
    if (book.coverUrl) {
      try {
        const imgData = await loadImageAsBase64(book.coverUrl);
        if (imgData) {
          doc.addImage(imgData, "JPEG", textX, y, coverSize * 0.7, coverSize);
        }
      } catch {
        // Skip
      }
    }
    textX += coverSize * 0.7 + 3;

    // Title
    doc.setTextColor(...dark);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    const titleMaxW = contentW - textX + margin - 30;
    const titleText = doc.splitTextToSize(book.title, titleMaxW)[0] ?? book.title;
    doc.text(titleText, textX, y + 5);

    // Author
    doc.setTextColor(...gray);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    const authorText = book.authors.join(", ") || "Auteur inconnu";
    doc.text(authorText.substring(0, 50), textX, y + 10);

    // Publisher + date
    const pubText = [book.publisher, book.publishedDate].filter(Boolean).join(" \u00b7 ");
    doc.setFontSize(6);
    doc.text(pubText.substring(0, 60), textX, y + 14);

    // Rating stars (right side)
    if (book.rating) {
      const ratingX = pageW - margin - 20;
      doc.setTextColor(...grape);
      doc.setFontSize(8);
      const stars = "\u2605".repeat(book.rating) + "\u2606".repeat(5 - book.rating);
      doc.text(stars, ratingX, y + 5);
    }

    // Price (right side)
    if (book.retailPrice) {
      const priceX = pageW - margin - 2;
      doc.setTextColor(...gray);
      doc.setFontSize(7);
      doc.text(formatEur(book.retailPrice.amount), priceX, y + 12, { align: "right" });
    }

    // Read badge
    if (book.isRead) {
      doc.setFillColor(34, 197, 94);
      doc.circle(pageW - margin - 3, y + 16, 1.5, "F");
    }

    y += rowH;
  }

  // Footer on last page
  y = pageH - 15;
  doc.setDrawColor(...lightGray);
  doc.line(margin, y - 5, pageW - margin, y - 5);
  doc.setTextColor(...gray);
  doc.setFontSize(7);
  doc.text(`BiblioScan \u2014 ${dateStr} \u2014 ${books.length} livres`, pageW / 2, y, { align: "center" });

  // Save
  doc.save(`biblioscan-collection-${new Date().toISOString().slice(0, 10)}.pdf`);
}

function formatEur(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}
