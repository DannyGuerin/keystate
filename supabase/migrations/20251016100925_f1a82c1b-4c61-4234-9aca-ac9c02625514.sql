-- Update get_campaign_for_order to include address details
DROP FUNCTION IF EXISTS public.get_campaign_for_order(text);

CREATE OR REPLACE FUNCTION public.get_campaign_for_order(campaign_code text)
 RETURNS TABLE(id uuid, company_name text, logo_url text, status text, contact_person text, company_address text, company_postcode text)
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
    company_postcode
  FROM campaigns
  WHERE unique_code = campaign_code
    AND status = 'active'::campaign_status
  LIMIT 1;
$function$;