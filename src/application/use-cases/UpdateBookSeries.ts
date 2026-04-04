import { ComicBook } from "@domain/entities/ComicBook";
import { IComicBookRepository } from "@domain/repositories/IComicBookRepository";
import { Result } from "@domain/shared/Result";

export class UpdateBookSeries {
  constructor(private readonly repository: IComicBookRepository) {}

  async execute(isbn: string, newSeriesName: string): Promise<Result<ComicBook>> {
    const bookResult = await this.repository.findByISBN(isbn);
    if (!bookResult.ok) return Result.fail(bookResult.error);
    if (!bookResult.value) return Result.fail("Livre introuvable");

    const updated = bookResult.value.withSeriesName(newSeriesName);
    const saveResult = await this.repository.update(updated);
    if (!saveResult.ok) return Result.fail(saveResult.error);

    return Result.ok(updated);
  }
}
