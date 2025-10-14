-- Add logo_url column to campaigns table
ALTER TABLE campaigns ADD COLUMN logo_url text;

-- Create a storage bucket for campaign logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('campaign-logos', 'campaign-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public to view logos
CREATE POLICY "Public can view campaign logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'campaign-logos');

-- Allow admins to upload logos
CREATE POLICY "Admins can upload campaign logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'campaign-logos' AND
  has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to update logos
CREATE POLICY "Admins can update campaign logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'campaign-logos' AND
  has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to delete logos
CREATE POLICY "Admins can delete campaign logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'campaign-logos' AND
  has_role(auth.uid(), 'admin'::app_role)
);