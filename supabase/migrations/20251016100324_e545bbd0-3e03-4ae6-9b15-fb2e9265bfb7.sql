-- Drop and recreate get_campaign_for_order function to include contact_person
DROP FUNCTION IF EXISTS public.get_campaign_for_order(text);

CREATE OR REPLACE FUNCTION public.get_campaign_for_order(campaign_code text)
 RETURNS TABLE(id uuid, company_name text, logo_url text, status text, contact_person text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    id,
    company_name,
    logo_url,
    status::TEXT,
    contact_person
  FROM campaigns
  WHERE unique_code = campaign_code
    AND status = 'active'::campaign_status
  LIMIT 1;
$function$;