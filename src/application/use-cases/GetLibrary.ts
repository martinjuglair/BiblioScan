import { Series } from "@domain/entities/Series";
import { IComicBookRepository } from "@domain/repositories/IComicBookRepository";
import { Result } from "@domain/shared/Result";

export class GetLibrary {
  constructor(private readonly repository: IComicBookRepository) {}

  async execute(): Promise<Result<Series[]>> {
    const booksResult = await this.repository.findAll();
    if (!booksResult.ok) return booksResult;
    return Result.ok(Series.groupFromBooks(booksResult.value));
  }
}
