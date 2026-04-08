-- Add emoji column to categories table
ALTER TABLE categories ADD COLUMN IF NOT EXISTS emoji TEXT DEFAULT NULL;
