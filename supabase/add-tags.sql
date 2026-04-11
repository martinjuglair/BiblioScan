-- Add tags support to comic_books
ALTER TABLE comic_books ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Index for faster tag-based queries
CREATE INDEX IF NOT EXISTS idx_comic_books_tags ON comic_books USING GIN (tags);
