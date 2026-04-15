/** Recommendation row for a single author the user has read */
export interface AuthorRecommendation {
  authorName: string;
  readCount: number;
  suggestions: AuthorSuggestedBook[];
}

/** A book by a known author that the user doesn't own yet */
export interface AuthorSuggestedBook {
  title: string;
  authors: string[];
  publisher: string;
  coverUrl: string | null;
  isbn: string | null;
  averageRating?: number;
}
