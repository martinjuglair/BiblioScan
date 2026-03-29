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

export class GoogleBooksService implements IBookLookupService {
  async lookupByISBN(isbn: string): Promise<Result<ComicBookCreateInput>> {
    try {
      const response = await fetch(`${GOOGLE_BOOKS_API}?q=isbn:${isbn}&country=FR`);

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
