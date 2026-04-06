import { openDB, IDBPDatabase } from "idb";
import { ComicBook, ComicBookRecord } from "@domain/entities/ComicBook";
import { IComicBookRepository } from "@domain/repositories/IComicBookRepository";
import { ISBN } from "@domain/value-objects/ISBN";
import { Price } from "@domain/value-objects/Price";
import { Result } from "@domain/shared/Result";

const DB_NAME = "bd-collection";
const DB_VERSION = 1;
const STORE_NAME = "comics";

function recordToEntity(record: ComicBookRecord): ComicBook {
  const isbnResult = ISBN.create(record.isbn);
  if (!isbnResult.ok) throw new Error(`ISBN corrompu en base: ${record.isbn}`);

  let retailPrice: Price | null = null;
  if (record.retailPrice) {
    const r = Price.create(record.retailPrice.amount, record.retailPrice.currency);
    if (r.ok) retailPrice = r.value;
  }

  return ComicBook.fromPersistence({
    isbn: isbnResult.value,
    title: record.title,
    authors: record.authors,
    publisher: record.publisher,
    publishedDate: record.publishedDate,
    coverUrl: record.coverUrl,
    retailPrice,
    seriesName: record.seriesName,
    volumeNumber: record.volumeNumber,
    rating: record.rating ?? null,
    comment: record.comment ?? null,
    categoryId: record.categoryId ?? null,
    wishlist: record.wishlist ?? false,
    addedAt: new Date(record.addedAt),
  });
}

export class IndexedDBComicBookRepository implements IComicBookRepository {
  private dbPromise: Promise<IDBPDatabase>;

  constructor() {
    this.dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "isbn" });
          store.createIndex("seriesName", "seriesName", { unique: false });
        }
      },
    });
  }

  async save(book: ComicBook): Promise<Result<void>> {
    try {
      const db = await this.dbPromise;
      await db.put(STORE_NAME, book.toPersistence());
      return Result.ok(undefined);
    } catch {
      return Result.fail("Erreur lors de la sauvegarde en base");
    }
  }

  async findByISBN(isbn: string): Promise<Result<ComicBook | null>> {
    try {
      const db = await this.dbPromise;
      const record: ComicBookRecord | undefined = await db.get(STORE_NAME, isbn);
      if (!record) return Result.ok(null);
      return Result.ok(recordToEntity(record));
    } catch {
      return Result.fail("Erreur de lecture en base");
    }
  }

  async findByTitle(title: string): Promise<Result<ComicBook | null>> {
    try {
      const db = await this.dbPromise;
      const records: ComicBookRecord[] = await db.getAll(STORE_NAME);
      const match = records.find(
        (r) => r.title.toLowerCase() === title.toLowerCase(),
      );
      if (!match) return Result.ok(null);
      return Result.ok(recordToEntity(match));
    } catch {
      return Result.fail("Erreur de lecture en base");
    }
  }

  async findAll(): Promise<Result<ComicBook[]>> {
    try {
      const db = await this.dbPromise;
      const records: ComicBookRecord[] = await db.getAll(STORE_NAME);
      return Result.ok(records.map(recordToEntity));
    } catch {
      return Result.fail("Erreur de lecture en base");
    }
  }

  async update(book: ComicBook): Promise<Result<void>> {
    return this.save(book);
  }

  async delete(isbn: string): Promise<Result<void>> {
    try {
      const db = await this.dbPromise;
      await db.delete(STORE_NAME, isbn);
      return Result.ok(undefined);
    } catch {
      return Result.fail("Erreur lors de la suppression");
    }
  }
}
