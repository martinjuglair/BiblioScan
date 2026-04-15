import { ComicBookCreateInput } from "@domain/entities/ComicBook";
import { IBookLookupService } from "@domain/services/IBookLookupService";
import { Result } from "@domain/shared/Result";
import { GoogleBooksVolumeSchema } from "./schemas";
import { GoogleBooksCacheService, TTL_SEARCH_MS, TTL_ISBN_MS } from "./GoogleBooksCacheService";
import { z } from "zod";

const GOOGLE_BOOKS_API = "https://www.googleapis.com/books/v1/volumes";
const API_KEY = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY as string | undefined;
const keyParam = API_KEY ? `&key=${API_KEY}` : "";

/**
 * Upgrade Google Books cover thumbnail URL to higher quality.
 * Default zoom=1 gives ~128px wide. zoom=2 gives ~300px, zoom=3 gives ~400px.
 * Also removes edge=curl effect.
 */
function upgradeCoverUrl(url: string | null): string | null {
  if (!url) return null;
  let upgraded = url.replace(/&zoom=\d/, "&zoom=2");
  if (!upgraded.includes("zoom=")) upgraded += "&zoom=2";
  upgraded = upgraded.replace(/&edge=curl/, "");
  return upgraded;
}

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

/** Schema for the minimal volumeId lookup */
const VolumeIdSchema = z.object({
  items: z
    .array(z.object({ id: z.string() }))
    .optional()
    .default([]),
});

export interface GoogleBooksSearchResult {
  title: string;
  authors: string[];
  publisher: string;
  publishedDate: string;
  coverUrl: string | null;
  isbn: string | null;
  retailPrice: { amount: number; currency: string } | null;
  description?: string;
  categories?: string[];
  averageRating?: number;
  ratingsCount?: number;
}

export class GoogleBooksService implements IBookLookupService {
  /** Serialize all requests to avoid 429 rate limiting */
  private queue: Promise<unknown> = Promise.resolve();
  private lastRequestTime = 0;
  private static readonly MIN_DELAY_MS = 500;

  constructor(private readonly cache?: GoogleBooksCacheService) {}

  private async throttle(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < GoogleBooksService.MIN_DELAY_MS) {
      await new Promise((r) => setTimeout(r, GoogleBooksService.MIN_DELAY_MS - elapsed));
    }
    this.lastRequestTime = Date.now();
  }

  private enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const task = this.queue.then(() => this.throttle()).then(fn);
    this.queue = task.catch(() => {});
    return task;
  }

  // ── Public API ───────────────────────────────────────────────────

  /**
   * Full-text search by title/author keywords (langRestrict=fr).
   * Google Books has excellent fuzzy matching — handles typos, partial names, accent variations.
   */
  async searchByTitle(query: string): Promise<Result<GoogleBooksSearchResult[]>> {
    const cacheKey = GoogleBooksCacheService.normalizeKey("search", query);
    return this.cachedSearch(cacheKey, TTL_SEARCH_MS, () => {
      const url = `${GOOGLE_BOOKS_API}?q=${encodeURIComponent(query)}&langRestrict=fr&maxResults=12&country=FR&orderBy=relevance${keyParam}`;
      return this.enqueue(() => this.fetchAndParse(url));
    });
  }

  /**
   * Full-text search WITHOUT langRestrict — catches French books mistagged in other languages.
   * Used by UnifiedSearchService as a complementary source.
   */
  async searchNoLang(query: string): Promise<Result<GoogleBooksSearchResult[]>> {
    const cacheKey = GoogleBooksCacheService.normalizeKey("search-nolang", query);
    return this.cachedSearch(cacheKey, TTL_SEARCH_MS, () => {
      const url = `${GOOGLE_BOOKS_API}?q=${encodeURIComponent(query)}&maxResults=8&country=FR&orderBy=relevance${keyParam}`;
      return this.enqueue(() => this.fetchAndParse(url));
    });
  }

  async lookupByISBN(isbn: string): Promise<Result<ComicBookCreateInput>> {
    return this.enqueue(() => this._lookupByISBN(isbn));
  }

  /**
   * Lookup a Google Books volumeId by ISBN — used for direct cover URL construction.
   * The cover endpoint itself (books.google.com/books/content) doesn't count toward API quota.
   */
  async lookupVolumeId(isbn: string): Promise<string | null> {
    const cacheKey = GoogleBooksCacheService.normalizeKey("volumeid", isbn);

    // Check cache
    if (this.cache) {
      const cached = await this.cache.get(cacheKey, TTL_ISBN_MS);
      if (cached && typeof cached === "object" && cached !== null) {
        const parsed = VolumeIdSchema.safeParse(cached);
        if (parsed.success && parsed.data.items.length > 0) {
          return parsed.data.items[0]!.id;
        }
      }
    }

    return this.enqueue(async () => {
      try {
        const url = `${GOOGLE_BOOKS_API}?q=isbn:${isbn}&fields=items/id&maxResults=1${keyParam}`;
        const response = await fetch(url);
        if (!response.ok) return null;

        const raw: unknown = await response.json();

        // Store in cache
        if (this.cache) {
          this.cache.set(cacheKey, raw);
        }

        const parsed = VolumeIdSchema.safeParse(raw);
        if (!parsed.success || parsed.data.items.length === 0) return null;
        return parsed.data.items[0]!.id;
      } catch {
        return null;
      }
    });
  }

  // ── Private helpers ──────────────────────────────────────────────

  /**
   * Generic cached search: check cache → call fetcher → store in cache.
   * The fetcher already goes through enqueue() for throttling.
   */
  private async cachedSearch(
    cacheKey: string,
    ttl: number,
    fetcher: () => Promise<Result<GoogleBooksSearchResult[]>>,
  ): Promise<Result<GoogleBooksSearchResult[]>> {
    // 1. Check cache
    if (this.cache) {
      const cached = await this.cache.get(cacheKey, ttl);
      if (cached) {
        const parsed = GoogleBooksVolumeSchema.safeParse(cached);
        if (parsed.success) {
          const data = parsed.data;
          if (data.totalItems === 0 || data.items.length === 0) return Result.ok([]);
          return Result.ok(this.mapSearchResults(data));
        }
      }
    }

    // 2. Fetch from API
    return fetcher();
  }

  /** Fetch URL, parse with Zod, cache raw response, and map to search results */
  private async fetchAndParse(url: string): Promise<Result<GoogleBooksSearchResult[]>> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        return Result.fail(`Google Books API erreur HTTP ${response.status}`);
      }

      const raw: unknown = await response.json();

      // Store raw response in cache (extract key from URL)
      if (this.cache) {
        const cacheKey = this.urlToCacheKey(url);
        if (cacheKey) this.cache.set(cacheKey, raw);
      }

      const parsed = GoogleBooksVolumeSchema.safeParse(raw);
      if (!parsed.success) {
        return Result.fail(`Réponse Google Books invalide`);
      }

      const data = parsed.data;
      if (data.totalItems === 0 || data.items.length === 0) {
        return Result.ok([]);
      }

      return Result.ok(this.mapSearchResults(data));
    } catch {
      return Result.fail("Impossible de contacter Google Books API");
    }
  }

  /** Extract cache key from a search URL */
  private urlToCacheKey(url: string): string | null {
    try {
      const u = new URL(url);
      const q = u.searchParams.get("q");
      if (!q) return null;
      const hasLang = u.searchParams.has("langRestrict");
      const prefix = hasLang ? "search" : "search-nolang";
      return GoogleBooksCacheService.normalizeKey(prefix, q);
    } catch {
      return null;
    }
  }

  /** Map parsed Google Books volume data to GoogleBooksSearchResult[] */
  private mapSearchResults(
    data: z.infer<typeof GoogleBooksVolumeSchema>,
  ): GoogleBooksSearchResult[] {
    return data.items.map((item) => {
      const info = item.volumeInfo;
      const sale = item.saleInfo;

      const coverUrl = upgradeCoverUrl(
        info.imageLinks?.thumbnail?.replace("http://", "https://") ??
          info.imageLinks?.smallThumbnail?.replace("http://", "https://") ??
          null,
      );

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
        description: info.description,
        categories: info.categories,
        averageRating: info.averageRating,
        ratingsCount: info.ratingsCount,
      };
    });
  }

  private async _lookupByISBN(isbn: string): Promise<Result<ComicBookCreateInput>> {
    const cacheKey = GoogleBooksCacheService.normalizeKey("isbn", isbn);

    try {
      // 1. Check cache
      if (this.cache) {
        const cached = await this.cache.get(cacheKey, TTL_ISBN_MS);
        if (cached) {
          const parsed = GoogleBooksVolumeSchema.safeParse(cached);
          if (parsed.success && parsed.data.items.length > 0) {
            return this.mapIsbnResult(isbn, parsed.data);
          }
        }
      }

      // 2. Fetch from API
      const response = await fetch(`${GOOGLE_BOOKS_API}?q=isbn:${isbn}&country=FR${keyParam}`);

      if (!response.ok) {
        return Result.fail(`Google Books API erreur HTTP ${response.status}`);
      }

      const raw: unknown = await response.json();

      // 3. Store in cache
      if (this.cache) {
        this.cache.set(cacheKey, raw);
      }

      const parsed = GoogleBooksVolumeSchema.safeParse(raw);

      if (!parsed.success) {
        return Result.fail(`Réponse Google Books invalide : ${parsed.error.message}`);
      }

      const data = parsed.data;
      if (data.totalItems === 0 || data.items.length === 0) {
        return Result.fail("Aucun résultat Google Books pour cet ISBN");
      }

      return this.mapIsbnResult(isbn, data);
    } catch {
      return Result.fail("Impossible de contacter Google Books API");
    }
  }

  /** Map ISBN lookup result to ComicBookCreateInput */
  private async mapIsbnResult(
    isbn: string,
    data: z.infer<typeof GoogleBooksVolumeSchema>,
  ): Promise<Result<ComicBookCreateInput>> {
    const item = data.items[0]!;
    const info = item.volumeInfo;
    let sale = item.saleInfo;

    const coverUrl = upgradeCoverUrl(
      info.imageLinks?.thumbnail?.replace("http://", "https://") ??
        info.imageLinks?.smallThumbnail?.replace("http://", "https://") ??
        null,
    );

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
  }

  /** Fetch price from direct volume endpoint (sometimes has prices the search doesn't) */
  private async fetchVolumePrice(
    volumeId: string,
  ): Promise<z.infer<typeof SingleVolumeSchema>["saleInfo"] | null> {
    const cacheKey = GoogleBooksCacheService.normalizeKey("volume", volumeId);

    try {
      // Check cache
      if (this.cache) {
        const cached = await this.cache.get(cacheKey, TTL_ISBN_MS);
        if (cached) {
          const parsed = SingleVolumeSchema.safeParse(cached);
          if (parsed.success) {
            const sale = parsed.data.saleInfo;
            if (sale?.listPrice || sale?.retailPrice) return sale;
          }
        }
      }

      const response = await fetch(`${GOOGLE_BOOKS_API}/${volumeId}?country=FR${keyParam}`);
      if (!response.ok) return null;

      const raw: unknown = await response.json();

      // Store in cache
      if (this.cache) {
        this.cache.set(cacheKey, raw);
      }

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
