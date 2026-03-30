import { SupabaseComicBookRepository } from "./repositories/SupabaseComicBookRepository";
import { GoogleBooksService } from "./services/GoogleBooksService";
import { OpenLibraryService } from "./services/OpenLibraryService";
import { BookLookupFacade } from "./services/BookLookupFacade";
import { BnfSearchService } from "./services/BnfSearchService";
import { AuthService } from "./auth/AuthService";
import { ScanComicBook } from "@application/use-cases/ScanComicBook";
import { GetLibrary } from "@application/use-cases/GetLibrary";
import { UpdateBookSeries } from "@application/use-cases/UpdateBookSeries";
import { UpdateBook } from "@application/use-cases/UpdateBook";
import { DeleteBook } from "@application/use-cases/DeleteBook";

// Auth
export const authService = new AuthService();

// Singletons
const repository = new SupabaseComicBookRepository();
const googleBooks = new GoogleBooksService();
const openLibrary = new OpenLibraryService();
const lookupFacade = new BookLookupFacade(googleBooks, openLibrary);

// Exposed for cover lookup from title search
export const bookLookup = lookupFacade;

// Use cases
export const scanComicBook = new ScanComicBook(lookupFacade, repository);
export const getLibrary = new GetLibrary(repository);
export const updateBookSeries = new UpdateBookSeries(repository);
export const updateBook = new UpdateBook(repository);
export const deleteBook = new DeleteBook(repository);

// Search services
export const bnfSearchService = new BnfSearchService();

import { GcdService } from "./services/GcdService";
export const gcdService = new GcdService();
