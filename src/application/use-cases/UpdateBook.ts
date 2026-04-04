import { ComicBook } from "@domain/entities/ComicBook";
import { IComicBookRepository } from "@domain/repositories/IComicBookRepository";
import { Price } from "@domain/value-objects/Price";
import { Result } from "@domain/shared/Result";

export interface UpdateBookInput {
  seriesName?: string;
  volumeNumber?: number | null;
  retailPriceAmount?: number | null;
  coverUrl?: string | null;
  rating?: number | null;
  comment?: string | null;
}

export class UpdateBook {
  constructor(private readonly repository: IComicBookRepository) {}

  async execute(isbn: string, input: UpdateBookInput): Promise<Result<ComicBook>> {
    const bookResult = await this.repository.findByISBN(isbn);
    if (!bookResult.ok) return Result.fail(bookResult.error);
    if (!bookResult.value) return Result.fail("Livre introuvable");

    let retailPrice: Price | null | undefined = undefined;
    if (input.retailPriceAmount !== undefined) {
      if (input.retailPriceAmount === null || input.retailPriceAmount <= 0) {
        retailPrice = null;
      } else {
        const priceResult = Price.create(input.retailPriceAmount);
        if (!priceResult.ok) return Result.fail(priceResult.error);
        retailPrice = priceResult.value;
      }
    }

    const updated = bookResult.value.withUpdates({
      seriesName: input.seriesName,
      volumeNumber: input.volumeNumber,
      retailPrice,
      coverUrl: input.coverUrl,
      rating: input.rating,
      comment: input.comment,
    });

    const saveResult = await this.repository.update(updated);
    if (!saveResult.ok) return Result.fail(saveResult.error);

    return Result.ok(updated);
  }
}
