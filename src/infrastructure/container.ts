import { SupabaseComicBookRepository } from "./repositories/SupabaseComicBookRepository";
import { SupabaseCategoryRepository } from "./repositories/SupabaseCategoryRepository";
import { GoogleBooksService } from "./services/GoogleBooksService";
import { GoogleBooksCacheService } from "./services/GoogleBooksCacheService";
import { OpenLibraryService } from "./services/OpenLibraryService";
import { BookLookupFacade } from "./services/BookLookupFacade";
import { BnfSearchService } from "./services/BnfSearchService";
import { UnifiedSearchService } from "./services/UnifiedSearchService";
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
const booksCache = new GoogleBooksCacheService();
const googleBooks = new GoogleBooksService(booksCache);
const openLibrary = new OpenLibraryService();
const lookupFacade = new BookLookupFacade(googleBooks, openLibrary, googleBooks);

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
export const unifiedSearch = new UnifiedSearchService(googleBooks, bnfSearchService, lookupFacade);

import { GoogleBooksSeriesSearchService } from "./services/GoogleBooksSeriesSearchService";
import { GetSeriesRecommendations } from "@application/use-cases/GetSeriesRecommendations";

const seriesSearchService = new GoogleBooksSeriesSearchService(googleBooks);
export const getSeriesRecommendations = new GetSeriesRecommendations(repository, seriesSearchService);

import { GetAuthorRecommendations } from "@application/use-cases/GetAuthorRecommendations";
export const getAuthorRecommendations = new GetAuthorRecommendations(repository, googleBooks);

import { GetPopularBooks } from "@application/use-cases/GetPopularBooks";
export const getPopularBooks = new GetPopularBooks(repository, googleBooks);

import { GcdService } from "./services/GcdService";
export const gcdService = new GcdService();

import { SupabaseReadingGroupRepository } from "./repositories/SupabaseReadingGroupRepository";
export const readingGroupRepository = new SupabaseReadingGroupRepository();

import { SupabaseFriendshipRepository } from "./repositories/SupabaseFriendshipRepository";
export const friendshipRepository = new SupabaseFriendshipRepository();

// Expose category repository for BookDetail dropdown
export { categoryRepository };
