import { ComicBookCreateInput } from "@domain/entities/ComicBook";
import { IBookLookupService } from "@domain/services/IBookLookupService";
import { Result } from "@domain/shared/Result";
import { OpenLibraryBookSchema } from "./schemas";

const OPEN_LIBRARY_API = "https://openlibrary.org/api/books";

export class OpenLibraryService implements IBookLookupService {
  async lookupByISBN(isbn: string): Promise<Result<ComicBookCreateInput>> {
    try {
      const bibKey = `ISBN:${isbn}`;
      const url = `${OPEN_LIBRARY_API}?bibkeys=${bibKey}&format=json&jscmd=data`;
      const response = await fetch(url);

      if (!response.ok) {
        return Result.fail(`Open Library API erreur HTTP ${response.status}`);
      }

      const raw: unknown = await response.json();
      const parsed = OpenLibraryBookSchema.safeParse(raw);

      if (!parsed.success) {
        return Result.fail(`Réponse Open Library invalide : ${parsed.error.message}`);
      }

      const data = parsed.data;
      const entry = data[bibKey];

      if (!entry) {
        return Result.fail("Aucun résultat Open Library pour cet ISBN");
      }

      return Result.ok({
        isbn,
        title: entry.title,
        authors: entry.authors.map((a) => a.name),
        publisher: entry.publishers[0]?.name ?? "Inconnu",
        publishedDate: entry.publish_date,
        coverUrl: entry.cover?.large ?? entry.cover?.medium ?? null,
        retailPrice: null,
      });
    } catch {
      return Result.fail("Impossible de contacter Open Library API");
    }
  }
}
