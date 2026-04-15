import { ISeriesSearchService } from "@domain/services/ISeriesSearchService";
import { SuggestedVolume } from "@domain/entities/SeriesRecommendation";
import { Result } from "@domain/shared/Result";
import { SeriesDetector } from "@domain/services/SeriesDetector";
import { GoogleBooksService } from "./GoogleBooksService";

/** Check if a book is likely French based on language tag or ISBN (978-2 = francophone) */
function isLikelyFrench(result: { language?: string; isbn: string | null }): boolean {
  if (result.language === "fr") return true;
  if (result.isbn) {
    const clean = result.isbn.replace(/[-\s]/g, "");
    if (clean.startsWith("9782")) return true;
  }
  return false;
}

export class GoogleBooksSeriesSearchService implements ISeriesSearchService {
  constructor(private readonly googleBooks: GoogleBooksService) {}

  async searchSeriesVolume(
    seriesName: string,
    volumeNumber: number,
  ): Promise<Result<SuggestedVolume | null>> {
    // Try primary query: "Nom de la série tome N"
    const primaryQuery = `${seriesName} tome ${volumeNumber}`;
    const primaryResult = await this.googleBooks.searchByTitle(primaryQuery);

    if (primaryResult.ok && primaryResult.value.length > 0) {
      const match = this.findBestMatch(primaryResult.value, seriesName, volumeNumber);
      if (match) return Result.ok(match);
    }

    // Fallback query: "Nom de la série TN"
    const fallbackQuery = `${seriesName} T${volumeNumber}`;
    const fallbackResult = await this.googleBooks.searchByTitle(fallbackQuery);

    if (fallbackResult.ok && fallbackResult.value.length > 0) {
      const match = this.findBestMatch(fallbackResult.value, seriesName, volumeNumber);
      if (match) return Result.ok(match);
    }

    return Result.ok(null);
  }

  async searchOtherBooksInSeries(
    seriesPrefix: string,
    ownedIsbns: string[],
    ownedTitles: string[],
  ): Promise<Result<SuggestedVolume[]>> {
    const searchResult = await this.googleBooks.searchByTitle(seriesPrefix);

    if (!searchResult.ok) {
      return Result.fail(searchResult.error);
    }

    const ownedIsbnSet = new Set(ownedIsbns);
    const ownedTitleNorm = new Set(ownedTitles.map((t) => t.toLowerCase().trim()));
    const prefixLower = seriesPrefix.toLowerCase().trim();

    const suggestions: SuggestedVolume[] = [];

    for (const result of searchResult.value) {
      const titleLower = result.title.toLowerCase().trim();

      // Must contain the series prefix (relaxed from startsWith)
      if (!titleLower.includes(prefixLower)) continue;

      // Skip if already owned (by ISBN or similar title)
      if (result.isbn && ownedIsbnSet.has(result.isbn)) continue;
      if (ownedTitleNorm.has(titleLower)) continue;

      // Only French-language editions
      if (!isLikelyFrench(result)) continue;

      // Must have a cover
      if (!result.coverUrl) continue;

      // Extract volume number if present in the title
      const detected = SeriesDetector.detect(result.title);
      const volumeNumber = detected.volumeNumber;

      suggestions.push({
        volumeNumber,
        title: result.title,
        authors: result.authors,
        publisher: result.publisher,
        coverUrl: result.coverUrl,
        isbn: result.isbn,
        source: "same-series",
        averageRating: result.averageRating,
      });
    }

    return Result.ok(suggestions);
  }

  private findBestMatch(
    results: { title: string; authors: string[]; publisher: string; coverUrl: string | null; isbn: string | null; averageRating?: number }[],
    seriesName: string,
    volumeNumber: number,
  ): SuggestedVolume | null {
    const normalizedSeries = seriesName.toLowerCase().trim();

    for (const result of results) {
      const detected = SeriesDetector.detect(result.title);

      // Check that detected series name roughly matches what we're looking for
      const detectedNorm = detected.seriesName.toLowerCase().trim();
      const seriesMatch =
        detectedNorm === normalizedSeries ||
        detectedNorm.includes(normalizedSeries) ||
        normalizedSeries.includes(detectedNorm);

      // And the volume number matches + must be French
      if (seriesMatch && detected.volumeNumber === volumeNumber && isLikelyFrench(result)) {
        return {
          volumeNumber,
          title: result.title,
          authors: result.authors,
          publisher: result.publisher,
          coverUrl: result.coverUrl,
          isbn: result.isbn,
          source: "gap", // Will be overridden by the use case
          averageRating: result.averageRating,
        };
      }
    }

    return null;
  }
}
