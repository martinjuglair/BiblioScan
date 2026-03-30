import { describe, it, expect, vi, beforeEach } from "vitest";
import { ScanComicBook } from "@application/use-cases/ScanComicBook";
import { IBookLookupService } from "@domain/services/IBookLookupService";
import { IComicBookRepository } from "@domain/repositories/IComicBookRepository";
import { ComicBookCreateInput } from "@domain/entities/ComicBook";
import { Result } from "@domain/shared/Result";

const mockInput: ComicBookCreateInput = {
  isbn: "9782205250015",
  title: "Astérix - Tome 5",
  authors: ["René Goscinny"],
  publisher: "Dargaud",
  publishedDate: "1965",
  coverUrl: null,
  retailPrice: { amount: 12.5 },
};

function createMocks() {
  const lookupService: IBookLookupService = {
    lookupByISBN: vi.fn(),
  };
  const repository: IComicBookRepository = {
    save: vi.fn().mockResolvedValue(Result.ok(undefined)),
    findByISBN: vi.fn().mockResolvedValue(Result.ok(null)),
    findByTitle: vi.fn().mockResolvedValue(Result.ok(null)),
    findAll: vi.fn().mockResolvedValue(Result.ok([])),
    update: vi.fn().mockResolvedValue(Result.ok(undefined)),
    delete: vi.fn().mockResolvedValue(Result.ok(undefined)),
  };
  return { lookupService, repository };
}

describe("ScanComicBook", () => {
  let mocks: ReturnType<typeof createMocks>;
  let useCase: ScanComicBook;

  beforeEach(() => {
    mocks = createMocks();
    useCase = new ScanComicBook(mocks.lookupService, mocks.repository);
  });

  describe("lookup", () => {
    it("should return book data on successful lookup", async () => {
      vi.mocked(mocks.lookupService.lookupByISBN).mockResolvedValue(
        Result.ok(mockInput),
      );

      const result = await useCase.lookup("9782205250015");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.title).toBe("Astérix - Tome 5");
      }
    });

    it("should propagate lookup errors", async () => {
      vi.mocked(mocks.lookupService.lookupByISBN).mockResolvedValue(
        Result.fail("API error"),
      );

      const result = await useCase.lookup("9782205250015");
      expect(result.ok).toBe(false);
    });
  });

  describe("confirm", () => {
    it("should save a new book", async () => {
      const result = await useCase.confirm(mockInput);
      expect(result.ok).toBe(true);
      expect(mocks.repository.save).toHaveBeenCalledOnce();
    });

    it("should reject duplicate ISBN", async () => {
      vi.mocked(mocks.repository.findByISBN).mockResolvedValue(
        Result.ok({
          isbn: "9782205250015",
          title: "existing",
        } as never),
      );

      const result = await useCase.confirm(mockInput);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("déjà dans votre collection");
      }
    });

    it("should reject invalid data", async () => {
      const result = await useCase.confirm({ ...mockInput, isbn: "invalid" });
      expect(result.ok).toBe(false);
    });
  });
});
