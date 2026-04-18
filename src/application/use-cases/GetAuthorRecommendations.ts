import { IComicBookRepository } from "@domain/repositories/IComicBookRepository";
import { AuthorRecommendation, AuthorSuggestedBook } from "@domain/entities/AuthorRecommendation";
import { Result } from "@domain/shared/Result";
import { GoogleBooksService } from "@infrastructure/services/GoogleBooksService";

const MAX_AUTHORS = 3;
const MIN_BOOKS_PER_AUTHOR = 2;

/** Check if a book is likely French based on language tag or ISBN (978-2 = francophone) */
function isLikelyFrench(result: { language?: string; isbn: string | null }): boolean {
  if (result.language === "fr") return true;
  if (result.isbn) {
    const clean = result.isbn.replace(/[-\s]/g, "");
    if (clean.startsWith("9782")) return true;
  }
  return false;
}

/** Fisher-Yates shuffle — fresh random order at each call */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export class GetAuthorRecommendations {
  constructor(
    private readonly repository: IComicBookRepository,
    private readonly googleBooks: GoogleBooksService,
  ) {}

  async execute(): Promise<Result<AuthorRecommendation[]>> {
    try {
      const booksResult = await this.repository.findAll();
      if (!booksResult.ok) return Result.fail(booksResult.error);

      const allBooks = booksResult.value;

      // Build set of all owned ISBNs + titles for dedup
      const ownedIsbns = new Set(allBooks.map((b) => b.isbn));
      const ownedTitles = new Set(allBooks.map((b) => b.title.toLowerCase().trim()));

      // Count ALL books per author (read or not)
      const authorBookCount = new Map<string, number>();
      for (const book of allBooks) {
        for (const author of book.authors) {
          const norm = author.trim();
          if (!norm) continue;
          authorBookCount.set(norm, (authorBookCount.get(norm) ?? 0) + 1);
        }
      }

      // Keep only authors with at least MIN_BOOKS_PER_AUTHOR books
      const eligibleAuthors = [...authorBookCount.entries()].filter(
        ([, count]) => count >= MIN_BOOKS_PER_AUTHOR,
      );

      if (eligibleAuthors.length === 0) {
        return Result.ok([]);
      }

      // Randomize which authors get prioritized this session
      const pickedAuthors = shuffle(eligibleAuthors).slice(0, MAX_AUTHORS);

      const recommendations: AuthorRecommendation[] = [];

      // Sequential to avoid rate limiting
      for (const [authorName, bookCount] of pickedAuthors) {
        try {
          const rec = await this.searchAuthor(authorName, bookCount, ownedIsbns, ownedTitles);
          if (rec) recommendations.push(rec);
        } catch {
          // Skip this author
        }
      }

      return Result.ok(recommendations);
    } catch {
      return Result.fail("Erreur lors du chargement des recommandations d'auteurs");
    }
  }

  private async searchAuthor(
    authorName: string,
    bookCount: number,
    ownedIsbns: Set<string>,
    ownedTitles: Set<string>,
  ): Promise<AuthorRecommendation | null> {
    // Google Books supports inauthor: search operator
    const query = `inauthor:"${authorName}"`;
    const searchResult = await this.googleBooks.searchByTitle(query);

    if (!searchResult.ok) return null;

    const suggestions: AuthorSuggestedBook[] = [];
    const authorLower = authorName.toLowerCase();

    for (const result of searchResult.value) {
      // Skip if already owned
      if (result.isbn && ownedIsbns.has(result.isbn)) continue;
      if (ownedTitles.has(result.title.toLowerCase().trim())) continue;

      // Verify the author is actually in the result
      const hasAuthor = result.authors.some((a) =>
        a.toLowerCase().includes(authorLower) || authorLower.includes(a.toLowerCase()),
      );
      if (!hasAuthor) continue;

      // Only French-language editions
      if (!isLikelyFrench(result)) continue;

      // Must have a cover
      if (!result.coverUrl) continue;

      suggestions.push({
        title: result.title,
        authors: result.authors,
        publisher: result.publisher,
        coverUrl: result.coverUrl,
        isbn: result.isbn,
        averageRating: result.averageRating,
      });
    }

    if (suggestions.length === 0) return null;

    return { authorName, bookCount, suggestions };
  }
}
