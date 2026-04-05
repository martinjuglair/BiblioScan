import { useMemo } from "react";
import { ComicBook } from "@domain/entities/ComicBook";

interface CollectionStatsProps {
  books: ComicBook[];
  categoryCount: number;
}

interface StatCard {
  label: string;
  value: string;
  sub?: string;
  color: string;
}

export function CollectionStats({ books, categoryCount }: CollectionStatsProps) {
  const stats = useMemo(() => computeStats(books, categoryCount), [books, categoryCount]);

  if (books.length === 0) return null;

  return (
    <div className="mb-5">
      <h2 className="text-sm font-semibold text-text-tertiary uppercase tracking-wide mb-2 px-1">
        Statistiques
      </h2>
      <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 -mx-3 px-3 sm:-mx-4 sm:px-4 scrollbar-hide">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="card flex-shrink-0 w-28 min-[360px]:w-32 sm:w-36 flex flex-col items-center text-center py-2.5 sm:py-3 px-2"
          >
            <span className={`text-xl sm:text-2xl font-bold leading-tight ${stat.color}`}>{stat.value}</span>
            <span className="text-[11px] sm:text-xs text-text-tertiary leading-tight mt-1">{stat.label}</span>
            {stat.sub && (
              <span className="text-[11px] sm:text-xs text-brand-orange mt-0.5 leading-tight truncate max-w-full font-medium">
                {stat.sub}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function computeStats(books: ComicBook[], categoryCount: number): StatCard[] {
  const stats: StatCard[] = [];

  stats.push({
    value: `${books.length}`,
    label: "Livres",
    color: "text-brand-orange",
  });

  stats.push({
    value: `${categoryCount}`,
    label: categoryCount > 1 ? "Catégories" : "Catégorie",
    color: "text-brand-purple",
  });

  const retailTotal = books.reduce((sum, b) => sum + (b.retailPrice?.amount ?? 0), 0);
  if (retailTotal > 0) {
    stats.push({
      value: formatEur(retailTotal),
      label: "Valeur neuf",
      color: "text-status-success",
    });
  }

  const booksWithPrice = books.filter((b) => b.retailPrice !== null);
  if (booksWithPrice.length > 0) {
    const avg = retailTotal / booksWithPrice.length;
    stats.push({
      value: formatEur(avg),
      label: "Prix moyen",
      color: "text-brand-teal",
    });
  }

  const publisherCounts = new Map<string, number>();
  for (const book of books) {
    const pub = book.publisher || "Inconnu";
    publisherCounts.set(pub, (publisherCounts.get(pub) ?? 0) + 1);
  }
  if (publisherCounts.size > 0) {
    let topPub = "";
    let topCount = 0;
    for (const [pub, count] of publisherCounts) {
      if (count > topCount) {
        topPub = pub;
        topCount = count;
      }
    }
    stats.push({
      value: `${topCount} livres`,
      label: "Top éditeur",
      sub: topPub,
      color: "text-brand-purple",
    });
  }

  const dated = books
    .filter((b) => b.publishedDate.length >= 4)
    .sort((a, b) => a.publishedDate.localeCompare(b.publishedDate));
  if (dated.length > 0) {
    const oldest = dated[0]!;
    stats.push({
      value: extractYear(oldest.publishedDate),
      label: "Le + ancien",
      sub: truncate(oldest.title, 20),
      color: "text-text-secondary",
    });
  }

  if (dated.length > 1) {
    const newest = dated[dated.length - 1]!;
    stats.push({
      value: extractYear(newest.publishedDate),
      label: "Le + récent",
      sub: truncate(newest.title, 20),
      color: "text-brand-teal",
    });
  }

  const now = new Date();
  const thisMonth = books.filter((b) => {
    return (
      b.addedAt.getMonth() === now.getMonth() &&
      b.addedAt.getFullYear() === now.getFullYear()
    );
  });
  stats.push({
    value: `${thisMonth.length}`,
    label: "Ajoutés ce mois",
    color: "text-brand-orange",
  });

  return stats;
}

function formatEur(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function extractYear(date: string): string {
  const match = date.match(/\d{4}/);
  return match?.[0] ?? date;
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + "\u2026" : str;
}
