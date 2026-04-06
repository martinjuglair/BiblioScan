import { ComicBookCreateInput } from "@domain/entities/ComicBook";
import { IBookLookupService } from "@domain/services/IBookLookupService";
import { Result } from "@domain/shared/Result";
import { GoogleBooksVolumeSchema } from "./schemas";
import { z } from "zod";

const GOOGLE_BOOKS_API = "https://www.googleapis.com/books/v1/volumes";

const SingleVolumeSchema = z.object({
  saleInfo: z
    .object({
      listPrice: z
        .object({ amount: z.number(), currencyCode: z.string() })
        .optional(),
      retailPrice: z
        .object({ amount: z.number(), currencyCode: z.string() })
        .optional(),
    })
    .optional(),
});

export interface GoogleBooksSearchResult {
  title: string;
  authors: string[];
  publisher: string;
  publishedDate: string;
  coverUrl: string | null;
  isbn: string | null;
  retailPrice: { amount: number; currency: string } | null;
}

export class GoogleBooksService implements IBookLookupService {
  /**
   * Full-text search by title/author keywords.
   * Google Books has excellent fuzzy matching — handles typos, partial names, accent variations.
   */
  async searchByTitle(query: string): Promise<Result<GoogleBooksSearchResult[]>> {
    try {
      const url = `${GOOGLE_BOOKS_API}?q=${encodeURIComponent(query)}&langRestrict=fr&maxResults=12&country=FR&orderBy=relevance`;
      let response = await fetch(url);

      if (response.status === 429) {
        await new Promise((r) => setTimeout(r, 2000));
        response = await fetch(url);
      }

      if (!response.ok) {
        return Result.fail(`Google Books API erreur HTTP ${response.status}`);
      }

      const raw: unknown = await response.json();
      const parsed = GoogleBooksVolumeSchema.safeParse(raw);

      if (!parsed.success) {
        return Result.fail(`Réponse Google Books invalide`);
      }

      const data = parsed.data;
      if (data.totalItems === 0 || data.items.length === 0) {
        return Result.ok([]);
      }

      const results: GoogleBooksSearchResult[] = data.items.map((item) => {
        const info = item.volumeInfo;
        const sale = item.saleInfo;

        const coverUrl =
          info.imageLinks?.thumbnail?.replace("http://", "https://") ??
          info.imageLinks?.smallThumbnail?.replace("http://", "https://") ??
          null;

        // Extract ISBN-13 or ISBN-10
        const isbn13 = info.industryIdentifiers?.find((id) => id.type === "ISBN_13");
        const isbn10 = info.industryIdentifiers?.find((id) => id.type === "ISBN_10");
        const isbn = isbn13?.identifier ?? isbn10?.identifier ?? null;

        const retailPrice = sale?.listPrice
          ? { amount: sale.listPrice.amount, currency: sale.listPrice.currencyCode }
          : sale?.retailPrice
            ? { amount: sale.retailPrice.amount, currency: sale.retailPrice.currencyCode }
            : null;

        return {
          title: info.title,
          authors: info.authors,
          publisher: info.publisher,
          publishedDate: info.publishedDate,
          coverUrl,
          isbn,
          retailPrice,
        };
      });

      return Result.ok(results);
    } catch {
      return Result.fail("Impossible de contacter Google Books API");
    }
  }

  async lookupByISBN(isbn: string): Promise<Result<ComicBookCreateInput>> {
    try {
      let response = await fetch(`${GOOGLE_BOOKS_API}?q=isbn:${isbn}&country=FR`);

      // Retry once after a short delay on rate limit (429)
      if (response.status === 429) {
        await new Promise((r) => setTimeout(r, 2000));
        response = await fetch(`${GOOGLE_BOOKS_API}?q=isbn:${isbn}&country=FR`);
      }

      if (!response.ok) {
        return Result.fail(`Google Books API erreur HTTP ${response.status}`);
      }

      const raw: unknown = await response.json();
      const parsed = GoogleBooksVolumeSchema.safeParse(raw);

      if (!parsed.success) {
        return Result.fail(`Réponse Google Books invalide : ${parsed.error.message}`);
      }

      const data = parsed.data;
      if (data.totalItems === 0 || data.items.length === 0) {
        return Result.fail("Aucun résultat Google Books pour cet ISBN");
      }

      const item = data.items[0]!;
      const info = item.volumeInfo;
      let sale = item.saleInfo;

      const coverUrl =
        info.imageLinks?.thumbnail?.replace("http://", "https://") ??
        info.imageLinks?.smallThumbnail?.replace("http://", "https://") ??
        null;

      // If no price in search result, try direct volume endpoint with country=FR
      if (!sale?.listPrice && !sale?.retailPrice && item.id) {
        const priceSale = await this.fetchVolumePrice(item.id);
        if (priceSale) {
          sale = priceSale;
        }
      }

      const retailPrice = sale?.listPrice
        ? { amount: sale.listPrice.amount, currency: sale.listPrice.currencyCode }
        : sale?.retailPrice
          ? { amount: sale.retailPrice.amount, currency: sale.retailPrice.currencyCode }
          : null;

      return Result.ok({
        isbn,
        title: info.title,
        authors: info.authors,
        publisher: info.publisher,
        publishedDate: info.publishedDate,
        coverUrl,
        retailPrice,
      });
    } catch {
      return Result.fail("Impossible de contacter Google Books API");
    }
  }

  /** Fetch price from direct volume endpoint (sometimes has prices the search doesn't) */
  private async fetchVolumePrice(
    volumeId: string,
  ): Promise<z.infer<typeof SingleVolumeSchema>["saleInfo"] | null> {
    try {
      const response = await fetch(`${GOOGLE_BOOKS_API}/${volumeId}?country=FR`);
      if (!response.ok) return null;

      const raw: unknown = await response.json();
      const parsed = SingleVolumeSchema.safeParse(raw);
      if (!parsed.success) return null;

      const sale = parsed.data.saleInfo;
      if (sale?.listPrice || sale?.retailPrice) return sale;
      return null;
    } catch {
      return null;
    }
  }
}
