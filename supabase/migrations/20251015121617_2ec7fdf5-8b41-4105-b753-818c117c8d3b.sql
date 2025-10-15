-- Create a secure view that exposes only the minimum campaign data needed for public order flow
-- This prevents exposure of sensitive business data while allowing the order page to function

-- Create a function that checks if a campaign code is valid and active
-- Returns only the essential display fields, no sensitive contact or address data
CREATE OR REPLACE FUNCTION public.get_campaign_for_order(campaign_code TEXT)
RETURNS TABLE (
  id UUID,
  company_name TEXT,
  logo_url TEXT,
  status TEXT
) 
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id,
    company_name,
    logo_url,
    status::TEXT
  FROM campaigns
  WHERE unique_code = campaign_code
    AND status = 'active'::campaign_status
  LIMIT 1;
$$;

-- Grant execute permission to anonymous users
GRANT EXECUTE ON FUNCTION public.get_campaign_for_order(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_campaign_for_order(TEXT) TO authenticated;