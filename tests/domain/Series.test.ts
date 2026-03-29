import { describe, it, expect } from "vitest";
import { ComicBook } from "@domain/entities/ComicBook";
import { Series } from "@domain/entities/Series";

function makeBook(title: string, isbn: string) {
  const result = ComicBook.create({
    isbn,
    title,
    authors: ["Test Author"],
    publisher: "Test",
    publishedDate: "2024",
    coverUrl: null,
    retailPrice: null,
  });
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

describe("Series", () => {
  it("should group books by series name", () => {
    const books = [
      makeBook("Astérix - Tome 1", "9782012101333"),
      makeBook("Astérix - Tome 2", "9782012101340"),
      makeBook("Tintin - Tome 1", "9782203001015"),
    ];

    const series = Series.groupFromBooks(books);
    expect(series).toHaveLength(2);

    const asterix = series.find((s) => s.name === "Astérix");
    expect(asterix?.count).toBe(2);

    const tintin = series.find((s) => s.name === "Tintin");
    expect(tintin?.count).toBe(1);
  });

  it("should sort books by volume number within series", () => {
    const books = [
      makeBook("Astérix - Tome 5", "9782205250015"),
      makeBook("Astérix - Tome 1", "9782012101333"),
      makeBook("Astérix - Tome 3", "9782012101357"),
    ];

    const series = Series.groupFromBooks(books);
    const asterix = series.find((s) => s.name === "Astérix");
    const sorted = asterix?.sortedBooks ?? [];
    expect(sorted[0]?.volumeNumber).toBe(1);
    expect(sorted[1]?.volumeNumber).toBe(3);
    expect(sorted[2]?.volumeNumber).toBe(5);
  });

  it("should sort series alphabetically", () => {
    const books = [
      makeBook("Tintin - Tome 1", "9782203001015"),
      makeBook("Astérix - Tome 1", "9782012101333"),
    ];

    const series = Series.groupFromBooks(books);
    expect(series[0]?.name).toBe("Astérix");
    expect(series[1]?.name).toBe("Tintin");
  });

  it("should use first book cover as series cover", () => {
    const series = new Series("Test", [
      makeBook("Test - Tome 1", "9782012101333"),
    ]);
    expect(series.coverUrl).toBeNull();
  });
});
