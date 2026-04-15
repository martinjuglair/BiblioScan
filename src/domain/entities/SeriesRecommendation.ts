/** A series from the user's collection with suggestions to complete it */
export interface SeriesRecommendation {
  seriesName: string;
  ownedCount: number;
  highestOwned: number;
  missingGaps: number[];
  nextVolumes: SuggestedVolume[];
  coverUrl: string | null;
}

/** A single volume suggestion — either filling a gap, continuing, or same series */
export interface SuggestedVolume {
  volumeNumber: number | null;
  title: string;
  authors: string[];
  publisher: string;
  coverUrl: string | null;
  isbn: string | null;
  source: "gap" | "next" | "same-series";
  averageRating?: number;
}
