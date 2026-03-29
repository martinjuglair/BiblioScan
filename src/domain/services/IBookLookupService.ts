import { ComicBookCreateInput } from "../entities/ComicBook";
import { Result } from "../shared/Result";

export interface IBookLookupService {
  lookupByISBN(isbn: string): Promise<Result<ComicBookCreateInput>>;
}
