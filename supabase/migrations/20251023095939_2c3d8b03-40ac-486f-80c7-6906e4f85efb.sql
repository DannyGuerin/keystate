-- Allow public (anonymous and authenticated) to view active campaigns by their unique code
CREATE POLICY "Public can view active campaigns by code"
ON public.campaigns
FOR SELECT
TO anon, authenticated
USING (status = 'active'::campaign_status AND unique_code IS NOT NULL);