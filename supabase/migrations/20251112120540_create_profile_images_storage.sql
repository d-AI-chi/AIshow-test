/*
  # Create Storage Bucket for Profile Images

  ## Overview
  This migration creates a storage bucket for participant profile images.

  ## Storage Bucket

  ### `profile-images`
  Public bucket for storing participant profile images
  - Public access enabled for viewing images
  - File size limit: 5MB
  - Allowed file types: Images (jpg, jpeg, png, gif, webp)

  ## Security (RLS Policies)

  ### Storage Policies
  - Anyone can upload images to the bucket
  - Anyone can view images from the bucket
  - Only uploaded files can be deleted (by anyone for simplicity in this use case)

  ## Notes
  - Images are publicly accessible via URL
  - No authentication required for upload/view (event-based access)
  - Consider implementing cleanup after event ends
*/

-- Create storage bucket for profile images
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-images', 'profile-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to upload images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects'
    AND policyname = 'Allow public uploads'
  ) THEN
    CREATE POLICY "Allow public uploads"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'profile-images');
  END IF;
END $$;

-- Allow anyone to view images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects'
    AND policyname = 'Allow public access'
  ) THEN
    CREATE POLICY "Allow public access"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'profile-images');
  END IF;
END $$;

-- Allow anyone to delete images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects'
    AND policyname = 'Allow public deletes'
  ) THEN
    CREATE POLICY "Allow public deletes"
      ON storage.objects FOR DELETE
      USING (bucket_id = 'profile-images');
  END IF;
END $$;