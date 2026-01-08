-- Add contact details to campaigns table
ALTER TABLE public.campaigns
ADD COLUMN contact_email TEXT,
ADD COLUMN contact_phone TEXT;

-- Update the secure view function to include these new fields
DROP FUNCTION IF EXISTS public.get_campaign_for_order(text);

CREATE OR REPLACE FUNCTION public.get_campaign_for_order(campaign_code text)
 RETURNS TABLE(
   id uuid,
   company_name text,
   logo_url text,
   status text,
   contact_person text,
   company_address text,
   company_postcode text,
   contact_email text,
   contact_phone text
 )
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    id,
    company_name,
    logo_url,
    status::TEXT,
    contact_person,
    company_address,
    company_postcode,
    contact_email,
    contact_phone
  FROM campaigns
  WHERE unique_code = campaign_code
    AND status = 'active'::campaign_status
  LIMIT 1;
$function$;

-- Ensure permissions remain correct
GRANT EXECUTE ON FUNCTION public.get_campaign_for_order(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_campaign_for_order(TEXT) TO authenticated;
