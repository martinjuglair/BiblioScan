import { IComicBookRepository } from "@domain/repositories/IComicBookRepository";
import { AuthorSuggestedBook } from "@domain/entities/AuthorRecommendation";
import { Result } from "@domain/shared/Result";
import { GoogleBooksService } from "@infrastructure/services/GoogleBooksService";

/** Curated queries for discovering popular/trending books */
const POPULAR_QUERIES = [
  "roman best seller 2025",
  "meilleur livre 2024",
  "prix littéraire récent",
];

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
            if (suggestions.length >= 12) break;

            const titleLower = result.title.toLowerCase().trim();

            // Skip already owned
            if (result.isbn && ownedIsbns.has(result.isbn)) continue;
            if (ownedTitles.has(titleLower)) continue;

            // Deduplicate within results
            if (result.isbn && seenIsbns.has(result.isbn)) continue;
            if (seenTitles.has(titleLower)) continue;

            // Must have a cover to look good in the UI
            if (!result.coverUrl) continue;

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

      return Result.ok(suggestions);
    } catch {
      return Result.fail("Erreur lors du chargement des livres populaires");
    }
  }
}
