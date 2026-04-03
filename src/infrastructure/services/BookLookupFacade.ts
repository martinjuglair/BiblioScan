import { ComicBookCreateInput } from "@domain/entities/ComicBook";
import { IBookLookupService } from "@domain/services/IBookLookupService";
import { Result } from "@domain/shared/Result";
import { BnfService } from "./BnfPriceService";

/** Tries Google Books first, falls back to Open Library, then BnF. Enriches with BnF data. */
export class BookLookupFacade implements IBookLookupService {
  private readonly bnfService = new BnfService();

  constructor(
    private readonly primary: IBookLookupService,
    private readonly fallback: IBookLookupService,
  ) {}

  async lookupByISBN(isbn: string): Promise<Result<ComicBookCreateInput>> {
    // Fetch metadata and BnF data in parallel
    const [metadataResult, bnfResult] = await Promise.all([
      this.fetchMetadata(isbn),
      this.bnfService.fetchBookData(isbn),
    ]);

    const bnf = bnfResult.ok ? bnfResult.value : null;

    // If Google Books + Open Library both failed, try to build from BnF data alone
    if (!metadataResult.ok) {
      if (bnf?.title) {
        return Result.ok({
          isbn,
          title: bnf.title,
          authors: bnf.authors,
          publisher: bnf.publisher ?? "Inconnu",
          publishedDate: bnf.publishedDate ?? "",
          coverUrl: null,
          retailPrice: bnf.price,
          seriesNameOverride: bnf.seriesName ?? undefined,
          volumeNumberOverride: bnf.volumeNumber ?? undefined,
        });
      }
      return metadataResult;
    }

    const book = metadataResult.value;

    if (bnf) {
      // Enrich with BnF price if no price from Google Books
      if (!book.retailPrice && bnf.price) {
        book.retailPrice = {
          amount: bnf.price.amount,
          currency: bnf.price.currency,
        };
      }

      // Use BnF series info — much more reliable than title parsing
      if (bnf.seriesName) {
        book.seriesNameOverride = bnf.seriesName;
      }
      if (bnf.volumeNumber) {
        book.volumeNumberOverride = bnf.volumeNumber;
      }
    }

    return Result.ok(book);
  }

  private async fetchMetadata(isbn: string): Promise<Result<ComicBookCreateInput>> {
    const primaryResult = await this.primary.lookupByISBN(isbn);
    if (primaryResult.ok) return primaryResult;

    const fallbackResult = await this.fallback.lookupByISBN(isbn);
    if (fallbackResult.ok) return fallbackResult;

    return Result.fail(
      `Aucune donnée trouvée pour ISBN ${isbn}. ` +
        `Google Books : ${primaryResult.error}. ` +
        `Open Library : ${fallbackResult.error}.`,
    );
  }
}
