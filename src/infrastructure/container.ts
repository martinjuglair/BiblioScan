import { SupabaseComicBookRepository } from "./repositories/SupabaseComicBookRepository";
import { SupabaseCategoryRepository } from "./repositories/SupabaseCategoryRepository";
import { GoogleBooksService } from "./services/GoogleBooksService";
import { OpenLibraryService } from "./services/OpenLibraryService";
import { BookLookupFacade } from "./services/BookLookupFacade";
import { BnfSearchService } from "./services/BnfSearchService";
import { AuthService } from "./auth/AuthService";
import { ScanComicBook } from "@application/use-cases/ScanComicBook";
import { GetCategorizedLibrary } from "@application/use-cases/GetCategorizedLibrary";
import { CreateCategory } from "@application/use-cases/CreateCategory";
import { DeleteCategory } from "@application/use-cases/DeleteCategory";
import { UpdateBook } from "@application/use-cases/UpdateBook";
import { DeleteBook } from "@application/use-cases/DeleteBook";

// Auth
export const authService = new AuthService();

// Singletons
const repository = new SupabaseComicBookRepository();
const categoryRepository = new SupabaseCategoryRepository();
const googleBooks = new GoogleBooksService();
const openLibrary = new OpenLibraryService();
const lookupFacade = new BookLookupFacade(googleBooks, openLibrary);

// Exposed for cover lookup and title search
export const bookLookup = lookupFacade;
export const googleBooksSearch = googleBooks;

// Use cases
export const scanComicBook = new ScanComicBook(lookupFacade, repository);
export const getCategorizedLibrary = new GetCategorizedLibrary(repository, categoryRepository);
export const createCategory = new CreateCategory(categoryRepository);
export const deleteCategory = new DeleteCategory(categoryRepository);
export const updateBook = new UpdateBook(repository);
export const deleteBook = new DeleteBook(repository);

// Search services
export const bnfSearchService = new BnfSearchService();

import { GcdService } from "./services/GcdService";
export const gcdService = new GcdService();

// Expose category repository for BookDetail dropdown
export { categoryRepository };
