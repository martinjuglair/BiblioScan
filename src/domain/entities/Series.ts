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

    for (const book of books) {
      let key = book.seriesName;

      // Books with "Sans série" are grouped by publisher instead
      if (key === "Sans série") {
        key = book.publisher ? `${book.publisher} (hors série)` : "Sans série";
      }

      const existing = map.get(key) ?? [];
      existing.push(book);
      map.set(key, existing);
    }

    return Array.from(map.entries())
      .map(([name, seriesBooks]) => new Series(name, seriesBooks))
      .sort((a, b) => a.name.localeCompare(b.name, "fr"));
  }
}
