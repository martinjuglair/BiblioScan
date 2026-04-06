-- Add is_read column to comic_books
-- Run this in Supabase SQL Editor

ALTER TABLE comic_books ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT false;
