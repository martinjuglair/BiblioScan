import { useMemo, useState } from "react";
import { ComicBook } from "@domain/entities/ComicBook";

interface CollectionStatsProps {
  books: ComicBook[];
  categoryCount: number;
}

export function CollectionStats({ books, categoryCount }: CollectionStatsProps) {
  const [expanded, setExpanded] = useState(false);
  const stats = useMemo(() => computeStats(books, categoryCount), [books, categoryCount]);

  if (books.length === 0) return null;

  return (
    <div className="mb-4">
      {/* Main stats row — always visible */}
      <div className="grid grid-cols-3 gap-2 mb-2">
        <StatBadge value={stats.totalBooks} label="Livres" color="brand-grape" />
        <StatBadge value={stats.totalCategories} label={stats.totalCategories > 1 ? "Catégories" : "Catégorie"} color="brand-bubblegum" />
        <StatBadge
          value={stats.totalValue ? formatEur(stats.totalValue) : "—"}
          label="Valeur neuf"
          color="status-success"
        />
      </div>

      {/* Expand button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-center gap-1 py-1.5 text-xs text-text-tertiary font-medium transition-colors active:text-text-secondary"
      >
        {expanded ? "Masquer les détails" : "Voir les détails"}
        <svg
          className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded section */}
      {expanded && (
        <div className="space-y-3 mt-2 animate-in">
          {/* Publisher distribution */}
          {stats.publishers.length > 0 && (
            <div className="card">
              <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-2">Top éditeurs</h3>
              <div className="space-y-2">
                {stats.publishers.slice(0, 5).map((pub) => (
                  <div key={pub.name}>
                    <div className="flex justify-between text-sm mb-0.5">
                      <span className="text-text-primary font-medium truncate mr-2">{pub.name}</span>
                      <span className="text-text-tertiary text-xs flex-shrink-0">{pub.count} livre{pub.count > 1 ? "s" : ""}</span>
                    </div>
                    <div className="h-1.5 bg-surface-subtle rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${(pub.count / stats.totalBooks) * 100}%`,
                          background: `linear-gradient(90deg, #FB6538, #FF8B5F)`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Monthly additions chart */}
          {stats.monthlyData.length > 0 && (
            <div className="card">
              <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-2">Ajouts par mois</h3>
              <div className="flex items-end gap-1 h-20">
                {stats.monthlyData.map((m, i) => {
                  const maxCount = Math.max(...stats.monthlyData.map((d) => d.count), 1);
                  const height = (m.count / maxCount) * 100;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                      <span className="text-[9px] text-text-tertiary font-medium">
                        {m.count > 0 ? m.count : ""}
                      </span>
                      <div
                        className="w-full rounded-t-sm transition-all duration-500"
                        style={{
                          height: `${Math.max(height, 4)}%`,
                          background: m.count > 0
                            ? "linear-gradient(180deg, #FB6538, #FB6538aa)"
                            : "#F5F3FF",
                        }}
                      />
                      <span className="text-[9px] text-text-muted">{m.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Rating distribution */}
          {stats.ratingDistribution.some((r) => r > 0) && (
            <div className="card">
              <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-2">Répartition des notes</h3>
              <div className="space-y-1.5">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = stats.ratingDistribution[star - 1]!;
                  const maxRating = Math.max(...stats.ratingDistribution, 1);
                  return (
                    <div key={star} className="flex items-center gap-2">
                      <span className="text-xs text-text-tertiary w-4 text-right">{star}</span>
                      <svg className="w-3.5 h-3.5 text-brand-lemon flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                      </svg>
                      <div className="flex-1 h-2 bg-surface-subtle rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-brand-lemon transition-all duration-500"
                          style={{ width: `${(count / maxRating) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-text-muted w-6 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
              {stats.avgRating > 0 && (
                <p className="text-xs text-text-tertiary mt-2 text-center">
                  Note moyenne : <span className="font-semibold text-brand-lemon">{stats.avgRating.toFixed(1)}</span>/5
                  ({stats.ratedCount} livre{stats.ratedCount > 1 ? "s" : ""} noté{stats.ratedCount > 1 ? "s" : ""})
                </p>
              )}
            </div>
          )}

          {/* Additional stats */}
          <div className="grid grid-cols-2 gap-2">
            {stats.avgPrice > 0 && (
              <div className="card text-center py-3">
                <span className="text-lg font-bold text-brand-mint">{formatEur(stats.avgPrice)}</span>
                <p className="text-[11px] text-text-tertiary mt-0.5">Prix moyen</p>
              </div>
            )}
            {stats.thisMonth > 0 && (
              <div className="card text-center py-3">
                <span className="text-lg font-bold text-brand-grape">+{stats.thisMonth}</span>
                <p className="text-[11px] text-text-tertiary mt-0.5">Ce mois-ci</p>
              </div>
            )}
            {stats.oldestBook && (
              <div className="card text-center py-3">
                <span className="text-lg font-bold text-text-secondary">{stats.oldestBook.year}</span>
                <p className="text-[11px] text-text-tertiary mt-0.5">Le + ancien</p>
                <p className="text-[10px] text-brand-grape truncate mt-0.5 font-medium">{truncate(stats.oldestBook.title, 18)}</p>
              </div>
            )}
            {stats.newestBook && (
              <div className="card text-center py-3">
                <span className="text-lg font-bold text-brand-mint">{stats.newestBook.year}</span>
                <p className="text-[11px] text-text-tertiary mt-0.5">Le + récent</p>
                <p className="text-[10px] text-brand-grape truncate mt-0.5 font-medium">{truncate(stats.newestBook.title, 18)}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatBadge({ value, label, color }: { value: string | number; label: string; color: string }) {
  return (
    <div className="card text-center py-2.5 px-1">
      <span className={`text-xl font-bold leading-tight text-${color}`}>{value}</span>
      <p className="text-[11px] text-text-tertiary leading-tight mt-0.5">{label}</p>
    </div>
  );
}

interface StatsData {
  totalBooks: number;
  totalCategories: number;
  totalValue: number;
  avgPrice: number;
  thisMonth: number;
  publishers: { name: string; count: number }[];
  monthlyData: { label: string; count: number }[];
  ratingDistribution: number[];
  avgRating: number;
  ratedCount: number;
  oldestBook: { year: string; title: string } | null;
  newestBook: { year: string; title: string } | null;
}

function computeStats(books: ComicBook[], categoryCount: number): StatsData {
  const totalBooks = books.length;
  const totalCategories = categoryCount;

  // Value
  const booksWithPrice = books.filter((b) => b.retailPrice !== null);
  const totalValue = booksWithPrice.reduce((sum, b) => sum + (b.retailPrice?.amount ?? 0), 0);
  const avgPrice = booksWithPrice.length > 0 ? totalValue / booksWithPrice.length : 0;

  // This month
  const now = new Date();
  const thisMonth = books.filter(
    (b) => b.addedAt.getMonth() === now.getMonth() && b.addedAt.getFullYear() === now.getFullYear(),
  ).length;

  // Publishers
  const pubMap = new Map<string, number>();
  for (const b of books) {
    const pub = b.publisher || "Inconnu";
    pubMap.set(pub, (pubMap.get(pub) ?? 0) + 1);
  }
  const publishers = [...pubMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Monthly data (last 6 months)
  const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];
  const monthlyData: { label: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const count = books.filter(
      (b) => b.addedAt.getMonth() === d.getMonth() && b.addedAt.getFullYear() === d.getFullYear(),
    ).length;
    monthlyData.push({ label: months[d.getMonth()]!, count });
  }

  // Ratings
  const ratingDistribution = [0, 0, 0, 0, 0]; // index 0 = 1 star, index 4 = 5 stars
  let ratedCount = 0;
  let ratingSum = 0;
  for (const b of books) {
    if (b.rating && b.rating >= 1 && b.rating <= 5) {
      ratingDistribution[b.rating - 1]!++;
      ratedCount++;
      ratingSum += b.rating;
    }
  }
  const avgRating = ratedCount > 0 ? ratingSum / ratedCount : 0;

  // Oldest/newest
  const dated = books
    .filter((b) => b.publishedDate.length >= 4)
    .sort((a, b) => a.publishedDate.localeCompare(b.publishedDate));
  const oldestBook = dated.length > 0 ? { year: extractYear(dated[0]!.publishedDate), title: dated[0]!.title } : null;
  const newestBook = dated.length > 1 ? { year: extractYear(dated[dated.length - 1]!.publishedDate), title: dated[dated.length - 1]!.title } : null;

  return {
    totalBooks, totalCategories, totalValue, avgPrice, thisMonth,
    publishers, monthlyData, ratingDistribution, avgRating, ratedCount,
    oldestBook, newestBook,
  };
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
