import { IComicBookRepository } from "@domain/repositories/IComicBookRepository";
import { ISeriesSearchService } from "@domain/services/ISeriesSearchService";
import { Series } from "@domain/entities/Series";
import { SeriesRecommendation, SuggestedVolume } from "@domain/entities/SeriesRecommendation";
import { Result } from "@domain/shared/Result";

const MAX_SERIES = 5;
const MAX_SEARCHES_PER_SERIES = 3;

export class GetSeriesRecommendations {
  constructor(
    private readonly repository: IComicBookRepository,
    private readonly seriesSearch: ISeriesSearchService,
  ) {}

  async execute(): Promise<Result<SeriesRecommendation[]>> {
    try {
      const booksResult = await this.repository.findAll();
      if (!booksResult.ok) return Result.fail(booksResult.error);

      const allSeries = Series.groupFromBooks(booksResult.value);

      // Filter: ≥2 books, real series name, not "hors série"
      const qualified = allSeries
        .filter(
          (s) =>
            s.count >= 2 &&
            s.name !== "Sans série" &&
            !s.name.includes("(hors série)"),
        )
        .slice(0, MAX_SERIES);

      if (qualified.length === 0) {
        return Result.ok([]);
      }

      const recommendations: SeriesRecommendation[] = [];

      // Process sequentially to avoid rate limiting Google Books API
      for (const series of qualified) {
        try {
          const rec = series.isNumberedSeries
            ? await this.processNumberedSeries(series)
            : await this.processPrefixSeries(series);
          if (rec) recommendations.push(rec);
        } catch {
          // Skip this series on error, continue with others
        }
      }

      // Sort: series with gaps first, then by owned count descending
      recommendations.sort((a, b) => {
        const aHasGaps = a.missingGaps.length > 0 ? 0 : 1;
        const bHasGaps = b.missingGaps.length > 0 ? 0 : 1;
        if (aHasGaps !== bHasGaps) return aHasGaps - bHasGaps;
        return b.ownedCount - a.ownedCount;
      });

      return Result.ok(recommendations);
    } catch {
      return Result.fail("Erreur lors du chargement des recommandations de séries");
    }
  }

  /** Handle series with explicit volume numbers (e.g. "Astérix - Tome 5") */
  private async processNumberedSeries(
    series: Series,
  ): Promise<SeriesRecommendation | null> {
    const missingGaps = series.missingVolumes;
    const volumes = series.books
      .map((b) => b.volumeNumber)
      .filter((v): v is number => v !== null);
    const highestOwned = Math.max(...volumes, 0);

    const volumesToSearch: { vol: number; source: "gap" | "next" }[] = [
      ...missingGaps.map((v) => ({ vol: v, source: "gap" as const })),
      { vol: highestOwned + 1, source: "next" as const },
      { vol: highestOwned + 2, source: "next" as const },
    ].slice(0, MAX_SEARCHES_PER_SERIES);

    const found: SuggestedVolume[] = [];

    // Sequential to avoid rate limiting
    for (const { vol, source } of volumesToSearch) {
      try {
        const result = await this.seriesSearch.searchSeriesVolume(series.name, vol);
        if (result.ok && result.value) {
          found.push({ ...result.value, source });
        }
      } catch {
        // Skip this volume
      }
    }

    if (found.length === 0) return null;

    return {
      seriesName: series.name,
      ownedCount: series.count,
      highestOwned,
      missingGaps,
      nextVolumes: found,
      coverUrl: series.coverUrl,
    };
  }

  /** Handle series detected by common title prefix (e.g. "Harry Potter") */
  private async processPrefixSeries(
    series: Series,
  ): Promise<SeriesRecommendation | null> {
    const ownedIsbns = series.books.map((b) => b.isbn);
    const ownedTitles = series.books.map((b) => b.title);

    const result = await this.seriesSearch.searchOtherBooksInSeries(
      series.name,
      ownedIsbns,
      ownedTitles,
    );

    if (!result.ok || result.value.length === 0) return null;

    return {
      seriesName: series.name,
      ownedCount: series.count,
      highestOwned: 0,
      missingGaps: [],
      nextVolumes: result.value,
      coverUrl: series.coverUrl,
    };
  }
}
