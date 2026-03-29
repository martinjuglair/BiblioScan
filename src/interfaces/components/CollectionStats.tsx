import { useMemo } from "react";
import { ComicBook } from "@domain/entities/ComicBook";
import { Series } from "@domain/entities/Series";

interface CollectionStatsProps {
  books: ComicBook[];
  series: Series[];
}

interface StatCard {
  label: string;
  value: string;
  sub?: string;
  icon: string;
}

export function CollectionStats({ books, series }: CollectionStatsProps) {
  const stats = useMemo(() => computeStats(books, series), [books, series]);

  if (books.length === 0) return null;

  return (
    <div className="mb-5">
      <h2 className="text-sm font-semibold text-bd-muted uppercase tracking-wide mb-2 px-1">
        Statistiques
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="card flex-shrink-0 w-36 flex flex-col items-center text-center py-3 px-2"
          >
            <span className="text-2xl mb-1">{stat.icon}</span>
            <span className="text-lg font-bold leading-tight">{stat.value}</span>
            <span className="text-xs text-bd-muted leading-tight">{stat.label}</span>
            {stat.sub && (
              <span className="text-xs text-bd-primary mt-0.5 leading-tight truncate max-w-full">
                {stat.sub}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function computeStats(books: ComicBook[], series: Series[]): StatCard[] {
  const stats: StatCard[] = [];

  // 1. Total books
  stats.push({
    icon: "📚",
    value: `${books.length}`,
    label: books.length > 1 ? "BD" : "BD",
  });

  // 2. Total series
  stats.push({
    icon: "📂",
    value: `${series.length}`,
    label: series.length > 1 ? "Séries" : "Série",
  });

  // 3. Total retail value
  const retailTotal = books.reduce((sum, b) => sum + (b.retailPrice?.amount ?? 0), 0);
  if (retailTotal > 0) {
    stats.push({
      icon: "💰",
      value: formatEur(retailTotal),
      label: "Valeur neuf",
    });
  }

  // 4. Average price
  const booksWithPrice = books.filter((b) => b.retailPrice !== null);
  if (booksWithPrice.length > 0) {
    const avg = retailTotal / booksWithPrice.length;
    stats.push({
      icon: "📊",
      value: formatEur(avg),
      label: "Prix moyen",
    });
  }

  // 6. Most complete series
  if (series.length > 0) {
    const topSeries = [...series].sort((a, b) => b.count - a.count)[0]!;
    stats.push({
      icon: "🏆",
      value: `${topSeries.count} tomes`,
      label: "Série la + complète",
      sub: topSeries.name,
    });
  }

  // 7. Top publisher
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
      icon: "🏠",
      value: `${topCount} BD`,
      label: "Top éditeur",
      sub: topPub,
    });
  }

  // 8. Oldest book
  const dated = books
    .filter((b) => b.publishedDate.length >= 4)
    .sort((a, b) => a.publishedDate.localeCompare(b.publishedDate));
  if (dated.length > 0) {
    const oldest = dated[0]!;
    stats.push({
      icon: "📜",
      value: extractYear(oldest.publishedDate),
      label: "La + ancienne",
      sub: truncate(oldest.title, 20),
    });
  }

  // 9. Most recent book
  if (dated.length > 1) {
    const newest = dated[dated.length - 1]!;
    stats.push({
      icon: "✨",
      value: extractYear(newest.publishedDate),
      label: "La + récente",
      sub: truncate(newest.title, 20),
    });
  }

  // 10. Added this month
  const now = new Date();
  const thisMonth = books.filter((b) => {
    return (
      b.addedAt.getMonth() === now.getMonth() &&
      b.addedAt.getFullYear() === now.getFullYear()
    );
  });
  stats.push({
    icon: "📅",
    value: `${thisMonth.length}`,
    label: "Ajoutées ce mois",
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
  return str.length > max ? str.slice(0, max) + "…" : str;
}
