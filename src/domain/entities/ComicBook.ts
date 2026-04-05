import { ISBN } from "../value-objects/ISBN";
import { Price } from "../value-objects/Price";
import { SeriesDetector } from "../services/SeriesDetector";
import { Result } from "../shared/Result";

export interface ComicBookProps {
  isbn: ISBN;
  title: string;
  authors: string[];
  publisher: string;
  publishedDate: string;
  coverUrl: string | null;
  retailPrice: Price | null;
  seriesName: string;
  volumeNumber: number | null;
  rating: number | null;
  comment: string | null;
  categoryId: string | null;
  addedAt: Date;
}

export interface ComicBookCreateInput {
  isbn: string;
  title: string;
  authors: string[];
  publisher: string;
  publishedDate: string;
  coverUrl: string | null;
  retailPrice: { amount: number; currency?: string } | null;
  seriesNameOverride?: string;
  volumeNumberOverride?: number;
}

export class ComicBook {
  private constructor(public readonly props: ComicBookProps) {}

  get isbn(): string {
    return this.props.isbn.value;
  }
  get title(): string {
    return this.props.title;
  }
  get authors(): string[] {
    return this.props.authors;
  }
  get publisher(): string {
    return this.props.publisher;
  }
  get publishedDate(): string {
    return this.props.publishedDate;
  }
  get coverUrl(): string | null {
    return this.props.coverUrl;
  }
  get retailPrice(): Price | null {
    return this.props.retailPrice;
  }
  get seriesName(): string {
    return this.props.seriesName;
  }
  get volumeNumber(): number | null {
    return this.props.volumeNumber;
  }
  get rating(): number | null {
    return this.props.rating;
  }
  get comment(): string | null {
    return this.props.comment;
  }
  get categoryId(): string | null {
    return this.props.categoryId;
  }
  get addedAt(): Date {
    return this.props.addedAt;
  }

  static create(input: ComicBookCreateInput): Result<ComicBook> {
    const isbnResult = ISBN.create(input.isbn);
    if (!isbnResult.ok) return Result.fail(isbnResult.error);

    let retailPrice: Price | null = null;
    if (input.retailPrice) {
      const priceResult = Price.create(
        input.retailPrice.amount,
        input.retailPrice.currency,
      );
      if (!priceResult.ok) return Result.fail(priceResult.error);
      retailPrice = priceResult.value;
    }

    const detected = SeriesDetector.detect(input.title);

    return Result.ok(
      new ComicBook({
        isbn: isbnResult.value,
        title: input.title,
        authors: input.authors,
        publisher: input.publisher,
        publishedDate: input.publishedDate,
        coverUrl: input.coverUrl,
        retailPrice,
        seriesName: input.seriesNameOverride ?? detected.seriesName,
        volumeNumber: input.volumeNumberOverride ?? detected.volumeNumber,
        rating: null,
        comment: null,
        categoryId: null,
        addedAt: new Date(),
      }),
    );
  }

  /** Reconstruct from persistence (no validation needed) */
  static fromPersistence(props: ComicBookProps): ComicBook {
    return new ComicBook(props);
  }

  withSeriesName(newName: string): ComicBook {
    return new ComicBook({ ...this.props, seriesName: newName });
  }

  withUpdates(updates: {
    seriesName?: string;
    volumeNumber?: number | null;
    retailPrice?: Price | null;
    coverUrl?: string | null;
    rating?: number | null;
    comment?: string | null;
    categoryId?: string | null;
  }): ComicBook {
    return new ComicBook({
      ...this.props,
      ...(updates.seriesName !== undefined && { seriesName: updates.seriesName }),
      ...(updates.volumeNumber !== undefined && { volumeNumber: updates.volumeNumber }),
      ...(updates.retailPrice !== undefined && { retailPrice: updates.retailPrice }),
      ...(updates.coverUrl !== undefined && { coverUrl: updates.coverUrl }),
      ...(updates.rating !== undefined && { rating: updates.rating }),
      ...(updates.comment !== undefined && { comment: updates.comment }),
      ...(updates.categoryId !== undefined && { categoryId: updates.categoryId }),
    });
  }

  /** Serializable representation for IndexedDB */
  toPersistence(): ComicBookRecord {
    return {
      isbn: this.isbn,
      title: this.title,
      authors: this.authors,
      publisher: this.publisher,
      publishedDate: this.publishedDate,
      coverUrl: this.coverUrl,
      retailPrice: this.retailPrice?.toJSON() ?? null,
      seriesName: this.seriesName,
      volumeNumber: this.volumeNumber,
      rating: this.rating,
      comment: this.comment,
      categoryId: this.categoryId,
      addedAt: this.addedAt.toISOString(),
    };
  }
}

/** Plain object stored in IndexedDB */
export interface ComicBookRecord {
  isbn: string;
  title: string;
  authors: string[];
  publisher: string;
  publishedDate: string;
  coverUrl: string | null;
  retailPrice: { amount: number; currency: string } | null;
  seriesName: string;
  volumeNumber: number | null;
  rating: number | null;
  comment: string | null;
  categoryId: string | null;
  addedAt: string;
}
