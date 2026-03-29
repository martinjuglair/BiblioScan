import { IndexedDBComicBookRepository } from "./repositories/IndexedDBComicBookRepository";
import { GoogleBooksService } from "./services/GoogleBooksService";
import { OpenLibraryService } from "./services/OpenLibraryService";
import { BookLookupFacade } from "./services/BookLookupFacade";
import { BnfSearchService } from "./services/BnfSearchService";
import { ScanComicBook } from "@application/use-cases/ScanComicBook";
import { GetLibrary } from "@application/use-cases/GetLibrary";
import { UpdateBookSeries } from "@application/use-cases/UpdateBookSeries";
import { DeleteBook } from "@application/use-cases/DeleteBook";

// Singletons
const repository = new IndexedDBComicBookRepository();
const googleBooks = new GoogleBooksService();
const openLibrary = new OpenLibraryService();
const lookupFacade = new BookLookupFacade(googleBooks, openLibrary);

// Use cases
export const scanComicBook = new ScanComicBook(lookupFacade, repository);
export const getLibrary = new GetLibrary(repository);
export const updateBookSeries = new UpdateBookSeries(repository);
export const deleteBook = new DeleteBook(repository);

// Search service (for old books without ISBN)
export const bnfSearchService = new BnfSearchService();
