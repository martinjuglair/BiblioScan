/** Recommendation row for a single author the user has at least 2 books from */
export interface AuthorRecommendation {
  authorName: string;
  bookCount: number;
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
