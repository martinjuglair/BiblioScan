import { useState, useEffect, useCallback } from "react";
import {
  getSeriesRecommendations,
  getAuthorRecommendations,
  getPopularBooks,
} from "@infrastructure/container";
import type { SeriesRecommendation } from "@domain/entities/SeriesRecommendation";
import type { AuthorRecommendation, AuthorSuggestedBook } from "@domain/entities/AuthorRecommendation";
import { LazyImage } from "./LazyImage";
import { LoadingLogo } from "./LoadingLogo";

interface DiscoverProps {
  onAddBook?: (mode: "scan" | "search" | "manual") => void;
}

// ── In-memory cache ──
interface DiscoverCache {
  series: SeriesRecommendation[];
  authors: AuthorRecommendation[];
  popular: AuthorSuggestedBook[];
  ts: number;
}
let cache: DiscoverCache | null = null;
const CACHE_TTL = 30 * 60 * 1000;
const isCacheValid = () => cache !== null && Date.now() - cache.ts < CACHE_TTL;

export function Discover({ onAddBook }: DiscoverProps) {
  const [series, setSeries] = useState<SeriesRecommendation[]>(cache?.series ?? []);
  const [authors, setAuthors] = useState<AuthorRecommendation[]>(cache?.authors ?? []);
  const [popular, setPopular] = useState<AuthorSuggestedBook[]>(cache?.popular ?? []);
  const [loading, setLoading] = useState(!isCacheValid());
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [popularRes, seriesRes, authorsRes] = await Promise.all([
        getPopularBooks.execute().catch(() => ({ ok: false as const, error: "" })),
        getSeriesRecommendations.execute().catch(() => ({ ok: false as const, error: "" })),
        getAuthorRecommendations.execute().catch(() => ({ ok: false as const, error: "" })),
      ]);
      const p = popularRes.ok ? popularRes.value : [];
      const s = seriesRes.ok ? seriesRes.value : [];
      const a = authorsRes.ok ? authorsRes.value : [];
      setSeries(s);
      setAuthors(a);
      setPopular(p);
      cache = { series: s, authors: a, popular: p, ts: Date.now() };
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!isCacheValid()) fetchAll();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAll(true);
  };

  const handleBookPress = () => {
    onAddBook?.("search");
  };

  // ── Loading state (branded) ──
  if (loading && series.length === 0 && authors.length === 0 && popular.length === 0) {
    return (
      <div className="px-4 pt-2">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-text-primary">Découvrir</h1>
        </div>
        <LoadingLogo
          message="Préparation de vos recommandations"
          hint="On fouille vos livres préférés 📚"
        />
      </div>
    );
  }

  const hasSeries = series.length > 0;
  const hasAuthors = authors.length > 0;
  const hasPopular = popular.length > 0;

  return (
    <div className="px-4 pt-2 pb-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-text-primary">Découvrir</h1>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="text-xs font-medium text-text-tertiary active:text-brand-grape transition-colors disabled:opacity-50"
        >
          {refreshing ? "Chargement..." : "Actualiser"}
        </button>
      </div>

      {hasSeries && (
        <Row title="📚 Pour terminer vos séries">
          {series.flatMap((rec) =>
            rec.nextVolumes.map((vol, i) => (
              <BookCard
                key={`${rec.seriesName}-${vol.volumeNumber}-${i}`}
                coverUrl={vol.coverUrl}
                title={vol.title}
                subtitle={rec.seriesName}
                volumeNumber={vol.volumeNumber}
                isGap={vol.source === "gap"}
                averageRating={vol.averageRating}
                onPress={handleBookPress}
              />
            )),
          )}
        </Row>
      )}

      {hasAuthors &&
        authors.map((rec) => (
          <Row
            key={rec.authorName}
            title={`🖊️ De ${rec.authorName}`}
            subtitle={`Vous avez ${rec.bookCount} livres de cet auteur`}
          >
            {rec.suggestions.map((book, i) => (
              <BookCard
                key={`${book.isbn ?? book.title}-${i}`}
                coverUrl={book.coverUrl}
                title={book.title}
                subtitle={book.authors.join(", ")}
                averageRating={book.averageRating}
                onPress={handleBookPress}
              />
            ))}
          </Row>
        ))}

      {hasPopular && (
        <Row title="🔥 Livres populaires">
          {popular.map((book, i) => (
            <BookCard
              key={`${book.isbn ?? book.title}-${i}`}
              coverUrl={book.coverUrl}
              title={book.title}
              subtitle={book.authors.join(", ")}
              averageRating={book.averageRating}
              onPress={handleBookPress}
            />
          ))}
        </Row>
      )}

      {!hasSeries && !hasAuthors && !hasPopular && <EmptyState />}
    </div>
  );
}

// ── Shared Components ──

function Row({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <h2 className="text-[15px] font-bold text-text-primary mb-0.5">{title}</h2>
      {subtitle && <p className="text-xs text-text-tertiary mb-3">{subtitle}</p>}
      {!subtitle && <div className="mb-3" />}
      <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-hide">{children}</div>
    </div>
  );
}

function BookCard({
  coverUrl,
  title,
  subtitle,
  volumeNumber,
  isGap,
  averageRating,
  onPress,
}: {
  coverUrl: string | null;
  title: string;
  subtitle: string;
  volumeNumber?: number | null;
  isGap?: boolean;
  averageRating?: number;
  onPress: () => void;
}) {
  return (
    <button onClick={onPress} className="shrink-0 w-[100px] text-left group">
      <div className="relative mb-1.5">
        <div className="w-[100px] aspect-[0.65] rounded-lg overflow-hidden bg-surface-subtle">
          {coverUrl ? (
            <LazyImage
              src={coverUrl}
              alt={title}
              className="w-full h-full object-cover group-active:scale-105 transition-transform"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl">📖</div>
          )}
        </div>
        {volumeNumber != null && (
          <span className="absolute top-1 left-1 bg-brand-grape text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
            T{volumeNumber}
          </span>
        )}
        {isGap && (
          <span className="absolute bottom-1 right-1 bg-red-500 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-full">
            Manquant
          </span>
        )}
      </div>
      <p className="text-xs font-semibold text-text-primary leading-4 line-clamp-2">{title}</p>
      <p className="text-[11px] text-text-tertiary mt-0.5 truncate">{subtitle}</p>
      {averageRating != null && (
        <p className="text-[10px] text-text-tertiary mt-0.5">⭐ {averageRating.toFixed(1)}</p>
      )}
    </button>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center pt-16 px-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-surface-subtle flex items-center justify-center mb-4">
        <span className="text-3xl">📖</span>
      </div>
      <h3 className="text-base font-bold text-text-primary mb-2">
        Pas encore de recommandations
      </h3>
      <p className="text-sm text-text-tertiary leading-relaxed">
        Ajoutez des livres à votre collection et marquez-les comme lus pour
        recevoir des suggestions personnalisées.
      </p>
    </div>
  );
}

