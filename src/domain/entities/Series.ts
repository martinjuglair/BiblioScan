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

  /** Group a flat list of books into Series */
  static groupFromBooks(books: ComicBook[]): Series[] {
    const map = new Map<string, ComicBook[]>();

    for (const book of books) {
      const existing = map.get(book.seriesName) ?? [];
      existing.push(book);
      map.set(book.seriesName, existing);
    }

    return Array.from(map.entries())
      .map(([name, seriesBooks]) => new Series(name, seriesBooks))
      .sort((a, b) => a.name.localeCompare(b.name, "fr"));
  }
}
