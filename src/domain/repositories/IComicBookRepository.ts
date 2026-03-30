import { ComicBook } from "../entities/ComicBook";
import { Result } from "../shared/Result";

export interface IComicBookRepository {
  save(book: ComicBook): Promise<Result<void>>;
  findByISBN(isbn: string): Promise<Result<ComicBook | null>>;
  findByTitle(title: string): Promise<Result<ComicBook | null>>;
  findAll(): Promise<Result<ComicBook[]>>;
  update(book: ComicBook): Promise<Result<void>>;
  delete(isbn: string): Promise<Result<void>>;
}
