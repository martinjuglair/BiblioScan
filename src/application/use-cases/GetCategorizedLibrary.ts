import { ComicBook } from "@domain/entities/ComicBook";
import { Category } from "@domain/entities/Category";
import { IComicBookRepository } from "@domain/repositories/IComicBookRepository";
import { ICategoryRepository } from "@domain/repositories/ICategoryRepository";
import { Result } from "@domain/shared/Result";

export interface CategoryWithBooks {
  category: Category;
  books: ComicBook[];
}

export interface CategorizedLibrary {
  categories: CategoryWithBooks[];
  uncategorized: ComicBook[];
}

export class GetCategorizedLibrary {
  constructor(
    private readonly bookRepo: IComicBookRepository,
    private readonly categoryRepo: ICategoryRepository,
  ) {}

  async execute(): Promise<Result<CategorizedLibrary>> {
    const [booksResult, catsResult] = await Promise.all([
      this.bookRepo.findAll(),
      this.categoryRepo.findAllByUser(),
    ]);

    if (!booksResult.ok) return Result.fail(booksResult.error);
    if (!catsResult.ok) return Result.fail(catsResult.error);

    const books = booksResult.value;
    const categories = catsResult.value;

    const booksByCategory = new Map<string, ComicBook[]>();
    const uncategorized: ComicBook[] = [];

    for (const book of books) {
      if (book.categoryId) {
        const list = booksByCategory.get(book.categoryId) ?? [];
        list.push(book);
        booksByCategory.set(book.categoryId, list);
      } else {
        uncategorized.push(book);
      }
    }

    const categoriesWithBooks: CategoryWithBooks[] = categories.map((cat) => ({
      category: cat,
      books: (booksByCategory.get(cat.id) ?? []).sort((a, b) =>
        a.title.localeCompare(b.title, "fr"),
      ),
    }));

    uncategorized.sort((a, b) => a.title.localeCompare(b.title, "fr"));

    return Result.ok({
      categories: categoriesWithBooks,
      uncategorized,
    });
  }
}
