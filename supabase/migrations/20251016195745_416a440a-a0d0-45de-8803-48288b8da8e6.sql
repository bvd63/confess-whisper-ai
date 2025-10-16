-- Create storage bucket for confession images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'confession-images',
  'confession-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
);

-- Storage policies for confession images
CREATE POLICY "Anyone can view confession images"
ON storage.objects FOR SELECT
USING (bucket_id = 'confession-images');

CREATE POLICY "Authenticated users can upload confession images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'confession-images' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete their own confession images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'confession-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);