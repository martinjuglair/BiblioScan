import { ComicBook } from "./ComicBook";

export class Series {
  constructor(
    public readonly name: string,
    public readonly books: ComicBook[],
  ) {}

  get count(): number {
    return this.books.length;
  }

  get coverUrl(): string | null {
    const sorted = this.sortedBooks;
    return sorted[0]?.coverUrl ?? null;
  }

  get sortedBooks(): ComicBook[] {
    return [...this.books].sort((a, b) => {
      if (a.volumeNumber !== null && b.volumeNumber !== null) {
        return a.volumeNumber - b.volumeNumber;
      }
      if (a.volumeNumber !== null) return -1;
      if (b.volumeNumber !== null) return 1;
      return a.title.localeCompare(b.title);
    });
  }

  /** True if at least one book has an explicit volume number */
  get isNumberedSeries(): boolean {
    return this.books.some((b) => b.volumeNumber !== null);
  }

  /** Detect gaps in volume numbering (e.g. has 1,2,4 → missing 3) */
  get missingVolumes(): number[] {
    const volumes = this.books
      .map((b) => b.volumeNumber)
      .filter((v): v is number => v !== null)
      .sort((a, b) => a - b);

    if (volumes.length < 2) return [];

    const missing: number[] = [];
    for (let i = volumes[0]!; i < volumes[volumes.length - 1]!; i++) {
      if (!volumes.includes(i)) missing.push(i);
    }
    return missing;
  }

  /** Group a flat list of books into Series */
  static groupFromBooks(books: ComicBook[]): Series[] {
    const map = new Map<string, ComicBook[]>();
    const ungrouped: ComicBook[] = [];

    for (const book of books) {
      const hasExplicitSeries =
        book.seriesName !== "Sans série" && book.seriesName !== book.title;

      if (hasExplicitSeries) {
        // Book has a real series name from SeriesDetector (e.g. "Astérix")
        const existing = map.get(book.seriesName) ?? [];
        existing.push(book);
        map.set(book.seriesName, existing);
      } else {
        // No explicit series — candidate for prefix detection
        ungrouped.push(book);
      }
    }

    // Second pass: detect common title prefixes among ungrouped books
    const prefixGroups = Series.detectCommonPrefixes(ungrouped);
    const assigned = new Set<ComicBook>();

    for (const [prefix, grouped] of prefixGroups) {
      const existing = map.get(prefix) ?? [];
      existing.push(...grouped);
      map.set(prefix, existing);
      for (const b of grouped) assigned.add(b);
    }

    // Remaining ungrouped books → by publisher
    for (const book of ungrouped) {
      if (assigned.has(book)) continue;
      const key = book.publisher ? `${book.publisher} (hors série)` : "Sans série";
      const existing = map.get(key) ?? [];
      existing.push(book);
      map.set(key, existing);
    }

    return Array.from(map.entries())
      .map(([name, seriesBooks]) => new Series(name, seriesBooks))
      .sort((a, b) => a.name.localeCompare(b.name, "fr"));
  }

  /**
   * Find common title prefixes among a list of books.
   * E.g. "Harry Potter à l'école des sorciers" + "Harry Potter et le prisonnier d'Azkaban"
   *    → prefix "Harry Potter" groups both books.
   */
  private static detectCommonPrefixes(
    books: ComicBook[],
  ): Map<string, ComicBook[]> {
    const MIN_PREFIX_WORDS = 2;
    const MIN_PREFIX_LENGTH = 6;

    // Build index: prefix → list of books with that prefix
    const prefixIndex = new Map<string, ComicBook[]>();
    for (const book of books) {
      const words = book.title.split(/\s+/);
      for (let len = MIN_PREFIX_WORDS; len <= words.length - 1; len++) {
        const prefix = words.slice(0, len).join(" ");
        if (prefix.length < MIN_PREFIX_LENGTH) continue;
        const list = prefixIndex.get(prefix) ?? [];
        list.push(book);
        prefixIndex.set(prefix, list);
      }
    }

    // Keep only prefixes shared by ≥2 books, prefer longest prefix
    const candidates = [...prefixIndex.entries()]
      .filter(([, group]) => group.length >= 2)
      .sort((a, b) => b[0].length - a[0].length); // longest first

    const result = new Map<string, ComicBook[]>();
    const assigned = new Set<ComicBook>();

    for (const [prefix, group] of candidates) {
      const unassigned = group.filter((b) => !assigned.has(b));
      if (unassigned.length >= 2) {
        result.set(prefix, unassigned);
        for (const b of unassigned) assigned.add(b);
      }
    }

    return result;
  }
}
