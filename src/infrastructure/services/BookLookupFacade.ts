import { ComicBookCreateInput } from "@domain/entities/ComicBook";
import { IBookLookupService } from "@domain/services/IBookLookupService";
import { Result } from "@domain/shared/Result";
import { BnfService } from "./BnfPriceService";

/**
 * Open Library Cover API — direct URL that returns an image.
 * Returns a 1x1 pixel if no cover exists for that ISBN.
 */
function openLibraryCoverUrl(isbn: string, size: "S" | "M" | "L" = "L"): string {
  return `https://covers.openlibrary.org/b/isbn/${isbn.replace(/[-\s]/g, "")}-${size}.jpg`;
}

/**
 * Validate an Open Library cover URL by fetching a small range of bytes.
 * The 1x1 pixel placeholder is ~43 bytes. A real JPEG cover starts with FF D8.
 *
 * We use a GET with Range header instead of HEAD, because OL doesn't always
 * return content-length on HEAD responses.
 */
async function validateOpenLibraryCover(isbn: string): Promise<string | null> {
  try {
    const url = openLibraryCoverUrl(isbn, "L");

    // Try HEAD first (cheapest)
    const headRes = await fetch(url, { method: "HEAD" });
    if (!headRes.ok) return null;

    const contentLength = headRes.headers.get("content-length");
    if (contentLength) {
      // If we have content-length, use it
      return parseInt(contentLength, 10) > 500 ? url : null;
    }

    // No content-length — fetch first 200 bytes to check if it's a real image
    const rangeRes = await fetch(url, {
      headers: { Range: "bytes=0-199" },
    });

    if (!rangeRes.ok && rangeRes.status !== 206) return null;

    const buffer = await rangeRes.arrayBuffer();
    // A real JPEG starts with FF D8 FF and is bigger than a tiny placeholder
    if (buffer.byteLength > 100) {
      const bytes = new Uint8Array(buffer);
      if (bytes[0] === 0xFF && bytes[1] === 0xD8) {
        return url;
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Try to find a cover from the Open Library Search API using the cover_i field.
 * This works when the ISBN-based cover URL fails but OL has the cover indexed differently.
 */
async function searchOpenLibraryCover(isbn: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://openlibrary.org/search.json?isbn=${isbn.replace(/[-\s]/g, "")}&fields=cover_i&limit=1`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const coverId = data?.docs?.[0]?.cover_i;
    if (coverId && typeof coverId === "number") {
      return `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Try a direct Google Books cover URL using the volumeId.
 * This endpoint is reliable and doesn't count as API quota.
 */
async function googleBooksCoverById(volumeId: string): Promise<string | null> {
  try {
    const url = `https://books.google.com/books/content?id=${volumeId}&printsec=frontcover&img=1&zoom=2&source=gbs_api`;
    const res = await fetch(url, { method: "HEAD" });
    if (!res.ok) return null;
    // Google returns a tiny 1x1 gif if no cover — check content-type
    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes("image/gif")) return null; // placeholder
    return url;
  } catch {
    return null;
  }
}

/** Tries Google Books first, falls back to Open Library, then BnF. Enriches with cover fallbacks. */
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

    // Fallback 1: Google Books direct cover by volumeId (no quota)
    if (!book.coverUrl) {
      book.coverUrl = await this.tryGoogleCoverFallback(isbn);
    }

    // Fallback 2: Open Library direct Cover API (validated)
    if (!book.coverUrl) {
      book.coverUrl = await validateOpenLibraryCover(isbn);
    }

    // Fallback 3: Open Library Search API cover_i field
    if (!book.coverUrl) {
      book.coverUrl = await searchOpenLibraryCover(isbn);
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

  /**
   * Quick Google Books search to grab a volumeId for direct cover URL.
   * The direct cover endpoint doesn't count toward API quota.
   */
  private async tryGoogleCoverFallback(isbn: string): Promise<string | null> {
    try {
      const res = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&fields=items/id&maxResults=1`
      );
      if (!res.ok) return null;
      const data = await res.json();
      const volumeId = data?.items?.[0]?.id;
      if (!volumeId) return null;
      return googleBooksCoverById(volumeId);
    } catch {
      return null;
    }
  }
}
