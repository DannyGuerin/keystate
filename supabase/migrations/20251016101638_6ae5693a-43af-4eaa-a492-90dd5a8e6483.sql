-- Fix keyring variants visibility for public by avoiding RLS dependency on campaigns SELECT
-- 1) Create a SECURITY DEFINER helper to check if a campaign is active
CREATE OR REPLACE FUNCTION public.campaign_is_active(_campaign_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.campaigns
    WHERE id = _campaign_id AND status = 'active'::campaign_status
  );
$$;

-- 2) Replace the SELECT policy on keyring_variants to use the helper
DROP POLICY IF EXISTS "Public can view active campaign variants" ON public.keyring_variants;

CREATE POLICY "Public can view active campaign variants"
ON public.keyring_variants
FOR SELECT
USING (public.campaign_is_active(campaign_id));