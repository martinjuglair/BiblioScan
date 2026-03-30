import { supabase } from "@infrastructure/supabase/client";
import { ComicBook } from "@domain/entities/ComicBook";
import { IComicBookRepository } from "@domain/repositories/IComicBookRepository";
import { ISBN } from "@domain/value-objects/ISBN";
import { Price } from "@domain/value-objects/Price";
import { Result } from "@domain/shared/Result";

/** Row shape in Supabase `comic_books` table */
interface ComicBookRow {
  isbn: string;
  user_id: string;
  title: string;
  authors: string[];
  publisher: string;
  published_date: string;
  cover_url: string | null;
  retail_price_amount: number | null;
  retail_price_currency: string | null;
  series_name: string;
  volume_number: number | null;
  added_at: string;
}

function rowToEntity(row: ComicBookRow): ComicBook {
  const isbnResult = ISBN.create(row.isbn);
  if (!isbnResult.ok) throw new Error(`ISBN corrompu en base: ${row.isbn}`);

  let retailPrice: Price | null = null;
  if (row.retail_price_amount !== null) {
    const r = Price.create(row.retail_price_amount, row.retail_price_currency ?? "EUR");
    if (r.ok) retailPrice = r.value;
  }

  return ComicBook.fromPersistence({
    isbn: isbnResult.value,
    title: row.title,
    authors: row.authors ?? [],
    publisher: row.publisher,
    publishedDate: row.published_date,
    coverUrl: row.cover_url,
    retailPrice,
    seriesName: row.series_name,
    volumeNumber: row.volume_number,
    addedAt: new Date(row.added_at),
  });
}

async function getUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Utilisateur non connecté");
  return data.user.id;
}

function entityToRow(book: ComicBook, userId: string): ComicBookRow {
  const persistence = book.toPersistence();
  return {
    isbn: persistence.isbn,
    user_id: userId,
    title: persistence.title,
    authors: persistence.authors,
    publisher: persistence.publisher,
    published_date: persistence.publishedDate,
    cover_url: persistence.coverUrl,
    retail_price_amount: persistence.retailPrice?.amount ?? null,
    retail_price_currency: persistence.retailPrice?.currency ?? null,
    series_name: persistence.seriesName,
    volume_number: persistence.volumeNumber,
    added_at: persistence.addedAt,
  };
}

export class SupabaseComicBookRepository implements IComicBookRepository {
  async save(book: ComicBook): Promise<Result<void>> {
    try {
      const userId = await getUserId();
      const row = entityToRow(book, userId);

      const { error } = await supabase.from("comic_books").upsert(row, {
        onConflict: "user_id,isbn",
      });

      if (error) return Result.fail(`Erreur de sauvegarde: ${error.message}`);
      return Result.ok(undefined);
    } catch (e) {
      return Result.fail(e instanceof Error ? e.message : "Erreur lors de la sauvegarde");
    }
  }

  async findByISBN(isbn: string): Promise<Result<ComicBook | null>> {
    try {
      const userId = await getUserId();
      const { data, error } = await supabase
        .from("comic_books")
        .select("*")
        .eq("user_id", userId)
        .eq("isbn", isbn)
        .maybeSingle();

      if (error) return Result.fail(`Erreur de lecture: ${error.message}`);
      if (!data) return Result.ok(null);
      return Result.ok(rowToEntity(data as ComicBookRow));
    } catch (e) {
      return Result.fail(e instanceof Error ? e.message : "Erreur de lecture");
    }
  }

  async findByTitle(title: string): Promise<Result<ComicBook | null>> {
    try {
      const userId = await getUserId();
      const { data, error } = await supabase
        .from("comic_books")
        .select("*")
        .eq("user_id", userId)
        .ilike("title", title)
        .maybeSingle();

      if (error) return Result.fail(`Erreur de lecture: ${error.message}`);
      if (!data) return Result.ok(null);
      return Result.ok(rowToEntity(data as ComicBookRow));
    } catch (e) {
      return Result.fail(e instanceof Error ? e.message : "Erreur de lecture");
    }
  }

  async findAll(): Promise<Result<ComicBook[]>> {
    try {
      const userId = await getUserId();
      const { data, error } = await supabase
        .from("comic_books")
        .select("*")
        .eq("user_id", userId)
        .order("added_at", { ascending: false });

      if (error) return Result.fail(`Erreur de lecture: ${error.message}`);
      return Result.ok((data as ComicBookRow[]).map(rowToEntity));
    } catch (e) {
      return Result.fail(e instanceof Error ? e.message : "Erreur de lecture");
    }
  }

  async update(book: ComicBook): Promise<Result<void>> {
    return this.save(book);
  }

  async delete(isbn: string): Promise<Result<void>> {
    try {
      const userId = await getUserId();
      const { error } = await supabase
        .from("comic_books")
        .delete()
        .eq("user_id", userId)
        .eq("isbn", isbn);

      if (error) return Result.fail(`Erreur de suppression: ${error.message}`);
      return Result.ok(undefined);
    } catch (e) {
      return Result.fail(e instanceof Error ? e.message : "Erreur lors de la suppression");
    }
  }
}
