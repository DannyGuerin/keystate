-- Allow public to view active campaigns
CREATE POLICY "Public can view active campaigns"
ON public.campaigns
FOR SELECT
TO anon, authenticated
USING (status = 'active');