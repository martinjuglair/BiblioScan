-- Add read_at column to comic_books
-- Run this in Supabase SQL Editor

ALTER TABLE comic_books ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ DEFAULT NULL;

-- Backfill: set read_at = now() for books already marked as read
UPDATE comic_books SET read_at = now() WHERE is_read = true AND read_at IS NULL;
