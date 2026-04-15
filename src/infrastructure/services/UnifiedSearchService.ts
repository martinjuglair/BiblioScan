import { Result } from "@domain/shared/Result";
import { GoogleBooksService, GoogleBooksSearchResult } from "./GoogleBooksService";
import { BnfSearchService, BnfSearchResult } from "./BnfSearchService";
import { BookLookupFacade } from "./BookLookupFacade";

// ─── Unified result type ─────────────────────────────────────────
export interface UnifiedSearchResult {
  source: "google" | "bnf" | "openlib";
  title: string;
  authors: string[];
  publisher: string;
  publishedDate: string;
  isbn: string | null;
  coverUrl: string | null;
  price: { amount: number; currency: string } | null;
  /** Relevance score (higher = better match) — computed post-search */
  score: number;
}

// ─── ISBN detection ──────────────────────────────────────────────
const ISBN13_REGEX = /^(97[89])[\s-]?\d[\s-]?\d{2}[\s-]?\d{5}[\s-]?\d$/;
const ISBN10_REGEX = /^\d{9}[\dXx]$/;

function looksLikeIsbn(query: string): string | null {
  const clean = query.replace(/[-\s]/g, "");
  if (ISBN13_REGEX.test(clean)) return clean;
  if (ISBN10_REGEX.test(clean)) return clean;
  // Also detect pure 13-digit or 10-digit numbers
  if (/^97[89]\d{10}$/.test(clean)) return clean;
  if (/^\d{10}$/.test(clean)) return clean;
  return null;
}

// ─── Text similarity scoring ─────────────────────────────────────
function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function titleSimilarity(query: string, title: string): number {
  const q = normalize(query);
  const t = normalize(title);
  if (t === q) return 100;
  if (t.includes(q) || q.includes(t)) return 80;

  // Word overlap score
  const qWords = new Set(q.split(" ").filter((w) => w.length > 1));
  const tWords = new Set(t.split(" ").filter((w) => w.length > 1));
  if (qWords.size === 0) return 0;
  let matches = 0;
  for (const w of qWords) {
    if (tWords.has(w)) matches++;
    else {
      // Partial match (prefix)
      for (const tw of tWords) {
        if (tw.startsWith(w) || w.startsWith(tw)) { matches += 0.5; break; }
      }
    }
  }
  return Math.round((matches / qWords.size) * 70);
}

function computeScore(query: string, result: UnifiedSearchResult): number {
  let score = titleSimilarity(query, result.title);
  // Bonus for having a cover
  if (result.coverUrl) score += 10;
  // Bonus for having an ISBN (more trustworthy)
  if (result.isbn) score += 5;
  // Bonus for having price
  if (result.price) score += 3;
  // Bonus for having authors
  if (result.authors.length > 0) score += 2;
  return score;
}

// ─── Cover helpers ───────────────────────────────────────────────
function isbn13to10(isbn13: string): string | null {
  const clean = isbn13.replace(/[-\s]/g, "");
  if (clean.length !== 13 || !clean.startsWith("978")) return null;
  const base = clean.slice(3, 12);
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(base[i]!, 10) * (10 - i);
  const remainder = (11 - (sum % 11)) % 11;
  return base + (remainder === 10 ? "X" : String(remainder));
}

function amazonCoverUrl(isbn: string): string | null {
  const clean = isbn.replace(/[-\s]/g, "");
  const isbn10 = clean.length === 13 ? isbn13to10(clean) : clean.length === 10 ? clean : null;
  if (!isbn10) return null;
  return `https://images-na.ssl-images-amazon.com/images/P/${isbn10}.01.MZZZZZZZ.jpg`;
}

function openLibraryCoverUrl(isbn: string): string {
  return `https://covers.openlibrary.org/b/isbn/${isbn.replace(/[-\s]/g, "")}-M.jpg`;
}

async function findCoverForIsbn(isbn: string): Promise<string | null> {
  const clean = isbn.replace(/[-\s]/g, "");
  // 1. Amazon
  const amzUrl = amazonCoverUrl(clean);
  if (amzUrl) {
    try {
      const res = await fetch(amzUrl, { method: "HEAD" });
      if (res.ok) {
        const cl = res.headers.get("content-length");
        if (cl && parseInt(cl, 10) > 1000) return amzUrl;
      }
    } catch {}
  }
  // 2. Open Library direct
  try {
    const olUrl = openLibraryCoverUrl(clean);
    const res = await fetch(olUrl, { method: "HEAD" });
    if (res.ok) {
      const cl = res.headers.get("content-length");
      if (cl && parseInt(cl, 10) > 500) return olUrl;
    }
  } catch {}
  // 3. OL Search API cover_i
  try {
    const res = await fetch(`https://openlibrary.org/search.json?isbn=${clean}&fields=cover_i&limit=1`);
    if (res.ok) {
      const data = await res.json();
      const coverId = data?.docs?.[0]?.cover_i;
      if (coverId && typeof coverId === "number") {
        return `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`;
      }
    }
  } catch {}
  return null;
}

// ─── Open Library title search (NEW) ─────────────────────────────
interface OLSearchDoc {
  title: string;
  author_name?: string[];
  publisher?: string[];
  first_publish_year?: number;
  isbn?: string[];
  cover_i?: number;
}

async function searchOpenLibrary(query: string): Promise<UnifiedSearchResult[]> {
  try {
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=8&fields=title,author_name,publisher,first_publish_year,isbn,cover_i&lang=fre`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    const docs: OLSearchDoc[] = data?.docs ?? [];
    return docs
      .filter((d) => d.title)
      .map((d) => {
        const isbn = d.isbn?.find((i) => /^97[89]\d{10}$/.test(i.replace(/[-\s]/g, ""))) ??
                     d.isbn?.[0] ?? null;
        const coverUrl = d.cover_i
          ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg`
          : null;
        return {
          source: "openlib" as const,
          title: d.title,
          authors: d.author_name ?? [],
          publisher: d.publisher?.[0] ?? "",
          publishedDate: d.first_publish_year ? String(d.first_publish_year) : "",
          isbn: isbn ? isbn.replace(/[-\s]/g, "") : null,
          coverUrl,
          price: null,
          score: 0,
        };
      });
  } catch {
    return [];
  }
}

// ─── BnF progressive relaxation (NEW) ───────────────────────────
async function searchBnfProgressive(
  bnfService: BnfSearchService,
  query: string,
): Promise<BnfSearchResult[]> {
  // Level 1: standard search (all words AND)
  const r1 = await bnfService.searchByTitle(query);
  if (r1.ok && r1.value.length >= 3) return r1.value;

  // Level 2: keep only the 3 most significant words (longest)
  const words = normalize(query).split(" ").filter((w) => w.length > 2);
  if (words.length > 3) {
    const top3 = words.sort((a, b) => b.length - a.length).slice(0, 3).join(" ");
    const r2 = await bnfService.searchByTitle(top3);
    if (r2.ok && r2.value.length > (r1.ok ? r1.value.length : 0)) {
      // Merge with level 1 results
      const all = [...(r1.ok ? r1.value : []), ...r2.value];
      return deduplicateBnf(all);
    }
  }

  // Level 3: title field specifically (first 2 significant words)
  if (words.length >= 2) {
    const titleWords = words.slice(0, 2).join(" ");
    try {
      const sruQuery = `bib.title all "${titleWords}"`;
      const url =
        `https://catalogue.bnf.fr/api/SRU?version=1.2&operation=searchRetrieve` +
        `&query=${encodeURIComponent(sruQuery)}` +
        `&recordSchema=unimarcXchange&maximumRecords=10`;
      const res = await fetch(url);
      if (res.ok) {
        // Reuse BnfSearchService's parser by doing a new search with relaxed query
        const r3 = await bnfService.searchByTitle(titleWords);
        if (r3.ok && r3.value.length > 0) {
          const all = [...(r1.ok ? r1.value : []), ...r3.value];
          return deduplicateBnf(all);
        }
      }
    } catch {}
  }

  return r1.ok ? r1.value : [];
}

function deduplicateBnf(results: BnfSearchResult[]): BnfSearchResult[] {
  const seen = new Set<string>();
  return results.filter((r) => {
    const key = r.isbn ?? `${r.title}|${r.publisher}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ═══ MAIN SERVICE ═══════════════════════════════════════════════

export class UnifiedSearchService {
  constructor(
    private googleBooks: GoogleBooksService,
    private bnfSearch: BnfSearchService,
    private lookupFacade: BookLookupFacade,
  ) {}

  /**
   * Smart search: detects ISBN vs. title, queries multiple sources in parallel,
   * deduplicates, scores by relevance, enriches covers in background.
   */
  async search(
    query: string,
    onUpdate?: (results: UnifiedSearchResult[]) => void,
  ): Promise<Result<UnifiedSearchResult[]>> {
    const trimmed = query.trim();
    if (!trimmed) return Result.ok([]);

    // ── 1. Smart ISBN detection ──
    const isbn = looksLikeIsbn(trimmed);
    if (isbn) {
      return this.searchByIsbn(isbn);
    }

    // ── 2. Multi-source parallel search ──
    const timeout = <T>(promise: Promise<T>, fallback: T, ms = 8000): Promise<T> =>
      Promise.race([promise, new Promise<T>((r) => setTimeout(() => r(fallback), ms))]);

    const [googleFR, googleALL, bnfResults, olResults] = await Promise.all([
      // Google with langRestrict=fr
      timeout(this.googleBooks.searchByTitle(trimmed), { ok: false as const, error: "timeout" }),
      // Google WITHOUT langRestrict (catches books not tagged as French)
      timeout(this.googleBooks.searchNoLang(trimmed), { ok: false as const, error: "timeout" }),
      // BnF with progressive relaxation
      timeout(searchBnfProgressive(this.bnfSearch, trimmed), []),
      // Open Library (NEW source)
      timeout(searchOpenLibrary(trimmed), []),
    ]);

    const unified: UnifiedSearchResult[] = [];

    // Google FR results
    if (googleFR.ok) {
      unified.push(...googleFR.value.map((r) => this.googleToUnified(r)));
    }

    // Google ALL results (no lang restrict)
    if (googleALL.ok) {
      unified.push(...googleALL.value.map((r) => this.googleToUnified(r)));
    }

    // BnF results
    unified.push(...bnfResults.map((r) => this.bnfToUnified(r)));

    // Open Library results
    unified.push(...olResults);

    // ── 3. Deduplicate by ISBN ──
    const deduped = this.deduplicateResults(unified);

    // ── 4. Score and sort by relevance ──
    for (const r of deduped) {
      r.score = computeScore(trimmed, r);
    }
    deduped.sort((a, b) => b.score - a.score);

    // ── 5. Background cover enrichment ──
    if (onUpdate) {
      this.enrichCoversAsync(deduped, () => onUpdate([...deduped]));
    }

    return Result.ok(deduped);
  }

  /** Direct ISBN lookup — returns as a search result list for consistency */
  private async searchByIsbn(isbn: string): Promise<Result<UnifiedSearchResult[]>> {
    const result = await this.lookupFacade.lookupByISBN(isbn);
    if (!result.ok) return Result.ok([]);
    const d = result.value;
    return Result.ok([{
      source: "google" as const,
      title: d.title,
      authors: d.authors,
      publisher: d.publisher ?? "",
      publishedDate: d.publishedDate ?? "",
      isbn: d.isbn,
      coverUrl: d.coverUrl ?? null,
      price: d.retailPrice ? { amount: d.retailPrice.amount, currency: d.retailPrice.currency ?? "EUR" } : null,
      score: 100,
    }]);
  }

  private googleToUnified(r: GoogleBooksSearchResult): UnifiedSearchResult {
    return {
      source: "google",
      title: r.title,
      authors: r.authors,
      publisher: r.publisher,
      publishedDate: r.publishedDate,
      isbn: r.isbn,
      coverUrl: r.coverUrl,
      price: r.retailPrice,
      score: 0,
    };
  }

  private bnfToUnified(r: BnfSearchResult): UnifiedSearchResult {
    return {
      source: "bnf",
      title: r.title,
      authors: r.authors,
      publisher: r.publisher,
      publishedDate: r.publishedDate,
      isbn: r.isbn,
      coverUrl: null,
      price: r.price,
      score: 0,
    };
  }

  private deduplicateResults(results: UnifiedSearchResult[]): UnifiedSearchResult[] {
    const seen = new Map<string, UnifiedSearchResult>();
    const output: UnifiedSearchResult[] = [];

    for (const r of results) {
      if (r.isbn) {
        const cleanIsbn = r.isbn.replace(/[-\s]/g, "");
        const existing = seen.get(cleanIsbn);
        if (existing) {
          // Merge best data into existing
          if (!existing.coverUrl && r.coverUrl) existing.coverUrl = r.coverUrl;
          if (!existing.price && r.price) existing.price = r.price;
          if (existing.authors.length === 0 && r.authors.length > 0) existing.authors = r.authors;
          if (!existing.publisher && r.publisher) existing.publisher = r.publisher;
          continue;
        }
        seen.set(cleanIsbn, r);
      }
      output.push(r);
    }

    return output;
  }

  private async enrichCoversAsync(
    results: UnifiedSearchResult[],
    onUpdate: () => void,
  ): Promise<void> {
    const toEnrich = results.filter((r) => r.isbn && !r.coverUrl);
    if (toEnrich.length === 0) return;

    let changed = false;
    await Promise.allSettled(
      toEnrich.map(async (r) => {
        const cover = await findCoverForIsbn(r.isbn!);
        if (cover) {
          r.coverUrl = cover;
          changed = true;
        }
      }),
    );
    if (changed) onUpdate();
  }
}
