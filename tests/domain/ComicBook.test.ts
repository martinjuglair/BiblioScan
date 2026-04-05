import { describe, it, expect } from "vitest";
import { ComicBook } from "@domain/entities/ComicBook";

describe("ComicBook", () => {
  const validInput = {
    isbn: "9782205250015",
    title: "Astérix - Tome 5",
    authors: ["René Goscinny", "Albert Uderzo"],
    publisher: "Dargaud",
    publishedDate: "1965-01-01",
    coverUrl: "https://example.com/cover.jpg",
    retailPrice: { amount: 12.5, currency: "EUR" },
  };

  it("should create a valid comic book", () => {
    const result = ComicBook.create(validInput);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.title).toBe("Astérix - Tome 5");
      expect(result.value.isbn).toBe("9782205250015");
    }
  });

  it("should assign categoryId when provided", () => {
    const result = ComicBook.create({
      ...validInput,
      categoryId: "cat-123",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.categoryId).toBe("cat-123");
    }
  });

  it("should default categoryId to null", () => {
    const result = ComicBook.create(validInput);
    if (result.ok) {
      expect(result.value.categoryId).toBeNull();
    }
  });

  it("should fail with invalid ISBN", () => {
    const result = ComicBook.create({ ...validInput, isbn: "invalid" });
    expect(result.ok).toBe(false);
  });

  it("should fail with negative price", () => {
    const result = ComicBook.create({
      ...validInput,
      retailPrice: { amount: -5 },
    });
    expect(result.ok).toBe(false);
  });

  it("should handle null prices", () => {
    const result = ComicBook.create({
      ...validInput,
      retailPrice: null,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.retailPrice).toBeNull();
    }
  });

  it("should serialize to persistence format", () => {
    const result = ComicBook.create(validInput);
    if (result.ok) {
      const record = result.value.toPersistence();
      expect(record.isbn).toBe("9782205250015");
      expect(record.retailPrice).toEqual({ amount: 12.5, currency: "EUR" });
      expect(typeof record.addedAt).toBe("string");
    }
  });

  it("should update with withUpdates immutably", () => {
    const result = ComicBook.create(validInput);
    if (result.ok) {
      const updated = result.value.withUpdates({ categoryId: "cat-456" });
      expect(updated.categoryId).toBe("cat-456");
      expect(result.value.categoryId).toBeNull();
    }
  });
});
