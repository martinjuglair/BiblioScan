import { ComicBook, ComicBookCreateInput } from "@domain/entities/ComicBook";
import { IComicBookRepository } from "@domain/repositories/IComicBookRepository";
import { IBookLookupService } from "@domain/services/IBookLookupService";
import { Result } from "@domain/shared/Result";

export class ScanComicBook {
  constructor(
    private readonly lookupService: IBookLookupService,
    private readonly repository: IComicBookRepository,
  ) {}

  /** Look up ISBN data — does NOT save yet (user must confirm) */
  async lookup(isbn: string): Promise<Result<ComicBookCreateInput>> {
    return this.lookupService.lookupByISBN(isbn);
  }

  /** Save a confirmed comic book to the collection */
  async confirm(input: ComicBookCreateInput): Promise<Result<ComicBook>> {
    // Check duplicates by ISBN
    const existing = await this.repository.findByISBN(input.isbn);
    if (existing.ok && existing.value !== null) {
      return Result.fail("Ce livre est déjà dans ta bibliothèque");
    }

    // For books without real ISBN, also check by exact title match
    if (input.isbn.startsWith("NOISBN")) {
      const byTitle = await this.repository.findByTitle(input.title);
      if (byTitle.ok && byTitle.value !== null) {
        return Result.fail(`Un livre avec le titre "${input.title}" existe déjà dans ta bibliothèque`);
      }
    }

    const bookResult = ComicBook.create(input);
    if (!bookResult.ok) return bookResult;

    const saveResult = await this.repository.save(bookResult.value);
    if (!saveResult.ok) return Result.fail(saveResult.error);

    return bookResult;
  }
}
