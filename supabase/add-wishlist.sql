-- Add wishlist column to comic_books table
ALTER TABLE comic_books ADD COLUMN IF NOT EXISTS wishlist BOOLEAN DEFAULT false NOT NULL;
