import { IComicBookRepository } from "@domain/repositories/IComicBookRepository";
import { Result } from "@domain/shared/Result";

export class DeleteBook {
  constructor(private readonly repository: IComicBookRepository) {}

  async execute(isbn: string): Promise<Result<void>> {
    return this.repository.delete(isbn);
  }
}
