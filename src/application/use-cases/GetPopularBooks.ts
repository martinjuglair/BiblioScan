import { IComicBookRepository } from "@domain/repositories/IComicBookRepository";
import { AuthorSuggestedBook } from "@domain/entities/AuthorRecommendation";
import { Result } from "@domain/shared/Result";
import { GoogleBooksService } from "@infrastructure/services/GoogleBooksService";

/** Curated queries targeting popular French-language books */
const POPULAR_QUERIES = [
  "roman best seller français 2025",
  "prix Goncourt Renaudot récent",
  "meilleur roman français 2024",
  "bande dessinée populaire 2025",
  "manga populaire édition française",
];

/** Check if a book is likely French based on language tag or ISBN (978-2 = francophone) */
function isLikelyFrench(result: { language?: string; isbn: string | null }): boolean {
  if (result.language === "fr") return true;
  if (result.isbn) {
    const clean = result.isbn.replace(/[-\s]/g, "");
    if (clean.startsWith("9782")) return true;
  }
  return false;
}

export class GetPopularBooks {
  constructor(
    private readonly repository: IComicBookRepository,
    private readonly googleBooks: GoogleBooksService,
  ) {}

  async execute(): Promise<Result<AuthorSuggestedBook[]>> {
    try {
      const booksResult = await this.repository.findAll();
      const ownedIsbns = new Set<string>();
      const ownedTitles = new Set<string>();

      if (booksResult.ok) {
        for (const b of booksResult.value) {
          ownedIsbns.add(b.isbn);
          ownedTitles.add(b.title.toLowerCase().trim());
        }
      }

      const suggestions: AuthorSuggestedBook[] = [];
      const seenIsbns = new Set<string>();
      const seenTitles = new Set<string>();

      // Try each query until we have enough results
      for (const query of POPULAR_QUERIES) {
        if (suggestions.length >= 10) break;

        try {
          const searchResult = await this.googleBooks.searchByTitle(query);
          if (!searchResult.ok) continue;

          for (const result of searchResult.value) {
            if (suggestions.length >= 15) break;

            const titleLower = result.title.toLowerCase().trim();

            // Skip already owned
            if (result.isbn && ownedIsbns.has(result.isbn)) continue;
            if (ownedTitles.has(titleLower)) continue;

            // Deduplicate within results
            if (result.isbn && seenIsbns.has(result.isbn)) continue;
            if (seenTitles.has(titleLower)) continue;

            // Must have a cover to look good in the UI
            if (!result.coverUrl) continue;

            // Only French-language books
            if (!isLikelyFrench(result)) continue;

            if (result.isbn) seenIsbns.add(result.isbn);
            seenTitles.add(titleLower);

            suggestions.push({
              title: result.title,
              authors: result.authors,
              publisher: result.publisher,
              coverUrl: result.coverUrl,
              isbn: result.isbn,
              averageRating: result.averageRating,
            });
          }
        } catch {
          // Skip this query, try next
        }
      }

      // Sort: books with ratings first (proxy for popularity), then by rating desc
      suggestions.sort((a, b) => {
        const ra = a.averageRating ?? 0;
        const rb = b.averageRating ?? 0;
        if (ra && !rb) return -1;
        if (!ra && rb) return 1;
        return rb - ra;
      });

      return Result.ok(suggestions.slice(0, 12));
    } catch {
      return Result.fail("Erreur lors du chargement des livres populaires");
    }
  }
}
