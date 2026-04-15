import { Result } from "../shared/Result";
import { SuggestedVolume } from "../entities/SeriesRecommendation";

export interface ISeriesSearchService {
  /** Search for a specific volume number in a named series */
  searchSeriesVolume(
    seriesName: string,
    volumeNumber: number,
  ): Promise<Result<SuggestedVolume | null>>;

  /** Search for other books in a series by prefix (for unnumbered series like Harry Potter) */
  searchOtherBooksInSeries(
    seriesPrefix: string,
    ownedIsbns: string[],
    ownedTitles: string[],
  ): Promise<Result<SuggestedVolume[]>>;
}
