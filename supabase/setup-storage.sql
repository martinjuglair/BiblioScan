-- Run this in Supabase SQL Editor to set up cover photo storage

-- 1. Create the storage bucket (if not done via API)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'book-covers',
  'book-covers',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow authenticated users to upload covers
CREATE POLICY "Authenticated users can upload covers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'book-covers');

-- 3. Allow authenticated users to update/overwrite their covers
CREATE POLICY "Authenticated users can update covers"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'book-covers');

-- 4. Allow public read access to all covers
CREATE POLICY "Public read access to covers"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'book-covers');

-- 5. Allow authenticated users to delete their covers
CREATE POLICY "Authenticated users can delete covers"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'book-covers');
