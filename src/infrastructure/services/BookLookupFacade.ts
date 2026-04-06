import { ComicBookCreateInput } from "@domain/entities/ComicBook";
import { IBookLookupService } from "@domain/services/IBookLookupService";
import { Result } from "@domain/shared/Result";
import { BnfService } from "./BnfPriceService";

/**
 * Open Library Cover API — direct URL that returns an image (no API call needed).
 * Returns a 1x1 pixel if no cover exists, but still a valid URL for <img>.
 * We validate it with a HEAD request to confirm a real cover exists.
 */
function openLibraryCoverUrl(isbn: string, size: "S" | "M" | "L" = "L"): string {
  return `https://covers.openlibrary.org/b/isbn/${isbn.replace(/[-\s]/g, "")}-${size}.jpg`;
}

/**
 * Check if an Open Library direct cover URL actually has a cover
 * (returns a 1x1 transparent pixel when no cover exists).
 * We do a HEAD request and check content-length > 1000 bytes.
 */
async function validateOpenLibraryCover(isbn: string): Promise<string | null> {
  try {
    const url = openLibraryCoverUrl(isbn, "L");
    const response = await fetch(url, { method: "HEAD" });
    if (!response.ok) return null;

    const contentLength = response.headers.get("content-length");
    // The 1x1 pixel placeholder is ~43 bytes; a real cover is typically > 1KB
    if (contentLength && parseInt(contentLength, 10) > 1000) {
      return url;
    }
    return null;
  } catch {
    return null;
  }
}

/** Tries Google Books first, falls back to Open Library, then BnF. Enriches with BnF data and cover fallbacks. */
export class BookLookupFacade implements IBookLookupService {
  private readonly bnfService = new BnfService();

  constructor(
    private readonly primary: IBookLookupService,   // Google Books
    private readonly fallback: IBookLookupService,   // Open Library
  ) {}

  async lookupByISBN(isbn: string): Promise<Result<ComicBookCreateInput>> {
    // Fetch ALL sources in parallel for maximum data
    const [primaryResult, fallbackResult, bnfResult] = await Promise.all([
      this.primary.lookupByISBN(isbn),
      this.fallback.lookupByISBN(isbn),
      this.bnfService.fetchBookData(isbn),
    ]);

    const bnf = bnfResult.ok ? bnfResult.value : null;

    // Pick the best metadata source (Google > Open Library > BnF)
    let book: ComicBookCreateInput;
    if (primaryResult.ok) {
      book = primaryResult.value;
    } else if (fallbackResult.ok) {
      book = fallbackResult.value;
    } else if (bnf?.title) {
      book = {
        isbn,
        title: bnf.title,
        authors: bnf.authors,
        publisher: bnf.publisher ?? "Inconnu",
        publishedDate: bnf.publishedDate ?? "",
        coverUrl: null,
        retailPrice: bnf.price,
      };
    } else {
      return Result.fail(
        `Aucune donnée trouvée pour ISBN ${isbn}. ` +
          `Google Books : ${primaryResult.error}. ` +
          `Open Library : ${fallbackResult.error}.`,
      );
    }

    // --- Enrich: cover fallback chain ---
    if (!book.coverUrl) {
      // Try cover from the other metadata source
      if (primaryResult.ok && primaryResult.value.coverUrl) {
        book.coverUrl = primaryResult.value.coverUrl;
      } else if (fallbackResult.ok && fallbackResult.value.coverUrl) {
        book.coverUrl = fallbackResult.value.coverUrl;
      }
    }

    // Last resort: Open Library direct Cover API (HEAD check)
    if (!book.coverUrl) {
      book.coverUrl = await validateOpenLibraryCover(isbn);
    }

    // --- Enrich: price from BnF ---
    if (!book.retailPrice && bnf?.price) {
      book.retailPrice = {
        amount: bnf.price.amount,
        currency: bnf.price.currency,
      };
    }

    // --- Enrich: fill missing metadata from other sources ---
    if (bnf) {
      if ((!book.authors || book.authors.length === 0) && bnf.authors.length > 0) {
        book.authors = bnf.authors;
      }
      if ((!book.publisher || book.publisher === "Inconnu") && bnf.publisher) {
        book.publisher = bnf.publisher;
      }
      if (!book.publishedDate && bnf.publishedDate) {
        book.publishedDate = bnf.publishedDate;
      }
    }

    // Cross-enrich from Open Library if Google Books was primary
    if (primaryResult.ok && fallbackResult.ok) {
      const olData = fallbackResult.value;
      if ((!book.authors || book.authors.length === 0) && olData.authors.length > 0) {
        book.authors = olData.authors;
      }
      if ((!book.publisher || book.publisher === "Inconnu") && olData.publisher) {
        book.publisher = olData.publisher;
      }
    }

    return Result.ok(book);
  }
}
